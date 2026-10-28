// learn:check's PostGIS block runner (plan D3 step 4; spike pg-engine.ts and run-queries.ts runBlock): one session as
// the lab role (pg.ts pgConnect's target, LEARN_PG_URL), with pg-session's statements and a 60 s statement timeout,
// asserted. Values come back as DuckDB's do, so a result renders and hashes the same in both engines (RP3): int8 as
// BigInt, numeric as text, float8 as a number, dates and timestamps as PostgreSQL writes them.
// A plain block runs in BEGIN … ROLLBACK: its `-- after:` blocks' statements, then its own, with a SAVEPOINT before
// the last one when it expects an error; before the ROLLBACK the leak check (learnObjects) looks for a learn_ role or
// schema a learner's psql would keep. A statement error, a server WARNING, a column a reader can't see (geometry,
// geography, raster, bytea), several rows without ORDER BY, a broken `-- plan:` assertion or a block over its time
// (cancelled; the session goes on) fails the block.
// runBlocks checks a page's blocks against their recorded results (site/learn/labs/checked/<id>.txt), or with
// `update` runs each twice and writes the results once both runs agree and every block passed.
// Tests: runner.dbtest.ts.
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import postgres from "postgres";
import { statementError, type Statement } from "../build/learn/sql.ts";
import { CHECKED_DIR, PG_SESSION, type Block } from "./blocks.ts";
import { CANARY_SCHEMA, LAB_SCHEMA, type PgTarget } from "./pg.ts";
import { planErrors } from "./plan.ts";
import { lineDiff, renderError, renderResult, rowsOrdered, type Result } from "./result.ts";

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

/** Every learn_ role and schema but the lab's and A2's, as `role <name>` / `schema <name>`: the leak query. */
export async function learnObjects(sql: postgres.Sql): Promise<string[]> {
  const rows = await sql<{ name: string }[]>`select 'role ' || rolname as name from pg_roles where rolname like 'learn\_%'
    union all select 'schema ' || nspname from pg_namespace
      where nspname like 'learn\_%' and nspname not in (${LAB_SCHEMA}, ${CANARY_SCHEMA}) order by 1`;
  return rows.map((r) => r.name);
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
  /** The server's NOTICE and WARNING messages so far, `<severity>: <message>`. */
  notices: string[];
  /** Runs one statement; cancels it at `deadline` (ms since the epoch). */
  run(text: string, deadline: number): Promise<Ran>;
  end(): Promise<void>;
}

