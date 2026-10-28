// learn:check's PostGIS block runner (plan D3 step 4; spike pg-engine.ts and run-queries.ts runBlock, runOwnBlock): one
// session as the lab role (pg.ts pgConnect's target, LEARN_PG_URL), with pg-session's statements and a 60 s statement
// timeout, asserted. Values come back as DuckDB's do, so a result renders and hashes the same in both engines (RP3):
// int8 as BigInt, numeric as text, float8 as a number, dates and timestamps as PostgreSQL writes them.
// A plain block runs in BEGIN … ROLLBACK: its `-- after:` blocks' statements, then its own, with a SAVEPOINT before
// the last one when it expects an error; before the ROLLBACK the leak check (leaks.ts learnObjects) looks for a learn_
// role or schema a learner's psql would keep. A statement error, a server WARNING, a column a reader can't see (geometry,
// geography, raster, bytea), several rows without ORDER BY, a broken `-- plan:` assertion or a block over its time
// (cancelled; the session goes on) fails the block. A `-- boot` block runs the same way but commits when clean (PC7).
// A `-- tx: own` block runs unwrapped: each `-- fails:` statement must fail with its text and the block goes on; then
// it must have ended clean (TX1–TX6, LK4): no open or failed transaction (a BEGIN probe; rolled back), the session as
// it was (restored), no committed learn_ object (the lab role's are dropped, others named once) and the watched schemas
// (the canary, learn_curriculum) unchanged. Its result is the last statement that returned rows.
// A `-- sessions:` block (D5) runs each window's statements in a session of its own (RunOptions.open), in block order,
// while the runner's session polls pg_blocking_pids: a `-- waits:` statement must be seen blocked by another window
// within 5 s, and is collected when its window runs next (or at the end); any other statement seen blocked fails the
// block at once and is cancelled. `-- fails:` as in `tx: own`; lock_timeout 30 s is the server's stop for a stalled
// wait. Then each window must have ended clean, with the `tx: own` checks for leaks and watched schemas, and both
// sessions end. Its result is every statement that returned rows, as `window | statement | <columns>`.
// runBlocks runs the boot blocks first, once, then the rest, against their recorded results
// (site/learn/labs/checked/<id>.txt), or with `update` runs each twice and writes the results once both runs agree and
// every block passed. An abort cancels the running statement and throws its reason. Tests: runner.dbtest.ts.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";
import { statementError, type Statement } from "../build/learn/sql.ts";
import { CHECKED_DIR, PG_SESSION, type Block } from "./blocks.ts";
import { dropObjects, labMade, learnObjects, superuserCleanup } from "./leaks.ts";
import { LAB_SCHEMA, type PgTarget } from "./pg.ts";
import { planErrors } from "./plan.ts";
import { lineDiff, renderError, renderResult, rowsOrdered, type Result } from "./result.ts";

/** The runner's sessions' application_name: what cleanup.ts stops on exit, and nothing else. */
export const RUNNER_APP = "critwire-learn-check";
/** The server-side stop for every statement, as PostgreSQL shows it; the runner's per-block deadline matches it. */
export const STATEMENT_TIMEOUT = "1min";
export const BLOCK_TIMEOUT_MS = 60_000;
/** What the runner's session runs at connect: pg-session's SET, then the timeout. */
export const SESSION_STATEMENTS: readonly string[] = [...PG_SESSION, `SET statement_timeout = '${STATEMENT_TIMEOUT}'`];
/** A `-- sessions:` block (D5): a `-- waits:` statement is seen blocked within this; the windows' lock_timeout, six
 * times it, is the server's stop if the runner stalls, never reached by a legitimate wait. */
export const WAIT_SEEN_MS = 5_000;
const WINDOW_LOCK_TIMEOUT = "30s";
const POLL_MS = 50;
const SEARCH_PATH = `${LAB_SCHEMA}, public`;
const SESSION_SQL = `SELECT current_setting('search_path') AS search_path, current_setting('statement_timeout') AS statement_timeout,
  current_user::text AS role, current_user = session_user AS own_role`;

