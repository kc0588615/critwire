// LAB_CHECKS (plan D9.4; review SC1, SC5): what the lab tables' keys and CHECKs don't say, as portable SQL that runs
// unchanged in DuckDB (the build, over the published files) and in Postgres (the loader's DO block, at load time).
// Each query returns its violation count; any count above 0 fails. LAB_CHECK_FIXTURES proves each one in both
// engines (D15 LX): every check 0 on the clean rows, and exactly 1 after each violating statement.

export interface LabCheck { name: string; sql: string }

// A country code GBIF uses for no country: ZZ unknown, XZ international waters (004 §4.2).
const NO_COUNTRY = "('ZZ', 'XZ')";

// The lab-only tables' references to a key that has no FOREIGN KEY in the browser's schema (004 §4.3).
const covered = (name: string, table: string, column: string, parent: string, key: string): LabCheck => ({
  name,
  sql: `SELECT count(*) FROM ${table} AS t WHERE t.${column} IS NOT NULL ` +
    `AND NOT EXISTS (SELECT 1 FROM ${parent} AS p WHERE p.${key} = t.${column})`,
});

export const LAB_CHECKS: readonly LabCheck[] = [
  {
    // range_status 'ok' exactly when the species has species_countries rows.
    name: "range_status_ok_iff_countries",
    sql: "SELECT count(*) FROM species AS s WHERE (s.range_status = 'ok') <> " +
      "EXISTS (SELECT 1 FROM species_countries AS sc WHERE sc.species_id = s.id)",
  },
  {
    // A class has no parent; every other taxon's parent exists and is exactly one rank up.
    name: "taxa_parent_one_rank_up",
    sql: "SELECT count(*) FROM taxa AS t LEFT JOIN taxa AS p ON p.name = t.parent_name " +
      "WHERE CASE WHEN t.taxon_rank = 'class' THEN t.parent_name IS NOT NULL " +
      "ELSE p.taxon_rank IS DISTINCT FROM CASE t.taxon_rank WHEN 'order' THEN 'class' WHEN 'family' THEN 'order' " +
      "WHEN 'genus' THEN 'family' END END",
  },
  {
    name: "species_genus_rank",
    sql: "SELECT count(*) FROM species AS s LEFT JOIN taxa AS t ON t.name = s.genus WHERE t.taxon_rank IS DISTINCT FROM 'genus'",
  },
  {
    // The country-key contract: country_code = country_code_gbif when that is a countries row; else NULL, with
    // GBIF's code NULL, ZZ or XZ (an unknown code fails the sample derive, so it never reaches here).
    name: "occurrences_country_key",
    sql: "SELECT count(*) FROM occurrences AS o LEFT JOIN countries AS c ON c.code = o.country_code_gbif " +
      "WHERE CASE WHEN c.code IS NOT NULL THEN o.country_code IS DISTINCT FROM o.country_code_gbif " +
      `ELSE o.country_code IS NOT NULL OR o.country_code_gbif NOT IN ${NO_COUNTRY} END`,
  },
  covered("country_shapes_country", "country_shapes", "country_code", "countries", "code"),
  covered("admin1_shapes_country", "admin1_shapes", "country_code", "countries", "code"),
  covered("country_habitats_country", "country_habitats", "country_code", "countries", "code"),
  covered("country_habitats_habitat", "country_habitats", "habitat_code", "habitat_classes", "code"),
  covered("ecoregions_biome", "ecoregions", "biome_id", "biomes", "biome_id"),
  {
    // A level-2 class points at a level-1 class (one with no level1_code of its own).
    name: "habitat_classes_level1",
    sql: "SELECT count(*) FROM habitat_classes AS h WHERE h.level1_code IS NOT NULL AND NOT EXISTS " +
      "(SELECT 1 FROM habitat_classes AS p WHERE p.code = h.level1_code AND p.level1_code IS NULL)",
  },
  {
    name: "country_habitats_area",
    sql: "SELECT count(*) FROM country_habitats WHERE NOT (est_area_km2 >= 0)",
  },
  {
    // Finite and non-negative; both engines sort NaN above 'Infinity', so the upper bound also rejects NaN.
    name: "occurrences_uncertainty",
    sql: "SELECT count(*) FROM occurrences WHERE NOT (coordinate_uncertainty_m >= 0 " +
      "AND coordinate_uncertainty_m < CAST('Infinity' AS double precision))",
  },
  { name: "occurrences_month", sql: "SELECT count(*) FROM occurrences WHERE NOT (month BETWEEN 1 AND 12)" },
  // Unknown years stay NULL; the ingest bounds a year above at the download's year.
  { name: "occurrences_year", sql: "SELECT count(*) FROM occurrences WHERE NOT (year > 0)" },
];

