// The star (plan D9, 004 §5.2 d6, §A.3): d6's eight d6-star-* blocks are star.sql, the one definition of the
// Power BI star. learn:check runs them in PostGIS and records each result; writeStar runs the same text in Node DuckDB
// over the published lab tables (withLabTables) and writes /learn/data/star/: one CSV per table, `ORDER BY` its primary
// key, plus star/manifest.json (columns, keys, rows, bytes, sha256, sources).
// Checks: starBlocks (each block on a page, no schema name, CREATE TABLE <table> first, its `-- after:` blocks published
// before it) and inputErrors (every Power BI `// input:` a file this build publishes: star or feed) before anything is
// written; writeStar refuses a dimension without its unknown member and star.mmd drift, and its cross-engine guard
// compares each block's last result in Node DuckDB with checked/<id>.txt, PostGIS's: a plain build refuses a
// difference, --draft warns (D16's loop). Tests: star.test.ts.
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { DuckDBConnection, DuckDBResultReader } from "@duckdb/node-api";
import { formatJson } from "../../json.ts";
import { CHECKED_DIR, type Block } from "../../learn/blocks.ts";
import type { CoursePage } from "../../learn/course.ts";
import { FEED } from "../../learn/feed.ts";
import { markerDrift, markers, parseErd, starMeta } from "../../learn/erd-model.ts";
import { lineDiff, renderResult, type Result } from "../../learn/result.ts";
import { readCsv, schemaQualified, UNKNOWN_MEMBERS, unknownMemberErrors, type CsvTable, type StarManifest } from "../../learn/star-check.ts";
import { sqlPath, sqlText } from "../duckdb.ts";
import { childFile } from "../paths.ts";
import { credits, type CreditContext } from "./credits.ts";
import { ERD_DIR } from "./erd.ts";
import { withLabTables } from "./projection.ts";
import { codeOnly } from "./sql.ts";

export type { StarManifest };

const PREFIX = "d6-star-";
/** The blocks the build publishes, in an order that runs each after the blocks it needs. */
export const STAR_BLOCKS = [
  "d6-star-dim-species", "d6-star-dim-country", "d6-star-dim-dataset", "d6-star-dim-year", "d6-star-fact-records", "d6-star-fact-species-country",
  "d6-star-dim-habitat-class", "d6-star-fact-country-habitat",
] as const;
const tableOf = (id: string) => id.slice(PREFIX.length).replaceAll("-", "_");
/** The files under /learn/data/ the star publishes, manifest aside (Power BI's inputs). */
export const STAR_FILES: readonly string[] = STAR_BLOCKS.map((id) => `star/${tableOf(id)}.csv`);

export interface StarBlock {
  block: Block;
  table: string;
}

/** STAR_BLOCKS from the course's pages, each with its table, and every rule one breaks (query). */
export function starBlocks(pages: readonly CoursePage[]): { blocks: StarBlock[]; errors: string[] } {
  const byId = new Map(pages.flatMap((p) => p.blocks).map((b) => [b.id, b]));
  const blocks: StarBlock[] = [];
  const errors: string[] = [];
  const published = new Set<string>();
  for (const id of STAR_BLOCKS) {
    const block = byId.get(id);
    if (!block) {
      errors.push(`star: block ${id} isn't on a page`);
      continue;
    }
    const table = tableOf(id);
    if (block.engine !== "postgis" || block.status !== "ran") errors.push(`star: ${id} must be a ran PostGIS block (learn:check records its result)`);
    const bad = schemaQualified(block.code);
    if (bad.length) errors.push(`star: ${id} names a schema (${bad.join(", ")}); star.sql relies on search_path`);
    if (!new RegExp(`^\\s*CREATE\\s+TABLE\\s+${table}\\s*\\(`, "i").test(codeOnly(block.statements[0]?.text ?? "")))
      errors.push(`star: ${id}'s first statement must be CREATE TABLE ${table} (`);
    for (const a of block.after) if (!published.has(a)) errors.push(`star: ${id} runs after ${a}, which isn't published before it`);
    published.add(id);
    blocks.push({ block, table });
  }
  return { blocks, errors };
}

/** Every Power BI `// input:` that names a file this build doesn't publish: a star file or c1's feed (query). */
export function inputErrors(pages: readonly CoursePage[]): string[] {
  const published = [...STAR_FILES, FEED.input];
  return pages.flatMap((p) => p.blocks).filter((b) => b.engine === "powerbi").flatMap((b) =>
    b.inputs.filter((i) => !published.includes(i)).map((i) => `q ${b.id}: input ${i} isn't a file this build publishes (${published.join(", ")})`));
}