/** Throws when the session isn't the one SESSION_STATEMENTS made: search path, timeout, its own role (PC1). */
export function assertSession(shown: Record<string, unknown>): void {
  if (shown.search_path !== SEARCH_PATH) throw new Error(`search_path = ${String(shown.search_path)}, expected ${SEARCH_PATH}`);
  if (shown.statement_timeout !== STATEMENT_TIMEOUT) throw new Error(`statement_timeout = ${String(shown.statement_timeout)}, expected ${STATEMENT_TIMEOUT}`);
  if (shown.own_role !== true) throw new Error(`current_user = ${String(shown.role)}, not the session's own role`);
}

/** A schema reading's differences (check.ts readTables: table → `rows|md5`, plus `tables:`), one line per table. */
export function tablesDiff(schema: string, before: Map<string, string>, after: Map<string, string>): string[] {
  const names = [...new Set([...before.keys(), ...after.keys()])].sort();
  return names.flatMap((t) => {
    const [b, a] = [before.get(t), after.get(t)];
    if (b === a) return [];
    if (t === "tables:") return [`${schema}: table list changed (${b} → ${a})`];
    if (a === undefined) return [`${schema}.${t}: dropped`];
    if (b === undefined) return [`${schema}.${t}: added`];
    return [`${schema}.${t}: rows or values changed (${b} → ${a})`];
  });
}

/** The schemas a `-- tx: own` block must leave as it found them (TX3), and how to read one (check.ts readTables). */
export interface Watch {
  schemas: readonly string[];
  read(schema: string): Promise<Map<string, string>>;
}

/** The versions a recorded result depends on (SC6): PostgreSQL, PostGIS and GEOS, as numbers. */
export async function serverVersions(sql: postgres.Sql): Promise<{ postgresql: string; postgis: string; geos: string }> {
  const [v] = await sql<{ postgresql: string; postgis: string; geos: string }[]>`select current_setting('server_version') as postgresql,
    postgis_lib_version() as postgis, postgis_geos_version() as geos`;
  const number = (s: string) => /^[0-9.]+/.exec(s)?.[0] ?? s;
  return { postgresql: number(v!.postgresql), postgis: number(v!.postgis), geos: number(v!.geos) };
}

/** PostgreSQL's own text for dates and timestamps (DuckDB's form), not a JS Date; int8 as BigInt (DuckDB's BIGINT). */
const TYPES = {
  pgDate: { to: 1082, from: [1082, 1114, 1184], serialize: (x: string) => x, parse: (x: string) => x },
  pgInt8: { to: 20, from: [20], serialize: (x: bigint) => x.toString(), parse: (x: string) => BigInt(x) },
} satisfies postgres.Options<{}>["types"];
/** Types a result must not hold: binary, or too long to read; the SQL should render them. */
const UNRENDERABLE = ["geometry", "geography", "raster", "bytea"];
/** query_canceled: the runner's cancel or the server's statement timeout. */
const CANCELED = "57014";

/** One statement's outcome: rows (with the columns a reader can't see), an error, or out of time. */
type Ran = { result: Result; unrenderable: { column: string; type: string }[] } | { error: string; timedOut?: true };

export interface LabSession {
  sql: postgres.Sql;
  pid: number;
  /** The database it's on, for the superuser's cleanup commands. */
  database: string;
  /** The server's NOTICE and WARNING messages so far, `<severity>: <message>`. */
  notices: string[];
  /** Runs one statement; cancels it at `deadline` (ms since the epoch). Throws the abort's reason, or when the
   * connection closed (postgres.js would reconnect without pg-session's statements). */
  run(text: string, deadline: number): Promise<Ran>;
  end(): Promise<void>;
}

/**
 * The runner's session on `target`, asserted (PC1); throws, closing the connection, if it can't start (RP1). Aborting
 * `signal` cancels the running statement.
 */
