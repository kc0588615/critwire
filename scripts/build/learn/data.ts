// /learn/data/ (plan D9.3, 004 §4): the lab files. So far: occurrences.{parquet,csv}, written by DuckDB from derive's
// rows through one typed table (the types 004 §4.2 publishes), sorted by id, with fixed writer options.
import { OCCURRENCE_COLUMNS, type OccurrenceRow } from "../../derive/sample.ts";
import { sqlPath, withOfflineDuckDb } from "../duckdb.ts";

const OCCURRENCE_TYPES: Record<(typeof OCCURRENCE_COLUMNS)[number], "BIGINT" | "INTEGER" | "VARCHAR" | "DOUBLE"> = {
  id: "BIGINT", species_id: "INTEGER", dataset_key: "VARCHAR", license: "VARCHAR", basis_of_record: "VARCHAR",
  longitude: "DOUBLE", latitude: "DOUBLE", coordinate_uncertainty_m: "DOUBLE", country_code_gbif: "VARCHAR",
  country_code: "VARCHAR", year: "INTEGER", month: "INTEGER",
};

// Writes <outDir>/occurrences.parquet (zstd) and <outDir>/occurrences.csv (with a header; NULL is empty).
export async function writeOccurrences(rows: readonly OccurrenceRow[], outDir: URL): Promise<void> {
  await withOfflineDuckDb(async (con) => {
    await con.run(`CREATE TABLE occurrences (${OCCURRENCE_COLUMNS.map((c) => `${c} ${OCCURRENCE_TYPES[c]}`).join(", ")})`);
    const appender = await con.createAppender("occurrences");
    for (const r of rows) {
      for (const c of OCCURRENCE_COLUMNS) {
        const v = r[c];
        if (v === null) appender.appendNull();
        else if (OCCURRENCE_TYPES[c] === "BIGINT") appender.appendBigInt(BigInt(v));
        else if (OCCURRENCE_TYPES[c] === "INTEGER") appender.appendInteger(v as number);
        else if (OCCURRENCE_TYPES[c] === "DOUBLE") appender.appendDouble(v as number);
        else appender.appendVarchar(v as string);
      }
      appender.endRow();
    }
    appender.closeSync();
    const select = "SELECT * FROM occurrences ORDER BY id";
    await con.run(`COPY (${select}) TO ${sqlPath(new URL("occurrences.parquet", outDir))} (FORMAT parquet, COMPRESSION zstd, ROW_GROUP_SIZE 100000)`);
    await con.run(`COPY (${select}) TO ${sqlPath(new URL("occurrences.csv", outDir))} (FORMAT csv, HEADER)`);
  });
}
