// /v1's Parquet and CSV (plan §4), written by DuckDB from a JSON array through one typed view: the species tables here,
// and the same writer for every other /v1 table.
import { type Columns, csvSelect, readJsonColumns, RECORD_COLUMNS } from "./columns.ts";
import { sqlPath, withOfflineDuckDb } from "./duckdb.ts";

// Writes <outDir>/<name>.parquet (mirrors the JSON, nested) and <outDir>/<name>.csv (flat leaves, snake_case), sorted by orderBy.
export async function writeParquetCsv(name: string, jsonFile: URL, columns: Columns, orderBy: string, outDir: URL): Promise<void> {
  await withOfflineDuckDb(async (con) => {
    await con.run(`CREATE TEMP VIEW t AS SELECT * FROM read_json(${sqlPath(jsonFile)}, format='array', columns=${readJsonColumns(columns)})`);
    await con.run(`COPY (SELECT * FROM t ORDER BY ${orderBy}) TO ${sqlPath(new URL(`${name}.parquet`, outDir))} (FORMAT parquet, COMPRESSION snappy, ROW_GROUP_SIZE 100000)`);
    await con.run(`COPY (SELECT ${csvSelect(columns).join(", ")} FROM t ORDER BY ${orderBy}) TO ${sqlPath(new URL(`${name}.csv`, outDir))} (FORMAT csv, HEADER)`);
  });
}

// Writes <outDir>/species.parquet (nested, mirrors the JSON record) and <outDir>/species.csv (flat, no sources).
export async function writeTables(speciesFile: URL, outDir: URL): Promise<void> {
  await writeParquetCsv("species", speciesFile, RECORD_COLUMNS, "id", outDir);
}