/** The runner's session on `target`, asserted (PC1); throws, closing the connection, if it can't start (RP1). */
export async function openSession(target: PgTarget): Promise<LabSession> {
  const notices: string[] = [];
  const { host, port, user, password, database } = target;
  const sql = postgres({
    host, port, user, pass: password, database, max: 1, connect_timeout: 10, types: TYPES,
    connection: { application_name: "critwire-learn-check" },
    onnotice: (n) => notices.push(`${n.severity}: ${n.message}`),
  });
  try {
    for (const s of SESSION_STATEMENTS) await sql.unsafe(s);
    const [shown] = await sql.unsafe(SESSION_SQL);
    assertSession(shown!);
    const [{ pid }] = await sql<{ pid: number }[]>`select pg_backend_pid() as pid`;
    const oids = new Map((await sql<{ oid: number; typname: string }[]>`select oid::int as oid, typname from pg_type where typname in ${sql(UNRENDERABLE)}`)
      .map((r) => [r.oid, r.typname]));
    return {
      sql, pid, notices,
      async run(text, deadline) {
        const remaining = deadline - Date.now();
        if (remaining <= 0) return { error: "out of time", timedOut: true };
        const query = sql.unsafe(text).values();
        let timedOut = false;
        const timer = setTimeout(() => {
          timedOut = true;
          void query.cancel();
        }, remaining);
        try {
          const rows = await query;
          const columns = rows.columns ?? [];
          return {
            result: { columns: columns.map((c) => c.name), rows: rows.map((r) => [...r]) },
            unrenderable: columns.flatMap((c) => (oids.has(c.type) ? [{ column: c.name, type: oids.get(c.type)! }] : [])),
          };
        } catch (e) {
          if (timedOut || (e as { code?: string }).code === CANCELED) return { error: "out of time", timedOut: true };
          return { error: (e as Error).message };
        } finally {
          clearTimeout(timer);
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
  /** learn_ objects there before the run: the leak check ignores them. */
  known: ReadonlySet<string>;
  /** The block's time (default 60 s); the session's statement timeout stays the server's stop. */
  timeoutMs?: number;
}

/** The SAVEPOINT before an expected error's statement, so the leak check runs in the learner's state. */
const EXPECT_SAVEPOINT = "runner_expect";

/** A wrapped block's leak: the runner's ROLLBACK hides it, a learner's psql keeps it (LK1, LK2). */
const leftBehind = (id: string, leak: string) => `q ${id}: leaves ${leak} behind: the runner's ROLLBACK hides it, but a learner's psql keeps it; drop it in the block`;

/**
 * One plain PostGIS block in BEGIN … ROLLBACK, with its `-- after:` blocks (from `page`) first. Throws only when the
 * session can't go on (BEGIN, SAVEPOINT or ROLLBACK failed); a block's own failures are in the outcome.
 */
export async function runBlock(s: LabSession, b: Block, page: ReadonlyMap<string, Block>, { known, timeoutMs = BLOCK_TIMEOUT_MS }: RunOptions): Promise<Outcome> {
  if (b.engine !== "postgis" || b.status !== "ran") throw new Error(`q ${b.id}: the runner runs ran PostGIS blocks only`);
  if (b.boot || b.txOwn || b.sessions.length) throw new Error(`q ${b.id}: the runner doesn't run \`-- boot\`, \`-- tx: own\` or \`-- sessions:\` blocks yet`);
  const q = `q ${b.id}`;
  const o: Outcome = { id: b.id, failures: [] };
  const deadline = Date.now() + timeoutMs;
  const noticed = s.notices.length;
  // Transaction control gets its own time, so a block out of time still rolls back.
  const control = async (text: string) => {
    const r = await s.run(text, Date.now() + BLOCK_TIMEOUT_MS);
    if ("error" in r) throw new Error(`${q}: ${text} failed, so later blocks wouldn't see the database they expect: ${r.error}`);
  };
  const timedOut = () => `${q}: timed out after ${timeoutMs / 1000} s (cancelled)`;
  const failed = (st: Statement, total: number, error: string) => statementError(st, total, error).message;

  let last: Ran | undefined;
  await control("BEGIN");
  try {
    for (const id of b.after) {
      const a = page.get(id);
      if (!a) throw new Error(`${q}: \`-- after\`: no block ${id} on its page`);
      for (const st of a.statements) {
        const r = await s.run(st.text, deadline);
        if (!("error" in r)) continue;
        o.failures.push("timedOut" in r ? timedOut() : `${q}: after ${a.id}: ${failed(st, a.statements.length, r.error)}`);
        return o;
      }
    }
    const savepoint = b.expectError !== undefined;
    for (const st of b.statements) {
      const isLast = st === b.statements.at(-1);
      if (isLast && savepoint) await control(`SAVEPOINT ${EXPECT_SAVEPOINT}`);
      last = await s.run(st.text, deadline);
      if (!("error" in last)) continue;
      if ("timedOut" in last) {
        o.failures.push(timedOut());
        return o;
      }
      const message = failed(st, b.statements.length, last.error);
      if (!b.expectError) o.failures.push(`${q}: ${message}`);
      else if (!isLast) o.failures.push(`${q}: statement ${st.n} of ${b.statements.length} failed; only the last statement may: ${message}`);
      else if (!message.includes(b.expectError)) o.failures.push(`${q}: the error lacks "${b.expectError}": ${message}`);
      else o.rendered = renderError(b.id, message);
      if (isLast && savepoint) await control(`ROLLBACK TO SAVEPOINT ${EXPECT_SAVEPOINT}`);
      break;
    }
    if (!o.failures.length) for (const leak of await learnObjects(s.sql)) if (!known.has(leak)) o.failures.push(leftBehind(b.id, leak));
  } finally {
    await control("ROLLBACK");
    for (const w of s.notices.slice(noticed).filter((n) => n.startsWith("WARNING"))) o.failures.push(`${q}: the server warned: ${w}`);
  }
  if (!last || "error" in last) {
    if (o.failures.length) o.rendered = undefined;
    return o;
  }
  for (const { column, type } of last.unrenderable) o.failures.push(`${q}: column ${column} is ${type}: render it in SQL (ST_AsText, round)`);
  if (b.expectError) o.failures.push(`${q}: expected an error containing "${b.expectError}", but it ran`);
  const { result } = last;
  if (result.rows.length > 1 && !rowsOrdered(b.statements.at(-1)!.text)) o.failures.push(`${q}: the last statement returns ${result.rows.length} rows without ORDER BY`);
  if (b.plan.length) for (const e of planErrors(b.plan, result.rows.map((r) => String(r[0])))) o.failures.push(`${q}: ${e}`);
  if (!o.failures.length) o.rendered = renderResult(b.id, result);
  return o;
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
 * The page's blocks, in order, against their recorded results; with `update`, each run twice and, once every block
 * passed, each result written where it changed. Throws naming every failure.
 */
export async function runBlocks(s: LabSession, blocks: readonly Block[], { update, checkedDir = CHECKED_DIR, log = console.log, ...run }: BlocksOptions): Promise<void> {
  const page = new Map(blocks.map((b) => [b.id, b]));
  const failures: string[] = [];
  const writes: [file: string, text: string][] = [];
  for (const b of blocks) {
    const q = `q ${b.id}`;
    const file = join(checkedDir, `${b.id}.txt`);
    const first = await runBlock(s, b, page, run);
    failures.push(...first.failures);
    if (first.rendered === undefined) continue;
    const recorded = await readRecorded(file);
    if (update) {
      const second = await runBlock(s, b, page, run);
      failures.push(...second.failures);
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
