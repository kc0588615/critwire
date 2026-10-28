// The star's files and their checks (plan D9; port of the spike's scripts/star.ts): one module for the build's star
// (build/learn/star.ts) and the E2E (learn-data), so both read and judge the files the same way.
// - readCsv: a CSV as DuckDB's read_csv(all_varchar) sees it (empty field = NULL; `NA` stays text: ST2).
// - checkInput: one `star/<file>.csv` against star/manifest.json: file, sha256, bytes, UTF-8, header, rows, primary key,
//   foreign keys (PB2–PB7; a NULL foreign key fails too, because the star maps unknowns to members: ST3).
// - unknownMemberErrors (ST3), schemaQualified (ST5).
// Queries only. Tests: star-check.test.ts.
import { DuckDBInstance } from "@duckdb/node-api";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Credit } from "../build/learn/credits.ts";
import { codeOnly } from "../build/learn/sql.ts";
import { sqlText } from "../build/duckdb.ts";
import { STAR_INPUT } from "./blocks.ts";

/** At most this many errors of one kind per file, so one broken column doesn't flood the log. */
const MAX_ERRORS = 5;

export interface StarColumn {
  name: string;
  type: string;
}
export interface StarForeignKey {
  columns: string[];
  references: { file: string; columns: string[] };
}
export interface StarFile {
  table: string;
  columns: StarColumn[];
  primaryKey: string[];
  foreignKeys: StarForeignKey[];
  rows: number;
  bytes: number;
  sha256: string;
  sources: Credit[];
}
/** star/manifest.json: each file by its name in star/. */
export interface StarManifest {
  files: Record<string, StarFile>;
}
export interface CsvTable {
  header: string[];
  rows: (string | null)[][];
}

const sha256 = (data: Buffer) => createHash("sha256").update(data).digest("hex");

/** A CSV file (header line first) as DuckDB reads it with every column VARCHAR; an empty field is NULL, `""` is ''. */
export async function readCsv(path: string): Promise<CsvTable> {
  const db = await DuckDBInstance.create(":memory:", { threads: "1", autoinstall_known_extensions: "false", autoload_known_extensions: "false" });
  const con = await db.connect();
  try {
    const r = await con.runAndReadAll(
      `SELECT * FROM read_csv(${sqlText(path)}, header = false, all_varchar = true, delim = ',', quote = '"', escape = '"', allow_quoted_nulls = false, strict_mode = true)`,
    );
    const [header, ...rows] = r.getRows().map((row) => row.map((v) => (v === null ? null : String(v))));
    if (!header) throw new Error(`${path}: empty`);
    return { header: header.map((h) => h ?? ""), rows };
  } finally {
    con.closeSync();
    db.closeSync();
  }
}

const keyOf = (row: (string | null)[], idx: number[]) => idx.map((i) => row[i]).join("\u0000");
const indexes = (header: string[], columns: string[]) => columns.map((c) => header.indexOf(c));

/** PB4, PB5, ST3: primary key unique and non-null; every foreign key non-null and found in its dimension. */
function keyErrors(file: string, spec: StarFile, table: CsvTable, dims: ReadonlyMap<string, CsvTable>): string[] {
  const errors: string[] = [];
  const capped = (list: string[]) => list.slice(0, MAX_ERRORS).concat(list.length > MAX_ERRORS ? [`${file}: … ${list.length - MAX_ERRORS} more`] : []);
  const pk = indexes(table.header, spec.primaryKey);
  if (pk.some((i) => i < 0)) return [`${file}: primary key (${spec.primaryKey}) not in the header`];
  const nulls: string[] = [];
  const seen = new Map<string, number>();
  table.rows.forEach((row, r) => {
    const nullCol = pk.find((i) => row[i] === null);
    if (nullCol !== undefined) nulls.push(`${file}: row ${r + 1}: primary key column ${table.header[nullCol]} is NULL`);
    else seen.set(keyOf(row, pk), (seen.get(keyOf(row, pk)) ?? 0) + 1);
  });
  errors.push(...capped(nulls));
  const dups = [...seen].filter(([, n]) => n > 1).map(([k, n]) => `${file}: primary key (${spec.primaryKey}) = (${k.split("\u0000")}) on ${n} rows`);
  errors.push(...capped(dups));
  for (const fk of spec.foreignKeys) {
    const dim = dims.get(fk.references.file);
    if (!dim) {
      errors.push(`${file}: foreign key (${fk.columns}) references ${fk.references.file}, which wasn't read`);
      continue;
    }
    const from = indexes(table.header, fk.columns);
    const to = indexes(dim.header, fk.references.columns);
    if (from.some((i) => i < 0) || to.some((i) => i < 0)) {
      errors.push(`${file}: foreign key (${fk.columns}) → ${fk.references.file} (${fk.references.columns}): a column isn't in a header`);
      continue;
    }
    const keys = new Set(dim.rows.map((row) => keyOf(row, to)));
    const bad: string[] = [];
    table.rows.forEach((row, r) => {
      const nullCol = from.find((i) => row[i] === null);
      if (nullCol !== undefined) bad.push(`${file}: row ${r + 1}: foreign key ${table.header[nullCol]} is NULL`);
      else if (!keys.has(keyOf(row, from)))
        bad.push(`${file}: row ${r + 1}: ${fk.columns.map((c, i) => `${c} = ${row[from[i]!]}`).join(", ")} not in ${fk.references.file} (${fk.references.columns})`);
    });
    errors.push(...capped(bad));
  }
  return errors;
}

