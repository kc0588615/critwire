// species.parquet and species.csv (plan §4), written by DuckDB from data/species.json through one typed view.
// Extension autoload and autoinstall are off, so any extension use fails instead of reaching for the network, and
// threads=1 plus fixed writer options keep the bytes identical across builds.
import { DuckDBInstance } from "@duckdb/node-api";
import { fileURLToPath } from "node:url";
import { csvSelect, readJsonColumns } from "./columns.ts";

const text = (value: string) => `'${value.replaceAll("'", "''")}'`;

// Writes <outDir>/species.parquet (nested, mirrors the JSON record) and <outDir>/species.csv (flat, no sources).
export async function writeTables(speciesFile: URL, outDir: URL): Promise<void> {
  const out = (name: string) => text(fileURLToPath(new URL(name, outDir)));
  const db = await DuckDBInstance.create(":memory:", {
    threads: "1",
    autoinstall_known_extensions: "false",
    autoload_known_extensions: "false",
  });
  const con = await db.connect();
  try {
    await con.run(`CREATE TEMP VIEW species AS SELECT * FROM read_json(${text(fileURLToPath(speciesFile))}, format='array', columns=${readJsonColumns()})`);
    await con.run(`COPY (SELECT * FROM species ORDER BY id) TO ${out("species.parquet")} (FORMAT parquet, COMPRESSION snappy, ROW_GROUP_SIZE 100000)`);
    await con.run(`COPY (SELECT ${csvSelect().join(", ")} FROM species ORDER BY id) TO ${out("species.csv")} (FORMAT csv, HEADER)`);
  } finally {
    con.closeSync();
    db.closeSync();
  }
}
