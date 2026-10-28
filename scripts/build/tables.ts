// species.parquet and species.csv (plan §4), written by DuckDB from data/species.json through one typed view.
import { csvSelect, readJsonColumns } from "./columns.ts";
import { sqlPath, withOfflineDuckDb } from "./duckdb.ts";

// Writes <outDir>/species.parquet (nested, mirrors the JSON record) and <outDir>/species.csv (flat, no sources).
export async function writeTables(speciesFile: URL, outDir: URL): Promise<void> {
  await withOfflineDuckDb(async (con) => {
    await con.run(`CREATE TEMP VIEW species AS SELECT * FROM read_json(${sqlPath(speciesFile)}, format='array', columns=${readJsonColumns()})`);
    await con.run(`COPY (SELECT * FROM species ORDER BY id) TO ${sqlPath(new URL("species.parquet", outDir))} (FORMAT parquet, COMPRESSION snappy, ROW_GROUP_SIZE 100000)`);
    await con.run(`COPY (SELECT ${csvSelect().join(", ")} FROM species ORDER BY id) TO ${sqlPath(new URL("species.csv", outDir))} (FORMAT csv, HEADER)`);
  });
}
