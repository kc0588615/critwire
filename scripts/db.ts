// Postgres load shared by pnpm db:load and pnpm build: drops and re-creates the db/schema.sql tables, then inserts
// every species, in one transaction under an advisory lock (critwire_dev is shared, so two loads must not interleave).
// It refuses before any DDL unless the database it reached is CRITWIRE_DB_TARGET (MF1).
import { readFile } from "node:fs/promises";
import postgres from "postgres";
import type { Species } from "./species.ts";

const schemaFile = new URL("../db/schema.sql", import.meta.url);

// One species table row per record. postgres.js serializes sources by the column type (jsonb).
export function speciesRows(species: readonly Species[]) {
  return species.map((s) => ({
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
    countries_with_open_records: s.range.countriesWithOpenRecords,
    range_status: s.range.status,
    photo_url: s.photo?.url ?? null,
    photo_credit: s.photo?.credit ?? null,
    photo_license: s.photo?.license ?? null,
    photo_page: s.photo?.page ?? null,
    sources: s.sources,
    replaced_by: s.replacedBy,
  }));
}

// Throws unless current (the server's current_database()) is the target the environment names.
export function assertTarget(current: string, target: string | undefined): void {
  if (!target) throw new Error("CRITWIRE_DB_TARGET not set: name the database this load may rebuild (.env or environment)");
  if (current !== target) throw new Error(`refusing to rebuild ${current}: CRITWIRE_DB_TARGET is ${target}`);
}

export async function loadDatabase(url: string, species: readonly Species[]): Promise<void> {
  const schema = await readFile(schemaFile, "utf8");
  const sql = postgres(url, { onnotice: () => {} });
  try {
    await sql.begin(async (tx) => {
      const [{ name }] = await tx<{ name: string }[]>`select current_database() as name`;
      assertTarget(name, process.env.CRITWIRE_DB_TARGET);
      console.log(`loading into ${name}`);
      await tx`select pg_advisory_xact_lock(hashtext('critwire.load'))`;
      await tx.unsafe(schema);
      await tx`insert into public.species ${tx(speciesRows(species))}`;
    });
  } finally {
    await sql.end();
  }
}
