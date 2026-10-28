// pnpm learn:check, the loader stage (plan D10 checks 1–11 and Cleanup): the published loader, run twice as a learner
// runs it (psql -X -v ON_ERROR_STOP=1 -f), as the lab role, under the lab lock, then once with a duplicate occurrences
// id, which must fail and change nothing (the load is one transaction). Around it: the live database refused twice, the
// lab role's privileges, the loader's sha256 and row counts against the manifest, pg-role-smoke, A2's learn_spatial
// canary (read as libpq's default role, which owns it) and the learn_ roles and schemas left behind. An abort (the
// CLI's SIGINT/SIGTERM) cancels the running psql; every exit releases the lock, ends the connections and removes the
// temp loader. Tests: learn/check.test.ts (LC6 pure), learn-check.dbtest.ts (LC1–LC10).
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type postgres from "postgres";
import { childEnv, LAB_LOCK, LAB_SCHEMA, libpqTarget, LIVE_DATABASE, pgConnect, psqlArgs, type PgTarget } from "./pg.ts";

/** A2's schema: only the canary reads it. */
export const CANARY_SCHEMA = "learn_spatial";
const LOADER = "postgis/learn_curriculum.sql";
const CANARY_SQL = new URL("../../db/learn/canary.sql", import.meta.url);
const SMOKE_SQL = new URL("../../site/learn/sql/pg-role-smoke.sql", import.meta.url);
const SETUP = "run pnpm learn:check --setup as the superuser";

export interface CheckOptions {
  /** The built site (default dist); learn:check reads its manifest and loader only. */
  dist: string;
  /** learn_spatial, or a learn_t_ fixture in tests (LC7). */
  canarySchema: string;
  /** Aborting cancels the running psql (SIGINT: psql cancels its statement) and stops the run; the reason is thrown. */
  signal?: AbortSignal;
}

/** Throws when the connection reached the live database, whatever name it asked for (LC2). */
export function assertConnectedNotLive(current: string): void {
  if (current === LIVE_DATABASE) throw new Error(`refusing database ${LIVE_DATABASE} (current_database()): it's the live build's database; labs use critwire_dev`);
}

function assertCanarySchema(schema: string): string {
  if (schema !== CANARY_SCHEMA && !/^learn_t_[a-z0-9_]+$/.test(schema)) {
    throw new Error(`canary schema ${schema}: ${CANARY_SCHEMA} or a learn_t_ test fixture only`);
  }
  return schema;
}

const OCCURRENCES_COPY = /^COPY occurrences \(id, .*\) FROM stdin \(FORMAT csv\);$/;

/** The loader with its first occurrences row repeated before that COPY's `\.`, and the row's id (plan D10 check 9). */
export function forcedFailureLoader(loader: string): { loader: string; id: string } {
  const lines = loader.split("\n");
  const sites = lines.flatMap((l, i) => (OCCURRENCES_COPY.test(l) ? [i] : []));
  const changed = (why: string) => new Error(`loader layout changed: ${why}; the forced failure needs exactly one \`COPY occurrences (id, …) FROM stdin (FORMAT csv);\` with rows and its \\.`);
  if (sites.length !== 1) throw changed(`${sites.length} occurrences COPY lines`);
  const first = sites[0]! + 1;
  const end = lines.indexOf("\\.", first);
  if (end === -1) throw changed("the occurrences COPY has no \\.");
  if (end === first) throw changed("the occurrences COPY has no rows");
  const id = /^([^,"]+),/.exec(lines[first]!)?.[1];
  if (!id) throw changed("the first occurrences row has no plain id");
  return { loader: [...lines.slice(0, end), lines[first]!, ...lines.slice(end)].join("\n"), id };
}

interface Psql { code: number | null; stdout: string; stderr: string }

// psql over `args` with exactly childEnv's environment; resolves with its exit code and output. An abort sends psql
// SIGINT (it cancels its statement, so the server rolls back) and rejects with the reason once psql has exited.
function psql(target: PgTarget, args: string[], signal?: AbortSignal): Promise<Psql> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    const child = spawn("psql", args, { env: childEnv(target), stdio: ["ignore", "pipe", "pipe"] });
    const cancel = () => child.kill("SIGINT");
    signal?.addEventListener("abort", cancel, { once: true });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => {
      signal?.removeEventListener("abort", cancel);
      if (signal?.aborted) reject(signal.reason);
      else resolve({ code, stdout, stderr });
    });
  });
}