/** The checks on one file's bytes and shape against its manifest entry (PB3, PB6) and UTF-8; then its table. */
async function fileErrors(dir: string, file: string, spec: StarFile): Promise<{ errors: string[]; table?: CsvTable; sha?: string }> {
  const path = join(dir, file);
  if (!existsSync(path)) return { errors: [`${file}: missing in ${dir}`] };
  const bytes = readFileSync(path);
  const errors: string[] = [];
  const sha = sha256(bytes);
  if (sha !== spec.sha256) errors.push(`${file}: sha256 ${sha.slice(0, 12)}, manifest ${spec.sha256.slice(0, 12)}`);
  if (bytes.length !== spec.bytes) errors.push(`${file}: ${bytes.length} bytes, manifest ${spec.bytes}`);
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { errors: [...errors, `${file}: not UTF-8`] };
  }
  const table = await readCsv(path);
  const want = spec.columns.map((c) => c.name);
  if (table.header.join(",") !== want.join(",")) errors.push(`${file}: header ${table.header}, manifest ${want}`);
  if (table.rows.length !== spec.rows) errors.push(`${file}: ${table.rows.length} rows, manifest ${spec.rows}`);
  return { errors, table, sha };
}

/** `dir`/manifest.json; throws if it's missing. */
export function readManifest(dir: string): StarManifest {
  const path = join(dir, "manifest.json");
  if (!existsSync(path)) throw new Error(`manifest.json: missing in ${dir}`);
  return JSON.parse(readFileSync(path, "utf8")) as StarManifest;
}

/**
 * One Power BI input (`star/<file>.csv`) against the star manifest in `dir` (PB2–PB7), its dimensions read for the
 * foreign keys. No errors gives `line`, the log line for a block id.
 */
export async function checkInput(dir: string, input: string): Promise<{ errors: string[]; line?: (id: string) => string }> {
  if (!STAR_INPUT.test(input)) return { errors: [`${input}: not star/<file>.csv`] };
  const file = input.slice("star/".length);
  let manifest: StarManifest;
  try {
    manifest = readManifest(dir);
  } catch (e) {
    return { errors: [(e as Error).message] };
  }
  const spec = manifest.files[file];
  if (!spec) return { errors: [`${file}: not in the manifest`] };
  const own = await fileErrors(dir, file, spec);
  if (!own.table) return { errors: own.errors };
  const dims = new Map<string, CsvTable>();
  for (const ref of new Set(spec.foreignKeys.map((fk) => fk.references.file))) {
    const dimSpec = manifest.files[ref];
    if (!dimSpec) return { errors: [...own.errors, `${file}: foreign key to ${ref}, which is not in the manifest`] };
    const dim = ref === file ? own : await fileErrors(dir, ref, dimSpec);
    if (!dim.table) return { errors: [...own.errors, ...dim.errors] };
    dims.set(ref, dim.table);
  }
  const errors = [...own.errors, ...keyErrors(file, spec, own.table, dims)];
  if (errors.length) return { errors };
  return { errors, line: (id) => `-- input: ${id} · ${input} rows=${own.table!.rows.length} sha256=${own.sha!.slice(0, 12)} keys=ok` };
}

/** The unknown members facts point at instead of NULL (004 §5.2 d6): file, key column, key. */
export const UNKNOWN_MEMBERS = [
  ["dim_country.csv", "country_code", "ZZ"],
  ["dim_year.csv", "year", "-1"],
] as const;

/** ST3: each dimension that stands in for NULL has its unknown member (`tables`: by file name). */
export function unknownMemberErrors(tables: ReadonlyMap<string, CsvTable>): string[] {
  return UNKNOWN_MEMBERS.flatMap(([file, column, key]) => {
    const t = tables.get(file);
    const i = t?.header.indexOf(column) ?? -1;
    return t && i >= 0 && t.rows.some((r) => r[i] === key) ? [] : [`${file}: no unknown member (${column} = ${key})`];
  });
}

/** ST5: schema names star SQL must not use (it relies on search_path, so one text runs in PostGIS and DuckDB). */
export function schemaQualified(sql: string): string[] {
  return [...codeOnly(sql).matchAll(/(?<![\w.])("?)(learn_curriculum|public|main)\1\s*\./gi)].map((m) => m[0].replace(/\s+/g, ""));
}
