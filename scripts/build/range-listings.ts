// /v1/range-listings.{json,parquet,csv} (007, Contract): the rows of data/range-listings.json, one claim a named source
// makes per row. Parquet and CSV come from the JSON just written through the shared writer, so country stays text
// (Namibia's NA) and the sort is the derive's: null area first.
import { writeFile } from "node:fs/promises";
import type { RangeListing } from "../derive/listings.ts";
import { formatJson } from "../json.ts";
import { writeParquetCsv } from "./tables.ts";

// In the contract's order; camelCase in JSON and Parquet, snake_case in the CSV (csvSelect).
export const RANGE_LISTING_COLUMNS = {
  speciesId: "INTEGER",
  country: "VARCHAR",
  area: "VARCHAR",
  origin: "VARCHAR",
  presence: "VARCHAR",
  source: "VARCHAR",
  sourceKey: "VARCHAR",
  license: "VARCHAR",
  doi: "VARCHAR",
  url: "VARCHAR",
  sourceTerm: "VARCHAR",
} as const satisfies Record<keyof RangeListing, string>;

const ORDER = "speciesId, country, area NULLS FIRST, origin, presence, sourceKey";

export async function writeRangeListings(rows: readonly RangeListing[], outDir: URL): Promise<void> {
  const json = new URL("range-listings.json", outDir);
  await writeFile(json, formatJson(rows));
  await writeParquetCsv("range-listings", json, RANGE_LISTING_COLUMNS, ORDER, outDir);
}
