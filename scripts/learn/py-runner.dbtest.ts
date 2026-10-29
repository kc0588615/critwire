// learn:check's Python session ownership (plan L4 §3, §4.4(b), §4.6; D17), on critwire_dev as critwire_lab, under the
// lab lock (takeLabLock). A Python block's sessions carry the run's PGAPPNAME, and their pids are unknown, so cleanup
// finds them by name. Failure modes first:
// PYC7: pg_stat_activity spans the cluster and the lock only this database, so a match on the role and the name alone
//       ends another database's run, or a match on the prefix another run's → this run's name in another database and
//       another run's name in this one survive cleanup and the (b) query; this run's in this database is ended, named.
// PYC8: an earlier run's straggler (its parent SIGKILLed, the group alive) runs beside a new run, or is killed though
//       nothing proves it's this run's → a lab-role session in this database with another run's name refuses the run
//       before any block, naming its pid and the command to end it; the lock is free afterwards and the session alive.
// The Python blocks stage (plan L4 §4.4, SC7), runPythonBlocks under the lab lock, as the stage runs them:
// PYC1: a block commits a learn_ object and exits 0, and it stays → "committed schema …; the runner dropped it", gone.
// PYC2: the same, then a raise → the same, plus the exit failure quoting stderr's tail.
// PYC3: a block commits a table into learn_curriculum, so later blocks read a changed lab → the stage stops there,
//       naming the table; the next block never runs.
// PYC4: a block starts a background process holding an open transaction, then overruns `# timeout:` → it times out,
//       no process left (pgrep), no session with the run's name, no temp folder, and the next block runs.
// PYC5: an abort during a Python block (checkLab, SIGINT) leaves its process group, temp folder, session, committed
//       learn_ schema or the lock → the run rejects with the reason, and none of them is left.
// PYC9: a block's child escapes the group (setsid) and keeps a session → after 10 s check (b) ends it and names it.
// PY7/PY8: a failing or timed-out block stops the stage → both reported, and the next block ran.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadEnv, requireEnv } from "../env.ts";
import { testDatabase, withScratchDatabase } from "../test-db.ts";
import { parseBlock, type Block } from "./blocks.ts";
import { CANARY_SCHEMA, checkLab, readTables } from "./check.ts";
import { endRunSessions, takeLabLock } from "./cleanup.ts";
import type { CoursePage } from "./course.ts";
import { learnObjects } from "./leaks.ts";
import { LAB_LOCK, LAB_SCHEMA, libpqTarget, pgConnect, urlTarget, type PgTarget } from "./pg.ts";
import { runPythonBlocks, type PyStageOptions } from "./py-runner.ts";
import type { BlockRuns } from "./record.ts";
import { PY_APP_PREFIX, pythonApp } from "./python.ts";

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

const pyBlock = (id: string, headers: string[], ...code: string[]): Block => {
  const { block, errors } = parseBlock(`site/learn/sql/${id}.py`, [`# q: ${id}`, "# status: ran", ...headers, ...code, ""].join("\n"));
  assert.deepEqual(errors, [], id);
  return block!;
};
const course = (...blocks: Block[]): CoursePage[] => [{ page: { id: "t", file: "", html: "" }, slots: [], blocks }];
const fresh = (prefix: string) => `learn_t_${prefix}_${randomBytes(4).toString("hex")}`;
const adminTarget = libpqTarget({ PGDATABASE: testDatabase });
const pyTemps = () => new Set(readdirSync(tmpdir()).filter((f) => f.startsWith("critwire-learn-py-")));
const runSessions = async (prefix = PY_APP_PREFIX) => (await admin<{ n: number }[]>`select count(*)::int as n from pg_stat_activity
  where usename = 'critwire_lab' and starts_with(application_name, ${prefix})`)[0]!.n;
// pids of processes whose command line holds `marker` (pgrep -f; none: []).
const processes = (marker: string): string[] => {
  try {
    return execFileSync("pgrep", ["-f", marker], { encoding: "utf8" }).trim().split("\n");
  } catch {
    return [];
  }
};

