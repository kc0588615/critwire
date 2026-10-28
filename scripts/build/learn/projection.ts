// The Learn projection (plan D9.4, D9.5; review SC1): the 14 lab tables a learner builds from the published files.
// assertLearnProjection checks the records against the projection's assumptions before anything is written;
// projectLearn builds the tables in DuckDB from dist/'s bytes (site/learn/sql/setup.sql, 004 §0's setup block byte for
// byte, plus the six lab-only tables from /learn/data/) and counts LAB_CHECKS on them.
import { readFile } from "node:fs/promises";
import type { DuckDBConnection } from "@duckdb/node-api";
import { fileURLToPath } from "node:url";
import type { Species } from "../../species.ts";
import { sqlText, withOfflineDuckDb } from "../duckdb.ts";
import { countLabChecks } from "./checks.ts";

export const setupSql = new URL("../../../site/learn/sql/setup.sql", import.meta.url);

// The lab tables, parents first: setup.sql's eight, then the six lab-only ones with the relation each is read from
// (bare names resolve through file_search_path, as in the browser), and the key the loader orders their rows by.
export interface LabTable { name: string; from?: string; key: readonly string[] }
export const LAB_TABLES: readonly LabTable[] = [
  { name: "taxa", key: ["name"] },
  { name: "species", key: ["id"] },
  { name: "sources", key: ["name"] },
  { name: "species_sources", key: ["species_id", "field"] },
  { name: "countries", key: ["code"] },
  { name: "species_countries", key: ["species_id", "country_code"] },
  { name: "datasets", key: ["dataset_key"] },
  { name: "occurrences", key: ["id"] },
  { name: "country_shapes", from: "read_parquet('country_shapes.parquet')", key: ["country_code"] },
  { name: "admin1_shapes", from: "read_parquet('admin1_shapes.parquet')", key: ["adm1_code"] },
  { name: "biomes", from: "read_csv('biomes.csv', header = true, columns = {'biome_id': 'INTEGER', 'name': 'VARCHAR'})", key: ["biome_id"] },
  { name: "ecoregions", from: "read_parquet('ecoregions.parquet')", key: ["eco_id"] },
  { name: "habitat_classes", from: "read_parquet('habitat_classes.parquet')", key: ["code"] },
  { name: "country_habitats", from: "read_parquet('country_habitats.parquet')", key: ["country_code", "habitat_code"] },
];

// setup.sql's external-id columns: each UNIQUE there and in the loader's lab-keys.sql.
const EXTERNAL_IDS = ["iucn", "gbif", "col", "wikidata", "inaturalist", "ncbi"] as const satisfies readonly (keyof Species["ids"])[];
const RANKS = ["class", "order", "family", "genus"] as const;

// Throws unless the records fit the projection: no two share a non-null external id, each taxon name has one rank and
// one parent, and none is retired (replacedBy).
export function assertLearnProjection(species: readonly Species[]): void {
  for (const key of EXTERNAL_IDS) {
    const holders = new Map<string, number[]>();
    for (const s of species) {
      const v = s.ids[key];
      if (v !== null) holders.set(String(v), [...(holders.get(String(v)) ?? []), s.id]);
    }
    for (const [value, ids] of holders) {
      if (ids.length < 2) continue;
      throw new Error(`species.${key}_id ${value} is shared by species ${ids.sort((a, b) => a - b).join(", ")}, ` +
        `but the Learn projection makes it UNIQUE. If sharing is legitimate, make ${key}_id non-unique in site/learn/sql/setup.sql, ` +
        "db/learn/lab-keys.sql and both ERDs, and teach it as an optional, non-unique id (plan D9.5)");
    }
  }
  const taxa = new Map<string, { rank: string; parent: string | null }>();
  for (const s of species) {
    RANKS.forEach((rank, i) => {
      const name = s.taxonomy[rank];
      const parent = i === 0 ? null : s.taxonomy[RANKS[i - 1]!];
      const seen = taxa.get(name);
      if (!seen) taxa.set(name, { rank, parent });
      else if (seen.rank !== rank) throw new Error(`taxon "${name}" is both a ${seen.rank} and a ${rank} (species ${s.id}); taxa.name is one rank`);
      else if (seen.parent !== parent) throw new Error(`taxon "${name}" has two parents, ${seen.parent} and ${parent} (species ${s.id}); taxa.name has one parent`);
    });
  }
  for (const s of species) {
    if (s.replacedBy !== null) {
      throw new Error(`species ${s.id} is retired (replacedBy ${JSON.stringify(s.replacedBy)}): the Learn projection counts every record as ` +
        "active, so a retired record needs a replacement junction in setup.sql and the loader first (plan D9.5, D17)");
    }
  }
}

// Runs fn on an offline DuckDB holding the 14 lab tables, built from out/v1/ and out/learn/data/ as published (query).
export async function withLabTables<T>(out: URL, fn: (con: DuckDBConnection) => Promise<T>): Promise<T> {
  const setup = await readFile(setupSql, "utf8");
  const searchPath = [new URL("v1/", out), new URL("learn/data/", out)].map((u) => fileURLToPath(u)).join(",");
  return withOfflineDuckDb(async (con) => {
    await con.run(`SET file_search_path = ${sqlText(searchPath)}`);
    await con.run(setup);
    for (const t of LAB_TABLES) if (t.from) await con.run(`CREATE TABLE ${t.name} AS SELECT * FROM ${t.from}`);
    return fn(con);
  });
}

// The lab tables' row counts and every LAB_CHECKS count, over out/'s published files (query).
export function projectLearn(out: URL): Promise<{ tables: Record<string, number>; checks: Record<string, number> }> {
  return withLabTables(out, async (con) => {
    const one = async (sql: string) => (await con.runAndReadAll(sql)).getRows()[0]![0] as bigint;
    const tables: Record<string, number> = {};
    for (const t of LAB_TABLES) tables[t.name] = Number(await one(`SELECT count(*) FROM ${t.name}`));
    return { tables, checks: await countLabChecks(one) };
  });
}
