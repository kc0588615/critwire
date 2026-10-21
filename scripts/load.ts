// Loads data/ into DATABASE_URL (from .env): drops and re-creates the tables, then inserts everything, in one transaction.
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import { speciesFile, type Species } from "./species.ts";

process.loadEnvFile();
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL not set");

const schema = await readFile(new URL("../db/schema.sql", import.meta.url), "utf8");
const species: Species[] = JSON.parse(await readFile(speciesFile, "utf8"));

const sql = postgres(url, { onnotice: () => {} });
const rows = species.map(s => ({
  id: s.id,
  slug: s.slug,
  scientific_name: s.scientificName,
  common_name: s.commonName,
  class: s.taxonomy.class,
  order_name: s.taxonomy.order,
  family: s.taxonomy.family,
  genus: s.taxonomy.genus,
  iucn_id: s.ids.iucn,
  gbif_id: s.ids.gbif,
  col_id: s.ids.col,
  wikidata_id: s.ids.wikidata,
  inaturalist_id: s.ids.inaturalist,
  ncbi_id: s.ids.ncbi,
  countries_with_records: s.range.countriesWithRecords,
  photo_url: s.photo?.url ?? null,
  photo_credit: s.photo?.credit ?? null,
  photo_license: s.photo?.license ?? null,
  photo_page: s.photo?.page ?? null,
  sources: sql.json(s.sources),
  replaced_by: s.replacedBy,
}));

try {
  await sql.begin(async tx => {
    await tx.unsafe(schema);
    await tx`insert into species ${tx(rows)}`;
  });
  console.log(`loaded ${rows.length} species`);
} finally {
  await sql.end();
}