// The Python stage over `blocks` (one page) under the lab lock, as checkLab runs it; the lock is freed after.
async function stage(blocks: Block[], over: Partial<PyStageOptions> = {}): Promise<BlockRuns[]> {
  const app = pythonApp();
  const lock = await takeLabLock(labTarget(), testDatabase, { app });
  const sql = pgConnect(labTarget());
  const mplConfig = mkdtempSync(join(tmpdir(), "critwire-mpl-"));
  try {
    return await runPythonBlocks(blocks, course(...blocks), {
      lab: labTarget(), sql, database: testDatabase, readLab: () => readTables(adminTarget, LAB_SCHEMA), app,
      known: new Set(lock.known), learnBase: pathToFileURL(dist).href, mplConfig, update: false, log: () => {}, ...over,
    });
  } finally {
    await sql.end();
    await lock.release();
    rmSync(mplConfig, { recursive: true, force: true });
  }
}

const commits = (schema: string) => [
  "import psycopg",
  "with psycopg.connect() as conn:",
  `    conn.execute("CREATE SCHEMA ${schema}")`,
];

test("PYC1 a block that commits a learn_ schema and exits 0 fails; the runner dropped it", async () => {
  const schema = fresh("pyc1");
  const [run] = await stage([pyBlock("pyc1", [], ...commits(schema), "print('done')")]);
  assert.deepEqual(run!.first.failures, [`q pyc1: committed schema ${schema}; the runner dropped it`]);
  assert.ok(!(await learnObjects(admin)).includes(`schema ${schema}`));
});

test("PYC2 a block that commits a learn_ schema and then raises: both failures, the schema gone", async () => {
  const schema = fresh("pyc2");
  const [run] = await stage([pyBlock("pyc2", [], ...commits(schema), "raise SystemExit('pyc2 broke')")]);
  assert.equal(run!.first.failures.length, 2);
  assert.match(run!.first.failures[0]!, /^q pyc2: python exited with code 1; stderr ends:\npyc2 broke$/);
  assert.equal(run!.first.failures[1], `q pyc2: committed schema ${schema}; the runner dropped it`);
  assert.equal(run!.first.rendered, undefined);
  assert.ok(!(await learnObjects(admin)).includes(`schema ${schema}`));
});

test("PYC3 a block that commits a table into learn_curriculum stops the stage, naming it; the next block never runs", async () => {
  const table = `pyc3_${randomBytes(4).toString("hex")}`;
  const marker = fresh("pyc3");
  try {
    await assert.rejects(stage([
      pyBlock("pyc3", [], "import psycopg", "with psycopg.connect() as conn:", `    conn.execute("CREATE TABLE ${LAB_SCHEMA}.${table} (x int)")`),
      pyBlock("pyc3-next", [], ...commits(marker)),
    ]), (e: Error) => {
      assert.match(e.message, new RegExp(`^q pyc3: changed ${LAB_SCHEMA}, so the blocks after it would read another lab; the run stops here:\n  ${LAB_SCHEMA}\\.${table}: added\n  ${LAB_SCHEMA}: table list changed`));
      return true;
    });
    assert.ok(!(await learnObjects(admin)).includes(`schema ${marker}`), "pyc3-next didn't run");
  } finally {
    await admin.unsafe(`DROP TABLE IF EXISTS ${LAB_SCHEMA}.${table}`);
  }
});