async function psqlOk(target: PgTarget, args: string[], what: string, signal?: AbortSignal): Promise<string> {
  const r = await psql(target, args, signal);
  if (r.code !== 0) throw new Error(`${what}: psql exit ${r.code}: ${r.stderr.trim()}`);
  return r.stdout;
}

// db/learn/canary.sql's reading of `schema`: table name → `rows|md5`, plus `tables:` (the table list).
async function readTables(admin: PgTarget, schema: string, signal?: AbortSignal): Promise<Map<string, string>> {
  const out = await psqlOk(admin, ["-q", "-At", "-v", `schema=${schema}`, ...psqlArgs(CANARY_SQL.pathname)], `reading ${schema}`, signal);
  return new Map(out.trimEnd().split("\n").map((l) => (l.startsWith("tables: ") ? ["tables:", l.slice(8)] : [l.slice(0, l.indexOf("|")), l.slice(l.indexOf("|") + 1)])));
}

function tablesDiff(schema: string, before: Map<string, string>, after: Map<string, string>): string[] {
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

// Every learn_ role and schema but the lab's and A2's, as `role <name>` / `schema <name>`.
async function learnObjects(sql: postgres.Sql): Promise<string[]> {
  const rows = await sql<{ name: string }[]>`select 'role ' || rolname as name from pg_roles where rolname like 'learn\_%'
    union all select 'schema ' || nspname from pg_namespace
      where nspname like 'learn\_%' and nspname not in (${LAB_SCHEMA}, ${CANARY_SCHEMA}) order by 1`;
  return rows.map((r) => r.name);
}

// Every table in the lab schema with its row count, by name.
async function labCounts(sql: postgres.Sql): Promise<Record<string, number>> {
  const tables = await sql<{ name: string }[]>`select c.relname as name from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = ${LAB_SCHEMA} and c.relkind in ('r', 'p') order by 1`;
  const counts: Record<string, number> = {};
  for (const { name } of tables) {
    const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from ${sql(LAB_SCHEMA)}.${sql(name)}`;
    counts[name] = n;
  }
  return counts;
}

// Throws naming each table whose count differs from the manifest's (missing and extra tables included).
function assertCounts(load: string, got: Record<string, number>, want: Record<string, number>): void {
  const names = [...new Set([...Object.keys(got), ...Object.keys(want)])].sort();
  const diffs = names.filter((t) => got[t] !== want[t]).map((t) => `${t}: ${got[t] ?? "missing"}, manifest ${want[t] ?? "none"}`);
  if (diffs.length) throw new Error(`${load}: row counts differ from the manifest's tables:\n  ${diffs.join("\n  ")}`);
}

interface LoaderEntry { sha256: string; tables: Record<string, number> }

async function readLoader(dist: string): Promise<{ file: string; text: string; entry: LoaderEntry }> {
  const base = join(dist, "learn/data");
  const manifest = JSON.parse(await readFile(join(base, "manifest.json"), "utf8")) as { files: Record<string, Partial<LoaderEntry>> };
  const entry = manifest.files[LOADER];
  if (!entry?.sha256 || !entry.tables) throw new Error(`${base}/manifest.json has no ${LOADER} with sha256 and tables: run pnpm build`);
  const file = join(base, LOADER);
  const bytes = await readFile(file);
  const sha = createHash("sha256").update(bytes).digest("hex");
  if (sha !== entry.sha256) throw new Error(`${file}: sha256 ${sha} isn't the manifest's ${entry.sha256}: run pnpm build`);
  return { file, text: bytes.toString("utf8"), entry: entry as LoaderEntry };
}

/** Runs the loader stage against `lab` (labTarget, already refused by name); throws at the first failed check. */
export async function checkLab(lab: PgTarget, { dist, canarySchema, signal }: CheckOptions): Promise<void> {
  assertCanarySchema(canarySchema);
  const sql = pgConnect(lab);
  const lock = pgConnect(lab);
  let locked = false;
  let tmp: string | undefined;
  try {
    const [who] = await sql<{ db: string; user: string; createrole: boolean; selfGrant: string }[]>`select current_database() as db,
      current_user as user, (select rolcreaterole from pg_roles where rolname = current_user) as createrole,
      current_setting('createrole_self_grant') as "selfGrant"`;
    assertConnectedNotLive(who.db);
    if (!who.createrole) throw new Error(`${who.user} has no CREATEROLE (the role labs need it): ${SETUP}`);
    const grants = who.selfGrant.split(",").map((s) => s.trim());
    if (!grants.includes("set") || !grants.includes("inherit")) {
      throw new Error(`${who.user}'s createrole_self_grant is '${who.selfGrant}', not 'set, inherit': ${SETUP}`);
    }
    [{ locked }] = await lock<{ locked: boolean }[]>`select pg_try_advisory_lock(hashtext(${LAB_LOCK})) as locked`;
    if (!locked) throw new Error(`the lab lock (${LAB_LOCK}) is held by another learn:check or pnpm test:db on ${who.db}: wait for it`);
    console.log(`learn:check: ${who.user} on ${who.db}, lab lock taken`);

    const admin = libpqTarget({ PGDATABASE: who.db, PGPORT: String(lab.port) });
    const [{ has }] = await sql<{ has: boolean }[]>`select to_regnamespace(${canarySchema}) is not null as has`;
    const canaryBefore = has ? await readTables(admin, canarySchema, signal) : undefined;
    const objectsBefore = await learnObjects(sql);

    const { file, text, entry } = await readLoader(dist);
    const forced = forcedFailureLoader(text);
    tmp = await mkdtemp(join(tmpdir(), "critwire-learn-check-"));
    const forcedFile = join(tmp, "forced-failure.sql");
    await writeFile(forcedFile, forced.loader);
    const tables = Object.keys(entry.tables).length;
    for (const load of ["load 1", "load 2"]) {
      await psqlOk(lab, ["-q", ...psqlArgs(file)], `${load} (${file})`, signal);
      assertCounts(load, await labCounts(sql), entry.tables);
      console.log(`learn:check: ${load}: ${tables} tables = manifest`);
    }

    const loaded = await readTables(admin, LAB_SCHEMA, signal);
    const failed = await psql(lab, ["-q", ...psqlArgs(forcedFile)], signal);
    if (failed.code === 0) throw new Error(`forced failure: the load with a duplicate occurrences id ${forced.id} exited 0`);
    if (!failed.stderr.includes(`Key (id)=(${forced.id})`)) {
      const errors = failed.stderr.split("\n").filter((l) => l.includes("ERROR:")).join("\n  ");
      throw new Error(`forced failure: psql exit ${failed.code}, not at the duplicate key id=${forced.id}:\n  ${errors}`);
    }
    const kept = tablesDiff(LAB_SCHEMA, loaded, await readTables(admin, LAB_SCHEMA, signal));
    if (kept.length) throw new Error(`forced failure: the failed load changed ${LAB_SCHEMA}:\n  ${kept.join("\n  ")}`);
    console.log(`learn:check: forced failure: psql exit ${failed.code} at the duplicate key id=${forced.id}, ${tables} tables unchanged`);

    const smoke = (await psqlOk(lab, ["-q", "-At", ...psqlArgs(SMOKE_SQL.pathname)], "pg-role-smoke", signal)).trimEnd().split("\n").at(-1);
    if (smoke !== "0") throw new Error(`pg-role-smoke: its last SELECT gave ${smoke}, not 0`);
    console.log("learn:check: pg-role-smoke: 0 left");

    if (canaryBefore) {
      const diff = tablesDiff(canarySchema, canaryBefore, await readTables(admin, canarySchema, signal));
      if (diff.length) throw new Error(`canary: the run changed ${canarySchema}:\n  ${diff.join("\n  ")}`);
      console.log(`learn:check: canary: ${canarySchema} unchanged`);
    } else console.log(`learn:check: canary: no schema ${canarySchema} here, skipped`);

    const before = new Set(objectsBefore);
    const left = (await learnObjects(sql)).filter((o) => !before.has(o));
    if (left.length) throw new Error(`the run left behind:\n  ${left.join("\n  ")}`);
    console.log("learn:check: leak check: nothing left");
    signal?.throwIfAborted();
  } finally {
    if (tmp) await rm(tmp, { recursive: true, force: true });
    if (locked) await lock`select pg_advisory_unlock(hashtext(${LAB_LOCK}))`;
    await Promise.all([sql.end(), lock.end()]);
  }
}
