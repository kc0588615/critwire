// pnpm learn:check, the loader stage (plan D10 checks 1–8, 10, 11): the published loader, run twice as a learner runs it
// (psql -X -v ON_ERROR_STOP=1 -f), as the lab role, under the lab lock. Around it: the live database refused twice, the
// lab role's privileges, the loader's sha256 and row counts against the manifest, pg-role-smoke, A2's learn_spatial
// canary (read as libpq's default role, which owns it) and the learn_ roles and schemas left behind.
// Tests: learn-check.dbtest.ts (LC1–LC5, LC7, LC8, LC10).
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
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

interface Psql { code: number | null; stdout: string; stderr: string }

// psql over `args` with exactly childEnv's environment; resolves with its exit code and output.
function psql(target: PgTarget, args: string[]): Promise<Psql> {
  return new Promise((resolve, reject) => {
    const child = spawn("psql", args, { env: childEnv(target), stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("error", reject);
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

async function psqlOk(target: PgTarget, args: string[], what: string): Promise<string> {
  const r = await psql(target, args);
  if (r.code !== 0) throw new Error(`${what}: psql exit ${r.code}: ${r.stderr.trim()}`);
  return r.stdout;
}

// The canary's reading as name → `rows|md5`, plus `tables:` (the table list).
async function readCanary(admin: PgTarget, schema: string): Promise<Map<string, string>> {
  const out = await psqlOk(admin, ["-q", "-At", "-v", `schema=${schema}`, ...psqlArgs(CANARY_SQL.pathname)], `canary on ${schema}`);
  return new Map(out.trimEnd().split("\n").map((l) => (l.startsWith("tables: ") ? ["tables:", l.slice(8)] : [l.slice(0, l.indexOf("|")), l.slice(l.indexOf("|") + 1)])));
}

function canaryDiff(schema: string, before: Map<string, string>, after: Map<string, string>): string[] {
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

async function readLoader(dist: string): Promise<{ file: string; entry: LoaderEntry }> {
  const base = join(dist, "learn/data");
  const manifest = JSON.parse(await readFile(join(base, "manifest.json"), "utf8")) as { files: Record<string, Partial<LoaderEntry>> };
  const entry = manifest.files[LOADER];
  if (!entry?.sha256 || !entry.tables) throw new Error(`${base}/manifest.json has no ${LOADER} with sha256 and tables: run pnpm build`);
  const file = join(base, LOADER);
  const sha = createHash("sha256").update(await readFile(file)).digest("hex");
  if (sha !== entry.sha256) throw new Error(`${file}: sha256 ${sha} isn't the manifest's ${entry.sha256}: run pnpm build`);
  return { file, entry: entry as LoaderEntry };
}

/** Runs the loader stage against `lab` (labTarget, already refused by name); throws at the first failed check. */
export async function checkLab(lab: PgTarget, { dist, canarySchema }: CheckOptions): Promise<void> {
  assertCanarySchema(canarySchema);
  const sql = pgConnect(lab);
  const lock = pgConnect(lab);
  let locked = false;
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
    const canaryBefore = has ? await readCanary(admin, canarySchema) : undefined;
    const objectsBefore = await learnObjects(sql);

    const { file, entry } = await readLoader(dist);
    for (const load of ["load 1", "load 2"]) {
      await psqlOk(lab, ["-q", ...psqlArgs(file)], `${load} (${file})`);
      assertCounts(load, await labCounts(sql), entry.tables);
      console.log(`learn:check: ${load}: ${Object.keys(entry.tables).length} tables = manifest`);
    }

    const smoke = (await psqlOk(lab, ["-q", "-At", ...psqlArgs(SMOKE_SQL.pathname)], "pg-role-smoke")).trimEnd().split("\n").at(-1);
    if (smoke !== "0") throw new Error(`pg-role-smoke: its last SELECT gave ${smoke}, not 0`);
    console.log("learn:check: pg-role-smoke: 0 left");

    if (canaryBefore) {
      const diff = canaryDiff(canarySchema, canaryBefore, await readCanary(admin, canarySchema));
      if (diff.length) throw new Error(`canary: the run changed ${canarySchema}:\n  ${diff.join("\n  ")}`);
      console.log(`learn:check: canary: ${canarySchema} unchanged`);
    } else console.log(`learn:check: canary: no schema ${canarySchema} here, skipped`);

    const before = new Set(objectsBefore);
    const left = (await learnObjects(sql)).filter((o) => !before.has(o));
    if (left.length) throw new Error(`the run left behind:\n  ${left.join("\n  ")}`);
    console.log("learn:check: leak check: nothing left");
  } finally {
    if (locked) await lock`select pg_advisory_unlock(hashtext(${LAB_LOCK}))`;
    await Promise.all([sql.end(), lock.end()]);
  }
}