test("PYC4 a block holding a background transaction past its timeout: killed, no session, no temp folder; the next block runs", async () => {
  const marker = `pyc4-${randomBytes(4).toString("hex")}`;
  const temps = pyTemps();
  const child = `import psycopg, sys, time  # ${marker}\nc = psycopg.connect()\nc.execute('SELECT 1')\nprint('ready', flush=True)\ntime.sleep(60)`;
  let seen = false;
  const watching = (async () => {
    for (let i = 0; i < 100 && !seen; i++) {
      seen = (await runSessions()) > 0;
      await new Promise((r) => setTimeout(r, 50));
    }
  })();
  const runs = await stage([
    pyBlock("pyc4", ["# timeout: 3"], "import subprocess, sys, time",
      `p = subprocess.Popen([sys.executable, "-c", ${JSON.stringify(child)}], stdout=subprocess.PIPE, text=True)`,
      "p.stdout.readline()", "time.sleep(30)"),
    pyBlock("pyc4-next", [], "print('next')"),
  ]);
  await watching;
  assert.ok(seen, "the background session was open during the block");
  assert.deepEqual(runs[0]!.first.failures, ["q pyc4: timed out after 3 s"]);
  assert.equal(runs[1]!.first.rendered, "-- result: pyc4-next · python · sha256 8a0956311647\nnext");
  assert.deepEqual(processes(marker), [], "no process left");
  assert.equal(await runSessions(), 0, "no session of the run");
  assert.deepEqual([...pyTemps()].filter((f) => !temps.has(f)), [], "no temp folder");
});

test("PY7/PY8 a failing block doesn't stop the stage: it's reported, and the next block runs", async () => {
  const runs = await stage([
    pyBlock("py7", [], "import sys", "print('one', file=sys.stderr)", "sys.exit(3)"),
    pyBlock("py7-next", [], "print('next')"),
  ]);
  assert.deepEqual(runs[0]!.first.failures, ["q py7: python exited with code 3; stderr ends:\none"]);
  assert.match(runs[1]!.first.rendered!, /\nnext$/);
});

test("PYC9 a child that escapes the group and keeps a session: check (b) ends it after 10 s and names it", async () => {
  const marker = `pyc9-${randomBytes(4).toString("hex")}`;
  const child = `import psycopg, time  # ${marker}\nc = psycopg.connect()\nprint(c.info.backend_pid, flush=True)\ntime.sleep(60)`;
  try {
    const [run] = await stage([pyBlock("pyc9", [], "import subprocess, sys",
      `p = subprocess.Popen([sys.executable, "-c", ${JSON.stringify(child)}], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, start_new_session=True)`,
      "print('started', p.stdout.readline().strip() != '')")]);
    assert.equal(run!.first.failures.length, 1);
    assert.match(run!.first.failures[0]!, /^q pyc9: its session\(s\) [0-9]+ still ran 10 s after it exited; ended$/);
    assert.equal(await runSessions(), 0);
  } finally {
    for (const pid of processes(marker)) process.kill(Number(pid), "SIGKILL");
  }
});

test("PYC5 an abort during a Python block: rejects with the reason; no process, temp folder, session, schema; the lock free", async () => {
  const marker = `pyc5-${randomBytes(4).toString("hex")}`;
  const schema = fresh("pyc5");
  const temps = pyTemps();
  const block = pyBlock("pyc5", ["# timeout: 300"], `import psycopg, time  # ${marker}`, "conn = psycopg.connect(autocommit=True)",
    `conn.execute("CREATE SCHEMA ${schema}")`, "time.sleep(240)");
  const stop = new AbortController();
  const run = checkLab(labTarget(), { dist, canarySchema: CANARY_SCHEMA, blocks: [block], course: course(block), signal: stop.signal });
  try {
    // After the loader stage's three loads.
    for (let i = 0; !(await learnObjects(admin)).includes(`schema ${schema}`); i++) {
      if (i > 2400) throw new Error("the block never committed its schema");
      await new Promise((r) => setTimeout(r, 50));
    }
  } finally {
    stop.abort(new Error("interrupted by SIGINT; nothing kept"));
  }
  await assert.rejects(run, /interrupted by SIGINT; nothing kept/);
  assert.deepEqual(processes(marker), [], "no process left");
  assert.deepEqual([...pyTemps()].filter((f) => !temps.has(f)), [], "no temp folder");
  assert.equal(await runSessions(), 0, "no session of the run");
  assert.ok(!(await learnObjects(admin)).includes(`schema ${schema}`), "the sweep dropped it");
  await assertLockFree();
});
