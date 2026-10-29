// /learn/data/ (plan D9.3, D9.7–9.9, 004 §4): the lab files. occurrences.{parquet,csv} and datasets.csv, written by
// DuckDB from derive's rows through one typed table each (the types 004 §4.2 publishes), sorted by key, with fixed
// writer options; byte copies of data/learn/'s files, checked against their provenance by readBuildInputs; the
// PostGIS loader postgis/learn_curriculum.sql, generated from those published files (004 §4.3); then manifest.json,
// index.html and the 50 MB cap over the whole folder.
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { formatJson } from "../../json.ts";
import { OCCURRENCE_COLUMNS, type LearnResult, type OccurrenceRow, type SampleDatasetRow } from "../../derive/sample.ts";
import { labDataDir, type LabFile } from "../../learn/lab-files.ts";
import { createTable, sqlPath, withOfflineDuckDb, type ColumnType } from "../duckdb.ts";
import { styleSheet } from "../html.ts";
import { childFile } from "../paths.ts";
import { assertCap, fileSizes, LEARN_CAP, totalBytes } from "./cap.ts";
import { credits, LAB_FILES, type Credit, type CreditContext } from "./credits.ts";
import { labLoader } from "./loader.ts";
import { labPageTemplate, renderLabPage } from "./page.ts";

const LOADER = "postgis/learn_curriculum.sql";

const OCCURRENCE_TYPES: Record<(typeof OCCURRENCE_COLUMNS)[number], ColumnType> = {
  id: "BIGINT", species_id: "INTEGER", dataset_key: "VARCHAR", license: "VARCHAR", basis_of_record: "VARCHAR",
  longitude: "DOUBLE", latitude: "DOUBLE", coordinate_uncertainty_m: "DOUBLE", country_code_gbif: "VARCHAR",
  country_code: "VARCHAR", year: "INTEGER", month: "INTEGER",
};
const DATASET_TYPES: Record<keyof SampleDatasetRow, ColumnType> = {
  dataset_key: "VARCHAR", title: "VARCHAR", publisher: "VARCHAR", doi: "VARCHAR", license: "VARCHAR",
};

// Writes <outDir>/occurrences.parquet (zstd) and <outDir>/occurrences.csv (with a header; NULL is empty).
export async function writeOccurrences(rows: readonly OccurrenceRow[], outDir: URL): Promise<void> {
  await withOfflineDuckDb(async (con) => {
    await createTable(con, "occurrences", OCCURRENCE_TYPES, rows);
    const select = "SELECT * FROM occurrences ORDER BY id";
    await con.run(`COPY (${select}) TO ${sqlPath(childFile(outDir, "occurrences.parquet"))} (FORMAT parquet, COMPRESSION zstd, ROW_GROUP_SIZE 100000)`);
    await con.run(`COPY (${select}) TO ${sqlPath(childFile(outDir, "occurrences.csv"))} (FORMAT csv, HEADER)`);
  });
}

// Writes <outDir>/datasets.csv: the sample's datasets (key, title, publisher, DOI, declared license), sorted by key.
export async function writeDatasets(rows: readonly SampleDatasetRow[], outDir: URL): Promise<void> {
  await withOfflineDuckDb(async (con) => {
    await createTable(con, "datasets", DATASET_TYPES, rows);
    await con.run(`COPY (SELECT * FROM datasets ORDER BY dataset_key) TO ${sqlPath(childFile(outDir, "datasets.csv"))} (FORMAT csv, HEADER)`);
  });
}

// Writes /learn/data/ into outDir (created): the sample's files, then byte copies of data/learn/'s files (subfolders
// created).
export async function writeLearnData(outDir: URL, { learn, files }: { learn: LearnResult; files: readonly LabFile[] }): Promise<void> {
  await mkdir(outDir, { recursive: true });
  await writeOccurrences(learn.occurrences, outDir);
  await writeDatasets(learn.datasets, outDir);
  for (const f of files) {
    const dest = childFile(outDir, f.name);
    await mkdir(new URL(".", dest), { recursive: true }); // clips/cr.tif
    await copyFile(childFile(labDataDir, f.name), dest);
  }
}

// Writes <out>/learn/data/postgis/learn_curriculum.sql from <out>'s published files (after writeLearnData).
export async function writeLabLoader(out: URL): Promise<void> {
  const text = await labLoader(out);
  const dir = new URL("learn/data/", out);
  await mkdir(new URL("postgis/", dir), { recursive: true });
  await writeFile(childFile(dir, LOADER), text);
}

