// pnpm learn:check (plan D3; L1's D10 checks 1–11 and Cleanup), in stages:
// - static (staticStage, before connecting): the committed course read and linted (course-files.ts); its blocks in
//   page order, or the course's boot blocks and then one page's (--module, blocksToRun). Then, under the lab lock, as
//   the lab role:
// - connect: the live database refused twice, the lab role's privileges (CREATEROLE, set and inherit; no superuser, no
//   CREATE on public), the lock, the versions (SC6), A2's
//   learn_spatial canary (read as libpq's default role, which owns it) and the learn_ objects already there;
// - loader: the published loader run twice as a learner runs it (psql -X -v ON_ERROR_STOP=1 -f), its sha256 and row
//   counts against the manifest, then once with a duplicate occurrences id, which must fail and change nothing (the
//   load is one transaction); then the leak check, so a leaking loader is named before any block runs;
// - blocks: the given PostGIS blocks (pg-role-smoke among them), in page order, in one runner session (runner.ts), each
//   in the runner's transaction, checked against their recorded results or, with `update`, written; `-- tx: own`
//   blocks must leave the canary and learn_curriculum unchanged. Once the boot blocks committed, the lab ERD
//   (site/learn/erd/lab.mmd, with its lab-made and planned lists) must match learn_curriculum's catalog both ways;
// - downloads: each assembled lab file (assemble.ts) on a fresh load, as a learner runs it (the loader, then psql -X -f,
//   no ON_ERROR_STOP): psql's ERROR lines must be exactly the file's announced errors, in order; then the leak check;
// - end: the canary unchanged and no learn_ role or schema left behind;
// - stamp (a whole-course run only): checked.json (freshness.ts) written through a temp file and a rename, once every
//   stage passed, and left alone when only its date would change.
// The lock is held by the cleanup connection (cleanup.ts), which runs no block. An abort (the CLI's SIGINT/SIGTERM)
// cancels the running psql or block statement. Every exit then removes the temp loader and releases the lock in
// cleanup.ts's order: stop the run's sessions, sweep the lab role's new objects, free the lock; a cleanup failure is
// added to the run's. Tests: learn/check.test.ts (LC6, BF1 pure), learn-check.dbtest.ts (LC1–LC10, V2, V3, CU1–CU5), runner.dbtest.ts.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import type postgres from "postgres";
import { assembleDownloads, type Announced, type Download } from "./assemble.ts";
import type { Block } from "./blocks.ts";
import { takeLabLock, type LabLock } from "./cleanup.ts";
import type { CoursePage } from "./course.ts";
import { readCourse } from "./course-files.ts";
import { dbMeta, LAB_ERD, markerDrift, markers, parseErd, PG_META_SQL } from "./erd-model.ts";
import { CHECKED_JSON, LOADER, nextStamp, readFreshness, STAMP_FILE, type Versions } from "./freshness.ts";
import { learnObjects } from "./leaks.ts";
import { CANARY_SCHEMA, childEnv, LAB_SCHEMA, libpqTarget, LIVE_DATABASE, pgConnect, psqlArgs, type PgTarget } from "./pg.ts";
import { openSession, runBlocks, serverVersions, tablesDiff, type LabSession } from "./runner.ts";

export { CANARY_SCHEMA };
const CANARY_SQL = new URL("../../db/learn/canary.sql", import.meta.url);
const SETUP = "run pnpm learn:check --setup as the superuser";