export async function openSession(target: PgTarget, signal?: AbortSignal): Promise<LabSession> {
  const notices: string[] = [];
  let closed = false;
  const { host, port, user, password, database } = target;
  const sql = postgres({
    host, port, user, pass: password, database, max: 1, connect_timeout: 10, types: TYPES,
    connection: { application_name: RUNNER_APP },
    onnotice: (n) => notices.push(`${n.severity}: ${n.message}`),
    onclose: () => (closed = true),
  });
  const stopped = () => {
    signal?.throwIfAborted();
    if (closed) throw new Error("the runner's session closed, so later blocks wouldn't run in pg-session's session");
  };
  try {
    for (const s of SESSION_STATEMENTS) await sql.unsafe(s);
    const [shown] = await sql.unsafe(SESSION_SQL);
    assertSession(shown!);
    const [{ pid }] = await sql<{ pid: number }[]>`select pg_backend_pid() as pid`;
    const oids = new Map((await sql<{ oid: number; typname: string }[]>`select oid::int as oid, typname from pg_type where typname in ${sql(UNRENDERABLE)}`)
      .map((r) => [r.oid, r.typname]));
    return {
      sql, pid, database, notices,
      async run(text, deadline) {
        stopped();
        const remaining = deadline - Date.now();
        if (remaining <= 0) return { error: "out of time", timedOut: true };
        const query = sql.unsafe(text).values();
        let timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          void query.cancel();
        }, remaining);
        const cancel = () => void query.cancel();
        signal?.addEventListener("abort", cancel, { once: true });
        try {
          const rows = await query;
          stopped();
          const columns = rows.columns ?? [];
          return {
            result: { columns: columns.map((c) => c.name), rows: rows.map((r) => [...r]) },
            unrenderable: columns.flatMap((c) => (oids.has(c.type) ? [{ column: c.name, type: oids.get(c.type)! }] : [])),
          };
        } catch (e) {
          stopped();
          if (timedOut || (e as { code?: string }).code === CANCELED) return { error: "out of time", timedOut: true };
          return { error: (e as Error).message };
        } finally {
          clearTimeout(timer);
          signal?.removeEventListener("abort", cancel);
        }
      },
      end: () => sql.end(),
    };
  } catch (e) {
    await sql.end();
    throw e;
  }
}

export interface Outcome {
  id: string;
  failures: string[];
  /** The result as checked/<id>.txt records it, when the block ran as it should. */
  rendered?: string;
}

export interface RunOptions {
  /** learn_ objects there before the run: the leak check ignores them; a committed leak the runner can't drop joins. */
  known: Set<string>;
  /** What a `-- tx: own` block must leave unchanged (TX3); required for those blocks. */
  watch?: Watch;
  /** The block's time (default 60 s); the session's statement timeout stays the server's stop. */
  timeoutMs?: number;
  /** Opens a session for one window of a `-- sessions:` block (learn:check records it with the lock); required for those. */
  open?: () => Promise<LabSession>;
}

/** The SAVEPOINT before an expected error's statement, so the leak check runs in the learner's state. */
const EXPECT_SAVEPOINT = "runner_expect";

/** A wrapped block's leak: the runner's ROLLBACK hides it, a learner's psql keeps it (LK1, LK2). */
const leftBehind = (id: string, leak: string) => `q ${id}: leaves ${leak} behind: the runner's ROLLBACK hides it, but a learner's psql keeps it; drop it in the block`;

/** The transaction control a block's run needs, with its own time, so a block out of time still ends; throws on failure. */
function control(s: LabSession, q: string) {
  return async (text: string) => {
    const r = await s.run(text, Date.now() + BLOCK_TIMEOUT_MS);
    if ("error" in r) throw new Error(`${q}: ${text} failed, so later blocks wouldn't see the database they expect: ${r.error}`);
  };
}

const timedOut = (q: string, ms: number) => `${q}: timed out after ${ms / 1000} s (cancelled)`;
const warnings = (s: LabSession, from: number, q: string) =>
  s.notices.slice(from).filter((n) => n.startsWith("WARNING")).map((w) => `${q}: the server warned: ${w}`);

