// /learn/data/ (plan D9.3, 004 §4): the lab files. So far: occurrences.{parquet,csv} and datasets.csv, written by
// DuckDB from derive's rows through one typed table each (the types 004 §4.2 publishes), sorted by key, with fixed
// writer options; byte copies of data/learn/'s files, checked against their provenance by readBuildInputs; and the
// PostGIS loader postgis/learn_curriculum.sql, generated from those published files (004 §4.3).
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import type { DuckDBConnection } from "@duckdb/node-api";
import { OCCURRENCE_COLUMNS, type LearnResult, type OccurrenceRow, type SampleDatasetRow } from "../../derive/sample.ts";
import { labDataDir, type LabFile } from "../../learn/lab-files.ts";
import { sqlPath, withOfflineDuckDb } from "../duckdb.ts";
import { childFile } from "../paths.ts";
import { labLoader } from "./loader.ts";

type ColumnType = "BIGINT" | "INTEGER" | "VARCHAR" | "DOUBLE";
const OCCURRENCE_TYPES: Record<(typeof OCCURRENCE_COLUMNS)[number], ColumnType> = {
  id: "BIGINT", species_id: "INTEGER", dataset_key: "VARCHAR", license: "VARCHAR", basis_of_record: "VARCHAR",
  longitude: "DOUBLE", latitude: "DOUBLE", coordinate_uncertainty_m: "DOUBLE", country_code_gbif: "VARCHAR",
  country_code: "VARCHAR", year: "INTEGER", month: "INTEGER",
};
const DATASET_TYPES: Record<keyof SampleDatasetRow, ColumnType> = {
  dataset_key: "VARCHAR", title: "VARCHAR", publisher: "VARCHAR", doi: "VARCHAR", license: "VARCHAR",
};

// Creates table `name` with `types`' columns, in their order, and appends `rows` (null = NULL).
async function createTable<R>(con: DuckDBConnection, name: string, types: Record<keyof R & string, ColumnType>, rows: readonly R[]): Promise<void> {
  const columns = Object.keys(types) as (keyof R & string)[];
  await con.run(`CREATE TABLE ${name} (${columns.map((c) => `${c} ${types[c]}`).join(", ")})`);
  const appender = await con.createAppender(name);
  for (const r of rows) {
    for (const c of columns) {
      const v = r[c];
      if (v === null) appender.appendNull();
      else if (types[c] === "BIGINT") appender.appendBigInt(BigInt(v as number));
      else if (types[c] === "INTEGER") appender.appendInteger(v as number);
      else if (types[c] === "DOUBLE") appender.appendDouble(v as number);
      else appender.appendVarchar(v as string);
    }
    appender.endRow();
  }
  appender.closeSync();
}

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

// Writes /learn/data/ into outDir (created): the sample's files, then byte copies of data/learn/'s files.
export async function writeLearnData(outDir: URL, { learn, files }: { learn: LearnResult; files: readonly LabFile[] }): Promise<void> {
  await mkdir(outDir, { recursive: true });
  await writeOccurrences(learn.occurrences, outDir);
  await writeDatasets(learn.datasets, outDir);
  for (const f of files) await copyFile(childFile(labDataDir, f.name), childFile(outDir, f.name));
}

// Writes <out>/learn/data/postgis/learn_curriculum.sql from <out>'s published files (after writeLearnData).
export async function writeLabLoader(out: URL): Promise<void> {
  const text = await labLoader(out);
  const dir = new URL("learn/data/postgis/", out);
  await mkdir(dir, { recursive: true });
  await writeFile(childFile(dir, "learn_curriculum.sql"), text);
}