// manifest.json (plan D9.7, 004 §4.5). Keys in this order, no clock, so the same files give the same bytes.
export interface LabManifest {
  cap: number;
  bytes: number; // the files below, together
  // SC2: the /v1 files the lab projection read, and the sample file the DOI deposit holds.
  inputs: { v1: Record<(typeof V1_INPUTS)[number], { bytes: number; sha256: string }>; sample: { file: string; sha256: string; rows: number } };
  dois: { download: string; sample: string | null }; // sample: the derived dataset's, null in a --draft build
  // Every file under /learn/data/ but manifest.json and index.html, sorted. columns and rows for Parquet and CSV;
  // tables (each lab table's rows) for the loader.
  files: Record<string, { columns?: { name: string; type: string }[]; rows?: number; tables?: Record<string, number>; bytes: number; sha256: string; sources: Credit[] }>;
}
const V1_INPUTS = ["species.parquet", "countries.parquet"] as const;
const PAGES = ["manifest.json", "index.html"];

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
async function fileInfo(url: URL): Promise<{ bytes: number; sha256: string }> {
  const bytes = await readFile(url);
  return { bytes: bytes.length, sha256: sha256(bytes) };
}

// The manifest of <out>/learn/data/ as written so far (query). tables: the lab tables' row counts (the projection's).
// Throws for a file LAB_FILES doesn't list, one it lists that isn't there, and any credit failure (ST4).
export async function labManifest(out: URL, { ctx, learn, tables }: { ctx: CreditContext; learn: LearnResult; tables: Record<string, number> }): Promise<LabManifest> {
  const dir = new URL("learn/data/", out);
  const sizes = Object.fromEntries(Object.entries(await fileSizes(dir)).filter(([name]) => !PAGES.includes(name)));
  const missing = Object.keys(LAB_FILES).filter((f) => !Object.hasOwn(sizes, f));
  if (missing.length) throw new Error(`LAB_FILES lists ${missing.join(", ")}, which the build didn't write to dist/learn/data/`);
  const files: LabManifest["files"] = {};
  await withOfflineDuckDb(async (con) => {
    for (const name of Object.keys(sizes)) {
      const sources = credits(name, ctx);
      const path = sqlPath(childFile(dir, name));
      const reader = name.endsWith(".parquet") ? `read_parquet(${path})` : name.endsWith(".csv") ? `read_csv(${path}, header = true, sample_size = -1)` : null;
      const shape: Pick<LabManifest["files"][string], "columns" | "rows" | "tables"> = {};
      if (reader) {
        const columns = (await con.runAndReadAll(`DESCRIBE SELECT * FROM ${reader}`)).getRowObjectsJson();
        shape.columns = columns.map((c) => ({ name: String(c.column_name), type: String(c.column_type) }));
        shape.rows = Number((await con.runAndReadAll(`SELECT count(*) FROM ${reader}`)).getRows()[0]![0]);
      } else if (name === LOADER) shape.tables = tables;
      files[name] = { ...shape, ...await fileInfo(childFile(dir, name)), sources };
    }
  });
  const v1 = new URL("v1/", out);
  const inputs = Object.fromEntries(await Promise.all(V1_INPUTS.map(async (f) => [f, await fileInfo(childFile(v1, f))]))) as LabManifest["inputs"]["v1"];
  const { sample, records, originalDownloadDoi } = learn.contributions;
  return {
    cap: LEARN_CAP,
    bytes: totalBytes(sizes),
    inputs: { v1: inputs, sample: { file: sample.file, sha256: sample.sha256, rows: records } },
    dois: { download: originalDownloadDoi, sample: learn.doi },
    files,
  };
}

// Writes <out>/learn/data/manifest.json and index.html (after writeLearnData and writeLabLoader), then refuses the
// folder above the cap.
export async function writeLabIndex(out: URL, args: { ctx: CreditContext; learn: LearnResult; tables: Record<string, number> }): Promise<void> {
  const dir = new URL("learn/data/", out);
  const manifest = await labManifest(out, args);
  await writeFile(childFile(dir, "manifest.json"), formatJson(manifest));
  const page = renderLabPage(await readFile(labPageTemplate, "utf8"), await readFile(styleSheet, "utf8"), manifest,
    { datasets: args.learn.datasets, counts: args.learn.contributions.datasets });
  await writeFile(childFile(dir, "index.html"), page);
  assertCap("dist/learn/data/", await fileSizes(dir));
}