export interface CheckOptions {
  /** The built site (default dist); learn:check reads its manifest and loader only. */
  dist: string;
  /** learn_spatial, or a learn_t_ fixture in tests (LC7). */
  canarySchema: string;
  /** Aborting cancels the running psql (SIGINT: psql cancels its statement) and stops the run; the reason is thrown. */
  signal?: AbortSignal;
  /** The course's blocks in page order; the blocks stage runs the ran PostGIS ones. */
  blocks?: readonly Block[];
  /** Write the blocks' recorded results instead of checking them. */
  update?: boolean;
  /** Print each block's rendered result (--module). */
  show?: boolean;
  /** The lab files to run on a fresh load each (assemble.ts). */
  downloads?: readonly Download[];
  /** The whole course: once every stage passed, checked.json is written for it. */
  stamp?: readonly CoursePage[];
  /** lab.mmd's text, checked against learn_curriculum after the boot blocks (the CLI passes the committed one). */
  labErd?: string;
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

/** db/learn/canary.sql's reading of `schema` as `admin`: table name → `rows|md5`, plus `tables:` (the table list). */
export async function readTables(admin: PgTarget, schema: string, signal?: AbortSignal): Promise<Map<string, string>> {
  const out = await psqlOk(admin, ["-q", "-At", "-v", `schema=${schema}`, ...psqlArgs(CANARY_SQL.pathname)], `reading ${schema}`, signal);
  return new Map(out.trimEnd().split("\n").map((l) => (l.startsWith("tables: ") ? ["tables:", l.slice(8)] : [l.slice(0, l.indexOf("|")), l.slice(l.indexOf("|") + 1)])));
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
interface Loader { file: string; text: string; entry: LoaderEntry }

async function readLoader(dist: string): Promise<Loader> {
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

export interface StaticCourse {
  /** Every page, in page order. */
  pages: CoursePage[];
  /** The blocks to run (blocksToRun): every page's, or the boot blocks and one module's. */
  blocks: Block[];
  /** The downloads to run: every page's, or one module's. */
  downloads: Download[];
  /** lab.mmd's text, parsed. */
  labErd: string;
}

/**
 * The blocks a run runs, in order: every page's in page order, or (`module`) the course's ran `-- boot` blocks in page
 * order and then the page's other blocks, so a page reading another page's boot tables runs as in a whole run (004 §0).
 */
export function blocksToRun(pages: readonly CoursePage[], module?: string): Block[] {
  const all = pages.flatMap((p) => p.blocks);
  if (module === undefined) return all;
  const own = pages.filter((p) => p.page.id === module).flatMap((p) => p.blocks);
  const boot = all.filter((b) => b.boot && b.status === "ran");
  return [...boot, ...own.filter((b) => !boot.includes(b))];
}

/**
 * The static stage: the committed course, every block parsed and linted and every download assembled; throws naming
 * every error, so nothing loads. A missing recorded result isn't static: the blocks stage names it, and --update
 * writes it.
 */
export async function staticStage(module?: string): Promise<StaticCourse> {
  const { pages, errors } = await readCourse();
  if (errors.length) throw new Error(`static: ${errors.length} error(s):\n${errors.join("\n")}`);
  const run = module === undefined ? pages : pages.filter((p) => p.page.id === module);
  if (module !== undefined && !run.length) throw new Error(`--module ${module}: no such page (${pages.map((p) => p.page.id).join(", ")})`);
  const downloads = assembleDownloads(pages).filter((d) => module === undefined || d.page === module);
  const labErd = await readFile(new URL(`../../${LAB_ERD}`, import.meta.url), "utf8");
  try {
    parseErd(labErd);
    markers(labErd);
  } catch (e) {
    throw new Error(`static: ${LAB_ERD}: ${(e as Error).message}`);
  }
  console.log(`learn:check: static: ${pages.length} page(s), ${pages.reduce((n, p) => n + p.blocks.length, 0)} block(s) parsed and linted, ${downloads.length} download(s) assembled`);
  return { pages, blocks: blocksToRun(pages, module), downloads, labErd };
}

/** What the stages share: the lab connection, the lock, the admin target (the canary's reader), the canary at connect. */
interface Run {
  sql: postgres.Sql;
  versions: Versions;
  lock: LabLock;
  admin: PgTarget;
  canarySchema: string;
  canaryBefore?: Map<string, string>;
  signal?: AbortSignal;
}

interface Who { db: string; user: string }

// The lab role's checks; returns the database and role it reached. A superuser, or CREATE on public, would run the labs
// with more than a learner's privileges and hide a block that needs them (plan L4 D7, MF5).
async function assertLabRole(sql: postgres.Sql): Promise<Who> {
  const [who] = await sql<{ db: string; user: string; superuser: boolean; createPublic: boolean; createrole: boolean; selfGrant: string }[]>`select
    current_database() as db, current_user as user, (select rolsuper from pg_roles where rolname = current_user) as superuser,
    has_schema_privilege('public', 'CREATE') as "createPublic", (select rolcreaterole from pg_roles where rolname = current_user) as createrole,
    current_setting('createrole_self_grant') as "selfGrant"`;
  assertConnectedNotLive(who.db);
  const learner = `the labs run with a learner's privileges: ${SETUP}`;
  if (who.superuser) throw new Error(`${who.user} is a superuser: ${learner}`);
  if (who.createPublic) throw new Error(`${who.user} has CREATE on schema public: ${learner}`);
  if (!who.createrole) throw new Error(`${who.user} has no CREATEROLE (the role labs need it): ${SETUP}`);
  const grants = who.selfGrant.split(",").map((s) => s.trim());
  if (!grants.includes("set") || !grants.includes("inherit")) {
    throw new Error(`${who.user}'s createrole_self_grant is '${who.selfGrant}', not 'set, inherit': ${SETUP}`);
  }
  return { db: who.db, user: who.user };
}

// The versions (SC6), and the canary's reading at connect (the lock read the learn_ objects already there).
async function connectStage(lab: PgTarget, sql: postgres.Sql, lock: LabLock, { db, user }: Who, canarySchema: string, signal?: AbortSignal): Promise<Run> {
  console.log(`learn:check: ${user} on ${db}, lab lock taken`);
  const versions = await serverVersions(sql);
  console.log(`learn:check: PostgreSQL ${versions.postgresql}, PostGIS ${versions.postgis}, GEOS ${versions.geos}, GDAL ${versions.gdal}`);
  const admin = libpqTarget({ PGDATABASE: db, PGPORT: String(lab.port) });
  const [{ has }] = await sql<{ has: boolean }[]>`select to_regnamespace(${canarySchema}) is not null as has`;
  const canaryBefore = has ? await readTables(admin, canarySchema, signal) : undefined;
  return { sql, versions, lock, admin, canarySchema, canaryBefore, signal };
}

// The loader twice to the manifest's counts, then the forced failure. `tmp`: a folder for the forced loader.
async function loaderStage(lab: PgTarget, run: Run, { file, text, entry }: Loader, tmp: string): Promise<void> {
  const { sql, admin, signal } = run;
  const forced = forcedFailureLoader(text);
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
  await assertNoLeaks(run, "the loader");
}

// lab.mmd against the session schema's catalog (learn_curriculum, pg-session's search_path), both ways; throws
// naming every difference.
async function assertLabErd(s: LabSession, text: string): Promise<void> {
  const meta = dbMeta(await Promise.all(PG_META_SQL.map(async (q) => ({ columns: [], rows: await s.sql.unsafe(q).values() }))));
  const drift = markerDrift(parseErd(text), meta, markers(text));
  if (drift.length) throw new Error(`lab ERD: ${LAB_ERD} differs from ${LAB_SCHEMA}:\n  ${drift.join("\n  ")}`);
  console.log(`learn:check: lab ERD: ${LAB_ERD} = ${LAB_SCHEMA} (${meta.tables.length} tables)`);
}

// The ran PostGIS blocks, in page order, in one runner session (recorded with the lock); checked against
// checked/<id>.txt, or written. `-- tx: own` and `-- sessions:` blocks are watched against the canary (where it exists)
// and learn_curriculum; a sessions block's windows are sessions of their own, recorded with the lock too.
// `labErd`: checked once the boot blocks committed.
async function blocksStage(lab: PgTarget, run: Run, blocks: readonly Block[], update: boolean, show: boolean, labErd?: string): Promise<void> {
  const { admin, canarySchema, canaryBefore, lock, signal } = run;
  const pg = blocks.filter((b) => b.engine === "postgis" && b.status === "ran");
  const watch = { schemas: [...(canaryBefore ? [canarySchema] : []), LAB_SCHEMA], read: (schema: string) => readTables(admin, schema, signal) };
  const session = await openSession(lab, signal);
  lock.record(session.pid);
  const open = async () => {
    const window = await openSession(lab, signal);
    lock.record(window.pid);
    return window;
  };
  try {
    const afterBoot = labErd === undefined ? undefined : () => assertLabErd(session, labErd);
    await runBlocks(session, pg, { update, show, known: new Set(lock.known), watch, afterBoot, open });
  } finally {
    await session.end();
  }
  signal?.throwIfAborted();
  console.log(`learn:check: blocks: ${pg.length} PostGIS block(s) ${update ? "run twice, results written" : "equal their recorded results"}`);
}

const ERROR_LINE = /^psql:.*?:\d+: ERROR: /;

/**
 * Why psql's stderr breaks the ERROR-line rule for download `name` (004 §7.6): its ERROR lines must be exactly the
 * `announced` errors, in order, each containing its text. The first difference, or undefined.
 */
export function errorLinesFailure(name: string, stderr: string, announced: readonly Announced[]): string | undefined {
  const lines = stderr.split("\n").filter((l) => ERROR_LINE.test(l));
  for (let i = 0; i < Math.max(lines.length, announced.length); i++) {
    const [line, want] = [lines[i], announced[i]];
    if (want === undefined) return `download ${name}: ERROR line ${i + 1} isn't announced: ${line}`;
    if (line === undefined) return `download ${name}: ${want.block}'s announced error "${want.text}" didn't happen (${lines.length} ERROR lines)`;
    if (!line.includes(want.text)) return `download ${name}: ERROR line ${i + 1} isn't ${want.block}'s announced "${want.text}": ${line}`;
  }
  return undefined;
}

/** Runs `file` as a learner runs download `name` (psql -X -f, no ON_ERROR_STOP); throws when psql fails or its ERROR lines break the rule. */
export async function assertDownloadRun(target: PgTarget, file: string, { name, announced }: Pick<Download, "name" | "announced">, signal?: AbortSignal): Promise<void> {
  const r = await psql(target, ["-X", "-q", "-f", file], signal);
  if (r.code !== 0) throw new Error(`download ${name}: psql exit ${r.code}: ${r.stderr.trim()}`);
  const failure = errorLinesFailure(name, r.stderr, announced);
  if (failure) throw new Error(failure);
}

// Each download on a fresh load (the loader, then the file), then the leak check. `tmp`: a folder for the files.
async function downloadsStage(lab: PgTarget, run: Run, loader: Loader, downloads: readonly Download[], tmp: string): Promise<void> {
  for (const d of downloads) {
    await psqlOk(lab, ["-q", ...psqlArgs(loader.file)], `download ${d.name}: the fresh load`, run.signal);
    const file = join(tmp, d.name);
    await writeFile(file, d.text);
    await assertDownloadRun(lab, file, d, run.signal);
    console.log(`learn:check: download ${d.name}: fresh load, then the file: ${d.announced.length} ERROR line(s), as announced`);
    await assertNoLeaks(run, `download ${d.name}`);
  }
}

// checked.json for `pages`, through a temp file and a rename; untouched when only its date would change.
async function writeStamp(dist: string, pages: readonly CoursePage[], versions: Versions): Promise<void> {
  const file = fileURLToPath(STAMP_FILE);
  let old: string | null = null;
  try {
    old = await readFile(file, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
  const text = nextStamp(old, readFreshness(dist, pages), versions, new Date().toISOString().slice(0, 10));
  if (text === undefined) {
    console.log(`learn:check: unchanged: ${CHECKED_JSON}`);
    return;
  }
  const tmp = `${file}.tmp-${process.pid}`;
  await writeFile(tmp, text);
  await rename(tmp, file);
  console.log(`learn:check: wrote ${CHECKED_JSON}`);
}

// Throws naming each learn_ object `who` made: any not there at connect.
async function assertNoLeaks({ sql, lock }: Run, who: string): Promise<void> {
  const left = (await learnObjects(sql)).filter((o) => !lock.known.has(o));
  if (left.length) throw new Error(`${who} left behind:\n  ${left.join("\n  ")}`);
  console.log(`learn:check: leak check (${who}): nothing left`);
}

// The canary as at connect, and no learn_ object the run made.
async function endStage(run: Run): Promise<void> {
  const { admin, canarySchema, canaryBefore, signal } = run;
  if (canaryBefore) {
    const diff = tablesDiff(canarySchema, canaryBefore, await readTables(admin, canarySchema, signal));
    if (diff.length) throw new Error(`canary: the run changed ${canarySchema}:\n  ${diff.join("\n  ")}`);
    console.log(`learn:check: canary: ${canarySchema} unchanged`);
  } else console.log(`learn:check: canary: no schema ${canarySchema} here, skipped`);

  await assertNoLeaks(run, "the run");
  signal?.throwIfAborted();
}

/**
 * Runs learn:check's stages against `lab` (labTarget, already refused by name); throws at the first failed check, with
 * any cleanup failure added.
 */
export async function checkLab(lab: PgTarget, { dist, canarySchema, signal, blocks = [], update = false, show = false, downloads = [], stamp, labErd }: CheckOptions): Promise<void> {
  assertCanarySchema(canarySchema);
  const sql = pgConnect(lab);
  let lock: LabLock | undefined;
  let tmp: string | undefined;
  let failure: Error | undefined;
  try {
    const who = await assertLabRole(sql);
    lock = await takeLabLock(lab, who.db);
    const run = await connectStage(lab, sql, lock, who, canarySchema, signal);
    tmp = await mkdtemp(join(tmpdir(), "critwire-learn-check-"));
    const loader = await readLoader(dist);
    await loaderStage(lab, run, loader, tmp);
    await blocksStage(lab, run, blocks, update, show, labErd);
    await downloadsStage(lab, run, loader, downloads, tmp);
    await endStage(run);
    if (stamp) await writeStamp(dist, stamp, run.versions);
  } catch (e) {
    failure = e as Error;
  }
  try {
    if (tmp) await rm(tmp, { recursive: true, force: true });
    await lock?.release();
  } catch (e) {
    failure = failure ? new Error(`${failure.message}\n${(e as Error).message}`) : (e as Error);
  } finally {
    await sql.end();
  }
  if (failure) throw failure;
}
