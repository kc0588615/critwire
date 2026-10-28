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
  if (b.sessions.length) throw new Error(`q ${b.id}: the runner doesn't run \`-- sessions:\` blocks yet`);
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
  const before = await Promise.all(watch.schemas.map((schema) => watch.read(schema)));
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
      if (!("error" in ran)) o.failures.push(`${at} should fail with "${fails}" but succeeded`);
      else if (!ran.error.includes(fails)) o.failures.push(`${at} should fail with "${fails}" but failed with: ${ran.error}`);
      else continue;
      break;
    }
    if ("error" in ran) {
      o.failures.push(`${q}: ${statementError(st, total, ran.error).message}`);
      break;
    }
    if (ran.result.columns.length) shown = { ran, text: st.text };
  }
  o.failures.push(...warnings(s, noticed, q));

  const probed = s.notices.length;
  const probe = await s.run("BEGIN", Date.now() + BLOCK_TIMEOUT_MS);
  if ("error" in probe || s.notices.slice(probed).some((n) => OPEN_TRANSACTION.test(n))) o.failures.push(`${q}: left its transaction open; the runner rolled it back`);
  await control(s, q)("ROLLBACK");
  o.failures.push(...(await restoreSession(s, q)));
  o.failures.push(...(await committedLeaks(s, q, known)));
  for (const [i, schema] of watch.schemas.entries()) {
    for (const d of tablesDiff(schema, before[i]!, await watch.read(schema))) o.failures.push(`${q}: committed a change: ${d}`);
  }

  if (!o.failures.length && !shown) o.failures.push(`${q}: no statement returned rows to show`);
  if (o.failures.length || !shown) return o;
  o.failures.push(...resultErrors(b, q, shown.ran, shown.text));
  if (!o.failures.length) o.rendered = renderResult(b.id, shown.ran.result);
  return o;
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
  log?: (line: string) => void;
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
 * then the rest in order; with `update`, each of the rest run twice and, once every block passed, each result written
 * where it changed. Throws naming every failure.
 */
export async function runBlocks(s: LabSession, blocks: readonly Block[], { update, checkedDir = CHECKED_DIR, log = console.log, ...run }: BlocksOptions): Promise<void> {
  const page = new Map(blocks.map((b) => [b.id, b]));
  const failures: string[] = [];
  const writes: [file: string, text: string][] = [];
  for (const b of [...blocks.filter((x) => x.boot), ...blocks.filter((x) => !x.boot)]) {
    const q = `q ${b.id}`;
    const file = join(checkedDir, `${b.id}.txt`);
    const first = await runBlock(s, b, page, run);
    if (b.boot && first.failures.length) throw new Error(`boot block ${b.id}: ${first.failures.join("; ")}`);
    failures.push(...first.failures);
    if (first.rendered === undefined) continue;
    const recorded = await readRecorded(file);
    if (update) {
      const second = b.boot ? first : await runBlock(s, b, page, run);
      failures.push(...(b.boot ? [] : second.failures));
      if (second.rendered === undefined) continue;
      if (!b.plan.length && second.rendered !== first.rendered) {
        failures.push(`${q}: two runs differ, so its result isn't reproducible:\n  ${lineDiff(first.rendered, second.rendered).join("\n  ")}`);
        continue;
      }
      if (recorded !== first.rendered) writes.push([file, first.rendered]);
    } else if (recorded === undefined) failures.push(`${q}: no recorded result: run pnpm learn:check --update`);
    else if (recorded !== first.rendered) {
      const diff = lineDiff(recorded, first.rendered).join("\n  ");
      if (b.plan.length) log(`learn:check: ${q}: the plan's text differs from ${file} (its assertions hold):\n  ${diff}`);
      else failures.push(`${q}: result differs from ${file}:\n  ${diff}`);
    }
  }
  if (failures.length) throw new Error(`blocks: ${failures.length} failure(s):\n${failures.join("\n")}`);
  if (writes.length) await mkdir(checkedDir, { recursive: true });
  for (const [file, text] of writes) {
    await writeFile(file, text);
    log(`learn:check: wrote ${file}`);
  }
}