/** What a statement that returned rows breaks: unrenderable columns, several rows without ORDER BY, `-- plan:`. */
function resultErrors(b: Block, q: string, ran: Exclude<Ran, { error: string }>, text: string): string[] {
  const errors = ran.unrenderable.map(({ column, type }) => `${q}: column ${column} is ${type}: render it in SQL (ST_AsText, round)`);
  const { rows } = ran.result;
  if (rows.length > 1 && !rowsOrdered(text)) errors.push(`${q}: the last statement returns ${rows.length} rows without ORDER BY`);
  if (b.plan.length) for (const e of planErrors(b.plan, rows.map((r) => String(r[0])))) errors.push(`${q}: ${e}`);
  return errors;
}

/**
 * One PostGIS block: a plain or `-- boot` block in BEGIN … ROLLBACK (COMMIT for a clean boot block), with its `-- after:`
 * blocks (from `page`) first; a `-- tx: own` block unwrapped (runOwnBlock). Throws only when the session can't go on
 * (BEGIN, SAVEPOINT or ROLLBACK failed, an abort); a block's own failures are in the outcome.
 */
export async function runBlock(s: LabSession, b: Block, page: ReadonlyMap<string, Block>, options: RunOptions): Promise<Outcome> {
  if (b.engine !== "postgis" || b.status !== "ran") throw new Error(`q ${b.id}: the runner runs ran PostGIS blocks only`);
  if (b.sessions.length) return runSessionsBlock(s, b, options);
  if (b.txOwn) return runOwnBlock(s, b, options);
  const { known, timeoutMs = BLOCK_TIMEOUT_MS } = options;
  const q = `q ${b.id}`;
  const o: Outcome = { id: b.id, failures: [] };
  const deadline = Date.now() + timeoutMs;
  const noticed = s.notices.length;
  const tx = control(s, q);
  const failed = (st: Statement, total: number, error: string) => statementError(st, total, error).message;

  let last: Ran | undefined;
  await tx("BEGIN");
  try {
    for (const id of b.after) {
      const a = page.get(id);
      if (!a) throw new Error(`${q}: \`-- after\`: no block ${id} on its page`);
      for (const st of a.statements) {
        const r = await s.run(st.text, deadline);
        if (!("error" in r)) continue;
        o.failures.push("timedOut" in r ? timedOut(q, timeoutMs) : `${q}: after ${a.id}: ${failed(st, a.statements.length, r.error)}`);
        return o;
      }
    }
    const savepoint = b.expectError !== undefined;
    for (const st of b.statements) {
      const isLast = st === b.statements.at(-1);
      if (isLast && savepoint) await tx(`SAVEPOINT ${EXPECT_SAVEPOINT}`);
      last = await s.run(st.text, deadline);
      if (!("error" in last)) continue;
      if ("timedOut" in last) {
        o.failures.push(timedOut(q, timeoutMs));
        return o;
      }
      const message = failed(st, b.statements.length, last.error);
      if (!b.expectError) o.failures.push(`${q}: ${message}`);
      else if (!isLast) o.failures.push(`${q}: statement ${st.n} of ${b.statements.length} failed; only the last statement may: ${message}`);
      else if (!message.includes(b.expectError)) o.failures.push(`${q}: the error lacks "${b.expectError}": ${message}`);
      else o.rendered = renderError(b.id, message);
      if (isLast && savepoint) await tx(`ROLLBACK TO SAVEPOINT ${EXPECT_SAVEPOINT}`);
      break;
    }
    if (!o.failures.length) for (const leak of await learnObjects(s.sql)) if (!known.has(leak)) o.failures.push(leftBehind(b.id, leak));
  } finally {
    const clean = b.boot && last && !("error" in last) && !o.failures.length && !warnings(s, noticed, q).length;
    await tx(clean ? "COMMIT" : "ROLLBACK");
    o.failures.push(...warnings(s, noticed, q));
  }
  if (!last || "error" in last) {
    if (o.failures.length) o.rendered = undefined;
    return o;
  }
  o.failures.push(...resultErrors(b, q, last, b.statements.at(-1)!.text));
  if (b.expectError) o.failures.push(`${q}: expected an error containing "${b.expectError}", but it ran`);
  if (!o.failures.length) o.rendered = renderResult(b.id, last.result);
  return o;
}

