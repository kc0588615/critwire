// /v1/countries.{json,parquet,csv} (002 §6, plan D4): the rows of data/countries.json. Parquet and CSV are written by
// DuckDB from the JSON just written, every column VARCHAR (so Namibia's NA stays text), sorted by code, with the
// species tables' writer options.
import { writeFile } from "node:fs/promises";
import { formatJson } from "../json.ts";
import { COUNTRY_COLUMNS, type CountryRow } from "../derive/naturalearth.ts";
import { sqlPath, withOfflineDuckDb } from "./duckdb.ts";

export async function writeCountries(rows: CountryRow[], outDir: URL): Promise<void> {
  const json = new URL("countries.json", outDir);
  await writeFile(json, formatJson(rows));
  const columns = `{${COUNTRY_COLUMNS.map((c) => `${c}: 'VARCHAR'`).join(", ")}}`;
  await withOfflineDuckDb(async (con) => {
    await con.run(`CREATE TEMP VIEW countries AS SELECT * FROM read_json(${sqlPath(json)}, format='array', columns=${columns})`);
    await con.run(`COPY (SELECT * FROM countries ORDER BY code) TO ${sqlPath(new URL("countries.parquet", outDir))} (FORMAT parquet, COMPRESSION snappy, ROW_GROUP_SIZE 100000)`);
    await con.run(`COPY (SELECT * FROM countries ORDER BY code) TO ${sqlPath(new URL("countries.csv", outDir))} (FORMAT csv, HEADER)`);
  });
}
