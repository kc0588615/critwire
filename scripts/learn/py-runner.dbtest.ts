// learn:check's Python session ownership (plan L4 §3, §4.4(b), §4.6; D17), on critwire_dev as critwire_lab, under the
// lab lock (takeLabLock). A Python block's sessions carry the run's PGAPPNAME, and their pids are unknown, so cleanup
// finds them by name. Failure modes first:
// PYC7: pg_stat_activity spans the cluster and the lock only this database, so a match on the role and the name alone
//       ends another database's run, or a match on the prefix another run's → this run's name in another database and
//       another run's name in this one survive cleanup and the (b) query; this run's in this database is ended, named.
// PYC8: an earlier run's straggler (its parent SIGKILLed, the group alive) runs beside a new run, or is killed though
//       nothing proves it's this run's → a lab-role session in this database with another run's name refuses the run
//       before any block, naming its pid and the command to end it; the lock is free afterwards and the session alive.
import assert from "node:assert/strict";
import { join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath } from "node:url";
import { loadEnv, requireEnv } from "../env.ts";
import { testDatabase, withScratchDatabase } from "../test-db.ts";
import { CANARY_SCHEMA, checkLab } from "./check.ts";
import { endRunSessions, takeLabLock } from "./cleanup.ts";
import { LAB_LOCK, libpqTarget, pgConnect, urlTarget, type PgTarget } from "./pg.ts";
import { pythonApp } from "./python.ts";

const dist = join(fileURLToPath(new URL("../..", import.meta.url)), "dist");
loadEnv();
const labTarget = () => urlTarget(requireEnv("LEARN_PG_URL"), "LEARN_PG_URL");
const admin = pgConnect(libpqTarget({ PGDATABASE: testDatabase }));
after(() => admin.end());

// An idle lab-role session in `target`'s database named `app`, and its pid.
async function idle(target: PgTarget, app: string): Promise<{ sql: ReturnType<typeof pgConnect>; pid: number }> {
  const sql = pgConnect(target, { connection: { application_name: app } });
  const [{ pid }] = await sql<{ pid: number }[]>`select pg_backend_pid() as pid`;
  return { sql, pid };
}

const alive = async (pid: number) => (await admin`select from pg_stat_activity where pid = ${pid}`).length === 1;

async function assertLockFree() {
  const [{ locked }] = await admin<{ locked: boolean }[]>`select pg_try_advisory_lock(hashtext(${LAB_LOCK})) as locked`;
  if (locked) await admin`select pg_advisory_unlock(hashtext(${LAB_LOCK}))`;
  assert.equal(locked, true, "the lab lock is free");
}

test("PYC7 cleanup and the (b) query end only this run's sessions in this database, and name them", async () => {
  await withScratchDatabase([], async (scratch) => {
    const app = pythonApp();
    const lock = await takeLabLock(labTarget(), testDatabase, { app });
    const opened: ReturnType<typeof pgConnect>[] = [];
    const open = async (target: PgTarget, name: string) => {
      const s = await idle(target, name);
      opened.push(s.sql);
      return s.pid;
    };
    try {
      const elsewhere = await open({ ...labTarget(), database: scratch.database }, app);
      const otherRun = await open(labTarget(), pythonApp());
      const ours = await open(labTarget(), app);
      const lab = pgConnect(labTarget());
      try {
        assert.deepEqual(await endRunSessions(lab, app), { ended: [ours], problems: [] });
      } finally {
        await lab.end();
      }
      assert.deepEqual([await alive(elsewhere), await alive(otherRun), await alive(ours)], [true, true, false]);
      const oursAgain = await open(labTarget(), app);
      const logged: string[] = [];
      const log = console.log;
      console.log = (line: string) => void logged.push(line);
      try {
        await lock.release();
      } finally {
        console.log = log;
      }
      assert.deepEqual(logged, [`learn:check: cleanup: ended the run's Python session(s): ${oursAgain}`]);
      assert.deepEqual([await alive(elsewhere), await alive(otherRun), await alive(oursAgain)], [true, true, false]);
      await assertLockFree();
    } finally {
      for (const sql of opened) await sql.end({ timeout: 0 });
    }
  });
});

test("PYC8 an earlier run's session in this database refuses the run before any block, naming its pid; the lock is free", async () => {
  const name = pythonApp();
  const straggler = await idle(labTarget(), name);
  try {
    await assert.rejects(checkLab(labTarget(), { dist, canarySchema: CANARY_SCHEMA }), (e: Error) => {
      assert.equal(e.message, `session ${straggler.pid} (${name}) on ${testDatabase} is an earlier learn:check run's Python `
        + `session: if no learn:check runs, end it with psql -d ${testDatabase} -c 'select pg_terminate_backend(${straggler.pid})'`);
      return true;
    });
    assert.ok(await alive(straggler.pid), "never ended");
    await assertLockFree();
  } finally {
    await straggler.sql.end({ timeout: 0 });
  }
});