/** PostgreSQL's warning for a BEGIN inside an open transaction: the probe that a `-- tx: own` block left one open. */
const OPEN_TRANSACTION = /there is already a transaction in progress/;

/**
 * One `-- tx: own` block (TX1–TX6, LK4): its statements as written, unwrapped, each `-- fails:` one failing as marked;
 * then the checks that it ended clean, each putting back what it can: a BEGIN probe (an error or PostgreSQL's warning
 * means a transaction was left; the runner rolls it back), the session (restored), committed learn_ objects (the lab
 * role's dropped, others named once and then known), the watched schemas.
 */
async function runOwnBlock(s: LabSession, b: Block, { known, watch, timeoutMs = BLOCK_TIMEOUT_MS }: RunOptions): Promise<Outcome> {
  const q = `q ${b.id}`;
  if (!watch) throw new Error(`${q}: a \`-- tx: own\` block needs the schemas it must leave unchanged (watch)`);
  const o: Outcome = { id: b.id, failures: [] };
  const before = await readWatched(watch);
  const deadline = Date.now() + timeoutMs;
  const noticed = s.notices.length;
  const total = b.statements.length;
  let shown: { ran: Exclude<Ran, { error: string }>; text: string } | undefined;
  for (const [i, st] of b.statements.entries()) {
    const ran = await s.run(st.text, deadline);
    const fails = b.fails[i];
    const at = `${q}: statement ${st.n} of ${total}`;
    if ("timedOut" in ran) {
      o.failures.push(timedOut(q, timeoutMs));
      break;
    }
    if (fails !== undefined) {
      const failure = failsAsMarked(at, fails, ran);
      if (!failure) continue;
      o.failures.push(failure);
      break;
    }
    if ("error" in ran) {
      o.failures.push(`${q}: ${statementError(st, total, ran.error).message}`);
      break;
    }
    if (ran.result.columns.length) shown = { ran, text: st.text };
  }
  o.failures.push(...warnings(s, noticed, q));

  if (await leftOpen(s, q)) o.failures.push(`${q}: left its transaction open; the runner rolled it back`);
  o.failures.push(...(await restoreSession(s, q)));
  o.failures.push(...(await committedLeaks(s, q, known)));
  o.failures.push(...(await committedChanges(watch, before, q)));

  if (!o.failures.length && !shown) o.failures.push(`${q}: no statement returned rows to show`);
  if (o.failures.length || !shown) return o;
  o.failures.push(...resultErrors(b, q, shown.ran, shown.text));
  if (!o.failures.length) o.rendered = renderResult(b.id, shown.ran.result);
  return o;
}

/** A `-- fails: <text>` statement's failure: undefined when it failed with the text. */
function failsAsMarked(at: string, fails: string, ran: Ran): string | undefined {
  if (!("error" in ran)) return `${at} should fail with "${fails}" but succeeded`;
  if (!ran.error.includes(fails)) return `${at} should fail with "${fails}" but failed with: ${ran.error}`;
  return undefined;
}

/** The BEGIN probe (TX1): whether `s` was left in a transaction (an error, or PostgreSQL's warning); rolled back either way. */
async function leftOpen(s: LabSession, q: string): Promise<boolean> {
  const probed = s.notices.length;
  const probe = await s.run("BEGIN", Date.now() + BLOCK_TIMEOUT_MS);
  const open = "error" in probe || s.notices.slice(probed).some((n) => OPEN_TRANSACTION.test(n));
  await control(s, q)("ROLLBACK");
  return open;
}

const readWatched = (watch: Watch) => Promise.all(watch.schemas.map((schema) => watch.read(schema)));

