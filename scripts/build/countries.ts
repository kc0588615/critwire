// /v1/countries.{json,parquet,csv} (002 §6, plan D4): the rows of data/countries.json. Parquet and CSV are written by
// the shared writer from the JSON just written, every column VARCHAR (so Namibia's NA stays text), sorted by code.
import { writeFile } from "node:fs/promises";
import { formatJson } from "../json.ts";
import { COUNTRY_COLUMNS, type CountryRow } from "../derive/naturalearth.ts";
import { writeParquetCsv } from "./tables.ts";

// Every column's DuckDB type, in order (the /v1 contract's countries; the CSV is every column).
export const COUNTRY_TYPES: Readonly<Record<string, string>> = Object.fromEntries(COUNTRY_COLUMNS.map((c) => [c, "VARCHAR"]));

export async function writeCountries(rows: CountryRow[], outDir: URL): Promise<void> {
  const json = new URL("countries.json", outDir);
  await writeFile(json, formatJson(rows));
  await writeParquetCsv("countries", json, COUNTRY_TYPES, "code", outDir);
}