// Portable tables (only the columns the checks read, no constraints, so a violation can be inserted), clean rows on
// which every check is 0, and per check the statements that each, on top of the clean rows, make it exactly 1.
export const LAB_CHECK_FIXTURES: { tables: string; clean: string; violating: Record<string, readonly string[]> } = {
  tables: `
CREATE TABLE taxa (name text, taxon_rank text, parent_name text);
CREATE TABLE species (id integer, genus text, range_status text);
CREATE TABLE countries (code text);
CREATE TABLE species_countries (species_id integer, country_code text);
CREATE TABLE occurrences (id bigint, country_code_gbif text, country_code text, coordinate_uncertainty_m double precision, year integer, month integer);
CREATE TABLE country_shapes (country_code text);
CREATE TABLE admin1_shapes (adm1_code text, country_code text);
CREATE TABLE biomes (biome_id integer);
CREATE TABLE ecoregions (eco_id integer, biome_id integer);
CREATE TABLE habitat_classes (code integer, level1_code integer);
CREATE TABLE country_habitats (country_code text, habitat_code integer, est_area_km2 numeric(12, 2));`,
  clean: `
INSERT INTO taxa VALUES ('Mammalia', 'class', NULL), ('Carnivora', 'order', 'Mammalia'), ('Felidae', 'family', 'Carnivora'), ('Panthera', 'genus', 'Felidae');
INSERT INTO species VALUES (1, 'Panthera', 'ok'), (2, 'Panthera', 'no-open-records'), (3, 'Panthera', 'identity-unsettled');
INSERT INTO countries VALUES ('IN'), ('FR');
INSERT INTO species_countries VALUES (1, 'IN'), (1, 'FR');
INSERT INTO occurrences VALUES (1, 'IN', 'IN', 10.5, 2020, 6), (2, 'ZZ', NULL, NULL, NULL, NULL), (3, 'XZ', NULL, 0, 1, 12), (4, NULL, NULL, NULL, NULL, 1);
INSERT INTO country_shapes VALUES ('IN'), ('FR');
INSERT INTO admin1_shapes VALUES ('IND-2428', 'IN');
INSERT INTO biomes VALUES (1);
INSERT INTO ecoregions VALUES (0, NULL), (1, 1);
INSERT INTO habitat_classes VALUES (100, NULL), (101, 100);
INSERT INTO country_habitats VALUES ('IN', 101, 12.5), ('FR', 100, 0);`,
  violating: {
    range_status_ok_iff_countries: [
      "INSERT INTO species VALUES (4, 'Panthera', 'ok')",
      "INSERT INTO species_countries VALUES (2, 'FR')",
    ],
    taxa_parent_one_rank_up: [
      "INSERT INTO taxa VALUES ('Leo', 'genus', 'Carnivora')",
      "INSERT INTO taxa VALUES ('Aves', 'class', 'Mammalia')",
      "INSERT INTO taxa VALUES ('Canidae', 'family', NULL)",
      "INSERT INTO taxa VALUES ('Canidae', 'family', 'Nowhere')",
    ],
    species_genus_rank: [
      "INSERT INTO species VALUES (4, 'Felidae', 'no-open-records')",
      "INSERT INTO species VALUES (4, 'Nowhere', 'no-open-records')",
    ],
    occurrences_country_key: [
      "INSERT INTO occurrences VALUES (5, 'FR', NULL, NULL, NULL, NULL)",
      "INSERT INTO occurrences VALUES (5, 'IN', 'FR', NULL, NULL, NULL)",
      "INSERT INTO occurrences VALUES (5, 'ZZ', 'ZZ', NULL, NULL, NULL)",
      "INSERT INTO occurrences VALUES (5, 'QQ', NULL, NULL, NULL, NULL)",
      "INSERT INTO occurrences VALUES (5, NULL, 'IN', NULL, NULL, NULL)",
    ],
    country_shapes_country: ["INSERT INTO country_shapes VALUES ('QQ')"],
    admin1_shapes_country: ["INSERT INTO admin1_shapes VALUES ('QQQ-1', 'QQ')"],
    country_habitats_country: ["INSERT INTO country_habitats VALUES ('QQ', 100, 1)"],
    country_habitats_habitat: ["INSERT INTO country_habitats VALUES ('IN', 999, 1)"],
    ecoregions_biome: ["INSERT INTO ecoregions VALUES (2, 9)"],
    habitat_classes_level1: [
      "INSERT INTO habitat_classes VALUES (201, 200)",
      "INSERT INTO habitat_classes VALUES (102, 101)",
    ],
    country_habitats_area: ["INSERT INTO country_habitats VALUES ('IN', 100, -0.01)"],
    occurrences_uncertainty: [
      "INSERT INTO occurrences VALUES (5, 'IN', 'IN', -1, NULL, NULL)",
      "INSERT INTO occurrences VALUES (5, 'IN', 'IN', CAST('Infinity' AS double precision), NULL, NULL)",
      "INSERT INTO occurrences VALUES (5, 'IN', 'IN', CAST('-Infinity' AS double precision), NULL, NULL)",
      "INSERT INTO occurrences VALUES (5, 'IN', 'IN', CAST('NaN' AS double precision), NULL, NULL)",
    ],
    occurrences_month: [
      "INSERT INTO occurrences VALUES (5, 'IN', 'IN', NULL, NULL, 13)",
      "INSERT INTO occurrences VALUES (5, 'IN', 'IN', NULL, NULL, 0)",
    ],
    occurrences_year: [
      "INSERT INTO occurrences VALUES (5, 'IN', 'IN', NULL, 0, NULL)",
      "INSERT INTO occurrences VALUES (5, 'IN', 'IN', NULL, -5, NULL)",
    ],
  },
};

// Every check's violation count, by name, through query (one engine's: it runs a count query and returns its one
// value, which postgres.js gives as a string and DuckDB as a bigint).
export async function countLabChecks(query: (sql: string) => Promise<number | bigint | string>): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const c of LAB_CHECKS) counts[c.name] = Number(await query(c.sql));
  return counts;
}

// Throws unless every LAB_CHECKS count is present and 0, naming each failing check and its count.
export function assertLabChecks(counts: Record<string, number>, where: string): void {
  const missing = LAB_CHECKS.filter((c) => counts[c.name] === undefined).map((c) => c.name);
  if (missing.length) throw new Error(`${where}: missing check ${missing.join(", ")}`);
  const failed = LAB_CHECKS.filter((c) => counts[c.name] !== 0).map((c) => `${c.name} ${counts[c.name]}`);
  if (failed.length) throw new Error(`${where}: LAB_CHECKS failed: ${failed.join(", ")} (plan D9.4; each counts rows breaking its rule)`);
}