/** The watched schemas' changes since `before` (TX3), one failure per table. */
async function committedChanges(watch: Watch, before: Map<string, string>[], q: string): Promise<string[]> {
  const after = await readWatched(watch);
  return watch.schemas.flatMap((schema, i) => tablesDiff(schema, before[i]!, after[i]!).map((d) => `${q}: committed a change: ${d}`));
}

/** A window of a `-- sessions:` block: its session, and the `-- waits:` statement it left running, if any. */
interface Window {
  name: string;
  s: LabSession;
  pending?: { i: number; running: Promise<Ran> };
}

/** What polling a running statement saw: it finished, or pg_blocking_pids named its blockers, or `seenMs` passed. */
type Seen = { ran: Ran } | { blockers: number[] } | { late: true };

/** Polls `pid`'s blockers on `poll` (every 50 ms) until `running` settles, something blocks it, or `seenMs` passes. */
async function watchStatement(poll: postgres.Sql, pid: number, running: Promise<Ran>, seenMs?: number): Promise<Seen> {
  let settled = false;
  running.then(() => (settled = true), () => (settled = true));
  const start = Date.now();
  for (;;) {
    await Promise.race([running.catch(() => {}), new Promise((r) => setTimeout(r, POLL_MS))]);
    if (settled) return { ran: await running };
    const [{ blockers }] = await poll<{ blockers: number[] }[]>`select pg_blocking_pids(${pid}) as blockers`;
    if (settled) return { ran: await running };
    if (blockers.length) return { blockers };
    if (seenMs !== undefined && Date.now() - start > seenMs) return { late: true };
  }
}

/**
 * One `-- sessions:` block (D5): a session per window, opened with `open` and given lock_timeout; the statements in
 * block order, each in its window's session, watched from `s`. A window's earlier `-- waits:` statement is collected
 * before its next one runs. On the first failure the block stops; then (failure or not) the pending statements are
 * cancelled and the windows' sessions ended, and the `tx: own` checks run.
 */