/** A Node DuckDB result as the recorded results hold it: decimals, dates and other DuckDB values as their text. */
const asResult = (r: DuckDBResultReader): Result => ({
  columns: r.columnNames(),
  rows: r.getRows().map((row) => row.map((v) => (v !== null && typeof v === "object" ? String(v) : v))),
});

/** The cross-engine guard's finding for one block, or undefined when Node DuckDB gives what PostGIS recorded. */
function guardError(id: string, now: string, recorded: string | undefined): string | undefined {
  const file = `${CHECKED_DIR}/${id}.txt`;
  if (recorded === undefined) return `star block ${id}: no recorded PostGIS result (${file}): run pnpm learn:check --update`;
  if (recorded === now) return undefined;
  return `star block ${id}: Node DuckDB gives another result than PostGIS recorded (${file}):\n${lineDiff(recorded, now).join("\n")}`;
}

const rowsOf = async (con: DuckDBConnection, sql: string) => (await con.runAndReadAll(sql)).getRowObjectsJson();

/** One star table's manifest entry, its CSV written to `dir` (`ORDER BY` its primary key). */
async function exportTable(con: DuckDBConnection, dir: URL, table: string, ctx: CreditContext): Promise<StarManifest["files"][string]> {
  const file = `${table}.csv`;
  const columns = (await rowsOf(con, `SELECT column_name, data_type FROM duckdb_columns() WHERE table_name = ${sqlText(table)} ORDER BY column_index`))
    .map((c) => ({ name: String(c.column_name), type: String(c.data_type) }));
  const constraints = await rowsOf(con, `SELECT constraint_type, constraint_column_names, referenced_table, referenced_column_names FROM duckdb_constraints()
    WHERE table_name = ${sqlText(table)} AND constraint_type IN ('PRIMARY KEY', 'FOREIGN KEY') ORDER BY constraint_index`);
  const primaryKey = constraints.find((c) => c.constraint_type === "PRIMARY KEY")?.constraint_column_names as string[] | undefined;
  if (!primaryKey) throw new Error(`star: ${table} has no primary key`);
  const foreignKeys = constraints.filter((c) => c.constraint_type === "FOREIGN KEY").map((c) => ({
    columns: c.constraint_column_names as string[],
    references: { file: `${String(c.referenced_table)}.csv`, columns: c.referenced_column_names as string[] },
  }));
  const path = childFile(dir, file);
  await con.run(`COPY (SELECT * FROM ${table} ORDER BY ${primaryKey.join(", ")}) TO ${sqlPath(path)} (FORMAT csv, HEADER)`);
  const bytes = await readFile(path);
  const [{ n }] = await rowsOf(con, `SELECT count(*)::INTEGER AS n FROM ${table}`) as [{ n: number }];
  return { table, columns, primaryKey, foreignKeys, rows: n, bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex"), sources: credits(`star/${file}`, ctx) };
}

/**
 * Writes <out>/learn/data/star/ (after writeLearnData and the loader, before writeLabIndex): `blocks` run in Node
 * DuckDB over the published lab tables; `recorded`: checked/<id>.txt by id; `starErd`: star.mmd's text. Throws naming
 * every error; with `draft`, only warns about the cross-engine guard.
 */
export async function writeStar(out: URL, { blocks, recorded, starErd, ctx, draft }: {
  blocks: readonly StarBlock[]; recorded: ReadonlyMap<string, string>; starErd: string; ctx: CreditContext; draft: boolean;
}): Promise<void> {
  const dir = new URL("learn/data/star/", out);
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const manifest: StarManifest = { files: {} };
  const guard: string[] = [];
  await withLabTables(out, async (con) => {
    for (const { block } of blocks) {
      let last: DuckDBResultReader | undefined;
      for (const s of block.statements) last = await con.runAndReadAll(s.text);
      const error = guardError(block.id, renderResult(block.id, asResult(last!)), recorded.get(block.id));
      if (error) guard.push(error);
    }
    for (const { table } of blocks) manifest.files[`${table}.csv`] = await exportTable(con, dir, table, ctx);
  });
  await writeFile(childFile(dir, "manifest.json"), formatJson(manifest));

  const tables = new Map<string, CsvTable>();
  for (const [file] of UNKNOWN_MEMBERS) if (manifest.files[file]) tables.set(file, await readCsv(fileURLToPath(childFile(dir, file))));
  const errors = [
    ...unknownMemberErrors(tables),
    ...markerDrift(parseErd(starErd), starMeta(manifest), markers(starErd)).map((e) => `${ERD_DIR}/star.mmd: ${e}`),
    ...(draft ? [] : guard),
  ];
  if (draft) for (const g of guard) console.warn(`build --draft: ${g}`);
  if (errors.length) throw new Error(`star: ${errors.length} error(s):\n${errors.join("\n")}`);
}
