// learn:check's cleanup connection (plan D3 Cleanup; SC7 error paths, R13): it takes the lab lock, reads the learn_
// objects already there, runs no block, and on release, whatever ended the run, in this order:
// 1. stops the run's sessions (the runner's, recorded by pid): pg_terminate_backend(pid, 10 s) for each still running,
//    so its transaction rolls back and its locks go; one still running fails the cleanup, named;
// 2. sweeps, under the lock: the new learn_ objects the lab role made are dropped (roles, then schemas); any other new
//    one is named with the superuser's command, never dropped (another process's, e.g. a superuser's test fixture);
// 3. frees the lock and ends the connection.
// The lock serializes every lab-role writer (learn:check, test:db's withLabSchema), so what the sweep drops is this
// run's. A lost connection took the lock with it: nothing is dropped, and every new object is named.
// Tests: learn-check.dbtest.ts (CU1–CU5).
import type postgres from "postgres";
import { dropObjects, labMade, learnObjects, superuserCleanup } from "./leaks.ts";
import { LAB_LOCK, pgConnect, type PgTarget } from "./pg.ts";
import { RUNNER_APP } from "./runner.ts";

/** How long a recorded session gets to end once terminated. */
const TERMINATE_MS = 10_000;

export interface LabLock {
  /** The cleanup connection's backend. */
  pid: number;
  /** learn_ objects there when the lock was taken: never swept, and the leak check ignores them. */
  known: ReadonlySet<string>;
  /** A session the run opened: release stops it if it still runs. */
  record(pid: number): void;
  /** Stops the recorded sessions, sweeps, frees the lock and ends the connection; throws naming what it couldn't do. */
  release(): Promise<void>;
}

/** The lab lock on its own connection to `lab` (database `db`); throws if another run holds it. */
export async function takeLabLock(lab: PgTarget, db: string): Promise<LabLock> {
  let lost = false;
  const sql = pgConnect(lab, { onclose: () => (lost = true) });
  try {
    const [{ locked, pid }] = await sql<{ locked: boolean; pid: number }[]>`select pg_try_advisory_lock(hashtext(${LAB_LOCK})) as locked,
      pg_backend_pid() as pid`;
    if (!locked) throw new Error(`the lab lock (${LAB_LOCK}) is held by another learn:check or pnpm test:db on ${db}: wait for it`);
    // A sweep waiting on a lock fails rather than hangs.
    await sql`set lock_timeout = '30s'`;
    const known = new Set(await learnObjects(sql));
    const sessions = new Set<number>();
    const fresh = async () => (await learnObjects(sql)).filter((o) => !known.has(o));
    return {
      pid, known,
      record: (session) => void sessions.add(session),
      async release() {
        if (lost || !(await holdsLock(sql, pid))) {
          await sql.end({ timeout: 0 });
          throw new Error(`cleanup: ${await lostConnection(lab, db, known)}`);
        }
        const problems: string[] = [];
        try {
          problems.push(...(await stopSessions(sql, [...sessions])));
          const made = await fresh();
          const ours = await labMade(sql, made);
          if (ours.length) console.log(`learn:check: cleanup: dropping what the run made: ${ours.join(", ")}`);
          await dropObjects(sql, ours).catch((e: Error) => problems.push(e.message));
          for (const o of made) if (!ours.includes(o)) problems.push(`${o} is new but the lab role didn't make it, so as the superuser run: ${superuserCleanup(o, db)}`);
        } catch (e) {
          problems.push((e as Error).message);
        } finally {
          await sql`select pg_advisory_unlock(hashtext(${LAB_LOCK}))`.catch((e: Error) => problems.push(`freeing the lab lock: ${e.message}`));
          await sql.end();
        }
        if (problems.length) throw new Error(problems.map((p) => `cleanup: ${p}`).join("\n"));
      },
    };
  } catch (e) {
    await sql.end();
    throw e;
  }
}

/** Whether the connection is still backend `pid` and holds an advisory lock (postgres.js reconnects silently). */
async function holdsLock(sql: postgres.Sql, pid: number): Promise<boolean> {
  try {
    const [row] = await sql<{ held: boolean }[]>`select pg_backend_pid() = ${pid} and exists (select from pg_locks
      where locktype = 'advisory' and pid = pg_backend_pid() and granted) as held`;
    return row!.held;
  } catch {
    return false;
  }
}

/** Terminates each recorded session still running; returns one line per session that didn't end. */
async function stopSessions(sql: postgres.Sql, pids: number[]): Promise<string[]> {
  if (!pids.length) return [];
  const running = await sql<{ pid: number }[]>`select pid from pg_stat_activity where pid in ${sql(pids)} and application_name = ${RUNNER_APP}`;
  const problems: string[] = [];
  for (const { pid } of running) {
    try {
      const [{ gone }] = await sql<{ gone: boolean }[]>`select pg_terminate_backend(${pid}, ${TERMINATE_MS}) as gone`;
      // false also means it had already ended between the two queries.
      const [still] = gone ? [] : await sql`select from pg_stat_activity where pid = ${pid}`;
      if (still) problems.push(`session ${pid} still runs after ${TERMINATE_MS / 1000} s`);
    } catch (e) {
      problems.push(`session ${pid} still runs: ${(e as Error).message}`);
    }
  }
  return problems;
}

/** What a lost cleanup connection leaves: every new learn_ object, named with its cleanup command (a fresh, read-only look). */
async function lostConnection(lab: PgTarget, db: string, known: ReadonlySet<string>): Promise<string> {
  const lost = "the cleanup connection was lost, and the lab lock with it, so nothing was dropped";
  const sql = pgConnect(lab);
  try {
    const made = (await learnObjects(sql)).filter((o) => !known.has(o));
    return made.length ? `${lost}; as the superuser run:\n  ${made.map((o) => superuserCleanup(o, db)).join("\n  ")}` : `${lost}; no new learn_ object`;
  } catch (e) {
    return `${lost}; listing the new learn_ objects failed too: ${(e as Error).message}`;
  } finally {
    await sql.end();
  }
}