async function runSessionsBlock(s: LabSession, b: Block, { known, watch, open, timeoutMs = BLOCK_TIMEOUT_MS }: RunOptions): Promise<Outcome> {
  const q = `q ${b.id}`;
  if (!watch || !open) throw new Error(`${q}: a \`-- sessions:\` block needs the schemas it must leave unchanged (watch) and a way to open its windows (open)`);
  const o: Outcome = { id: b.id, failures: [] };
  const before = await readWatched(watch);
  const total = b.statements.length;
  const at = (i: number) => `${q}: statement ${b.statements[i]!.n} (window ${b.windows[i]})`;
  const shown: { window: string; n: number; ran: Exclude<Ran, { error: string }>; text: string }[] = [];
  /** A statement's outcome; false when it fails the block. */
  const settle = (i: number, ran: Ran): boolean => {
    const st = b.statements[i]!;
    const fails = b.fails[i];
    let failure: string | undefined;
    if ("timedOut" in ran) failure = timedOut(q, timeoutMs);
    else if (fails !== undefined) failure = failsAsMarked(at(i), fails, ran);
    else if ("error" in ran) failure = `${q}: ${statementError(st, total, ran.error).message} (window ${b.windows[i]})`;
    else if (ran.result.columns.length) shown.push({ window: b.windows[i]!, n: st.n, ran, text: st.text });
    if (failure) o.failures.push(failure);
    return !failure;
  };
  const collect = async (w: Window): Promise<boolean> => {
    if (!w.pending) return true;
    const { i, running } = w.pending;
    w.pending = undefined;
    return settle(i, await running);
  };

  const windows: Window[] = [];
  try {
    for (const name of b.sessions) {
      windows.push({ name, s: await open() });
      await control(windows.at(-1)!.s, q)(`SET lock_timeout = '${WINDOW_LOCK_TIMEOUT}'`);
    }
    const byName = new Map(windows.map((w) => [w.name, w]));
    const named = (pids: number[]) => pids.map((p) => windows.find((w) => w.s.pid === p)).map((w, k) => (w ? `window ${w.name}` : `pid ${pids[k]}`)).join(", ");
    const deadline = Date.now() + timeoutMs;
    let ok = true;
    for (const [i, st] of b.statements.entries()) {
      const w = byName.get(b.windows[i]!)!;
      if (!(ok = await collect(w))) break;
      const running = w.s.run(st.text, deadline);
      const waits = b.waits[i];
      const seen = await watchStatement(s.sql, w.s.pid, running, waits === undefined ? undefined : WAIT_SEEN_MS);
      if ("ran" in seen) {
        if (waits === undefined) ok = settle(i, seen.ran);
        else {
          o.failures.push(`${at(i)}: didn't wait (${waits}): it ran to the end`);
          ok = false;
        }
      } else {
        w.pending = { i, running };
        const others = windows.filter((x) => x !== w).map((x) => x.s.pid);
        if (waits === undefined && "blockers" in seen) o.failures.push(`${at(i)}: waited for a lock held by ${named(seen.blockers)} without \`-- waits:\`; cancelled`);
        else if ("late" in seen) o.failures.push(`${at(i)}: didn't wait (${waits}): not blocked by another window within ${WAIT_SEEN_MS / 1000} s`);
        else if (!seen.blockers.some((p) => others.includes(p))) o.failures.push(`${at(i)}: waits (${waits}), but on ${named(seen.blockers)}, not another window`);
        else continue;
        ok = false;
      }
      if (!ok) break;
    }
    for (const w of windows) if (ok) ok = await collect(w);
    if (ok) {
      for (const w of windows) {
        o.failures.push(...warnings(w.s, 0, `${q} (window ${w.name})`));
        if (await leftOpen(w.s, q)) o.failures.push(`${q}: window ${w.name} left its transaction open; the runner rolled it back`);
      }
    }
  } finally {
    await endWindows(s, windows);
  }
  o.failures.push(...(await committedLeaks(s, q, known)));
  o.failures.push(...(await committedChanges(watch, before, q)));

  if (!o.failures.length && !shown.length) o.failures.push(`${q}: no statement returned rows to show`);
  if (o.failures.length) return o;
  const columns = shown[0]!.ran.result.columns;
  if (shown.some((x) => x.ran.result.columns.join("\0") !== columns.join("\0"))) {
    o.failures.push(`${q}: the statements that return rows must share their columns: ${shown.map((x) => `statement ${x.n} (${x.ran.result.columns.join(", ")})`).join(", ")}`);
    return o;
  }
  for (const x of shown) o.failures.push(...resultErrors(b, q, x.ran, x.text));
  if (o.failures.length) return o;
  const rows = shown.flatMap((x) => x.ran.result.rows.map((r) => [x.window, x.n, ...r]));
  o.rendered = renderResult(b.id, { columns: ["window", "statement", ...columns], rows });
  return o;
}

/** Cancels each window's pending statement (pg_cancel_backend, from `s`), waits for it, and ends the window's session. */
async function endWindows(s: LabSession, windows: readonly Window[]): Promise<void> {
  for (const w of windows) {
    if (!w.pending) continue;
    await s.sql`select pg_cancel_backend(${w.s.pid})`;
    await w.pending.running.catch(() => undefined);
    w.pending = undefined;
  }
  await Promise.all(windows.map((w) => w.s.end()));
}

/** The session as openSession left it (TX1): if a block changed it, a failure, and the session's statements run again. */
async function restoreSession(s: LabSession, q: string): Promise<string[]> {
  const [shown] = await s.sql.unsafe(SESSION_SQL);
  try {
    assertSession(shown!);
    return [];
  } catch (e) {
    for (const text of ["RESET ROLE", ...SESSION_STATEMENTS]) await s.sql.unsafe(text);
    const [again] = await s.sql.unsafe(SESSION_SQL);
    assertSession(again!);
    return [`${q}: changed the session: ${(e as Error).message}; the runner restored it`];
  }
}

/** A `-- tx: own` block's committed learn_ objects (LK4): the lab role's dropped, others named once and then known. */
async function committedLeaks(s: LabSession, q: string, known: Set<string>): Promise<string[]> {
  const leaks = (await learnObjects(s.sql)).filter((o) => !known.has(o));
  const ours = new Set(await labMade(s.sql, leaks));
  try {
    await dropObjects(s.sql, [...ours]);
  } catch (e) {
    throw new Error(`${q}: ${(e as Error).message}`);
  }
  return leaks.map((leak) => {
    if (ours.has(leak)) return `${q}: committed ${leak}; the runner dropped it`;
    known.add(leak);
    return `${q}: committed ${leak}; the lab role didn't make it, so as the superuser run: ${superuserCleanup(leak, s.database)}`;
  });
}

export interface BlocksOptions extends RunOptions {
  /** Write the recorded results (each block run twice) instead of checking them. */
  update: boolean;
  /** Where the recorded results live (default site/learn/labs/checked). */
  checkedDir?: string;
  /** Print each block's rendered result (learn:check --module). */
  show?: boolean;
  log?: (line: string) => void;
  /** Runs once the boot blocks committed, before any other block (learn:check's lab ERD check); a throw stops the run. */
  afterBoot?: () => Promise<void>;
}

async function readRecorded(file: string): Promise<string | undefined> {
  try {
    return await readFile(file, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw e;
  }
}

/**
 * The page's blocks against their recorded results: the `-- boot` blocks first, once (a failing one throws at once),
 * then `afterBoot`, then the rest in order; with `update`, each of the rest run twice and, once every block passed,
 * each result written where it changed. Throws naming every failure.
 */
export async function runBlocks(s: LabSession, blocks: readonly Block[], { update, checkedDir = CHECKED_DIR, show = false, log = console.log, afterBoot, ...run }: BlocksOptions): Promise<void> {
  const page = new Map(blocks.map((b) => [b.id, b]));
  const failures: string[] = [];
  const writes: [file: string, text: string][] = [];
  const one = async (b: Block): Promise<void> => {
    const q = `q ${b.id}`;
    const file = join(checkedDir, `${b.id}.txt`);
    const first = await runBlock(s, b, page, run);
    if (b.boot && first.failures.length) throw new Error(`boot block ${b.id}: ${first.failures.join("; ")}`);
    failures.push(...first.failures);
    if (first.rendered === undefined) return;
    if (show) log(`learn:check: ${q}:\n  ${first.rendered.split("\n").join("\n  ")}`);
    const recorded = await readRecorded(file);
    if (update) {
      const second = b.boot ? first : await runBlock(s, b, page, run);
      failures.push(...(b.boot ? [] : second.failures));
      if (second.rendered === undefined) return;
      if (!b.plan.length && second.rendered !== first.rendered) {
        failures.push(`${q}: two runs differ, so its result isn't reproducible:\n  ${lineDiff(first.rendered, second.rendered).join("\n  ")}`);
        return;
      }
      if (recorded !== first.rendered) writes.push([file, first.rendered]);
    } else if (recorded === undefined) failures.push(`${q}: no recorded result: run pnpm learn:check --update`);
    else if (recorded !== first.rendered) {
      const diff = lineDiff(recorded, first.rendered).join("\n  ");
      if (b.plan.length) log(`learn:check: ${q}: the plan's text differs from ${file} (its assertions hold):\n  ${diff}`);
      else failures.push(`${q}: result differs from ${file}:\n  ${diff}`);
    } else if (!first.failures.length) log(`learn:check: ${q}: ok`);
  };
  for (const b of blocks.filter((x) => x.boot)) await one(b);
  await afterBoot?.();
  for (const b of blocks.filter((x) => !x.boot)) await one(b);
  if (failures.length) throw new Error(`blocks: ${failures.length} failure(s):\n${failures.join("\n")}`);
  if (writes.length) await mkdir(checkedDir, { recursive: true });
  for (const [file, text] of writes) {
    await writeFile(file, text);
    log(`learn:check: wrote ${file}`);
  }
}
