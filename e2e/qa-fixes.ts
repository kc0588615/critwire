// One row per prose or external-URL fix of the Learn QA pass (plans/006-learn-qa.md): the served page holds `has` and not
// `not`, in its HTML as written, so a link's URL counts and a sentence is matched between its tags. `from`: the recorded
// result (repo path) a number came from, checked on dist/ only by learn-walk.spec.ts. Run on dist/ and, by
// release/live.spec.ts, on the origin.
import type { APIRequestContext } from "@playwright/test";

export interface QaFix {
  q: string;
  url: string;
  has: string;
  not?: string;
  from?: { file: string; values: string[] };
}

export const QA_FIXES: QaFix[] = [
  { q: "Q5", url: "/learn/setup/", has: "uv pip install --constraint requirements.txt jupyterlab" },
  { q: "Q6", url: "/learn/setup/", has: "source $HOME/.local/bin/env" },
  { q: "Q6", url: "/learn/setup/", has: "$env:Path = \"$HOME\\.local\\bin;$env:Path\"" },
  { q: "Q7", url: "/learn/setup/", has: "docker exec -it learn-pg psql -U postgres -d learn" },
  { q: "Q8", url: "/learn/setup/", has: "export PGHOST=localhost PGPORT=5432 PGUSER=postgres PGDATABASE=learn" },
  { q: "Q8", url: "/learn/setup/", has: "libpq, PostgreSQL's client library", not: "libpq's standard environment variables" },
  { q: "Q9", url: "/learn/setup/", has: "the lab file checked all 16 before it committed", not: "The same 16 counts mean", from: { file: "site/learn/labs/checked/pg-smoke.txt", values: ["16 rows", "… 11 more rows"] } },
  { q: "Q10", url: "/learn/data/", has: "the extensions <code>postgis</code> and <code>postgis_raster</code>", not: "and the PostGIS extension" },
  { q: "Q11", url: "/learn/data/", has: "<a href=\"/\">critwire</a> / <a href=\"/learn/\">Learn</a>" },
  { q: "Q12", url: "/learn/schema/lab/", has: "two clips of the 100 m map, all of Costa Rica and all of Tasmania", not: "whole-country" },
  { q: "Q13", url: "/learn/", has: "the browser's check your answer, the others show theirs to compare", not: "an exercise that checks your answer" },
  { q: "Q14", url: "/learn/capstone/", has: "1 module, 8 hours.", not: "Work through them in order" },
  { q: "Q15", url: "/learn/foundations/join/", has: "stretch it over 257° of longitude, the long way round through Africa and Asia", not: "across the Pacific", from: { file: "e2e/__snapshots__/f3-bbox.txt", values: ["-106.663485", "150.254131"] } },
  { q: "Q16", url: "/learn/setup/", has: "names them under its heading, as Runs after" },
  { q: "Q16", url: "/learn/database-architecture/indexes/", has: "Runs after: <a href=\"#q-d3-analyze\">d3-analyze</a>, <a href=\"#q-d3-many-rows\">d3-many-rows</a>", not: "Every block of this module runs after this one" },
  { q: "Q17", url: "/learn/database-architecture/star/", has: "<code>ROLLBACK;</code> a star you already built", from: { file: "site/learn/labs/checked/d6-unknown.txt", values: ["fact_records joined to dim_country | 40396"] } },
  { q: "Q18", url: "/learn/database-architecture/keys/", has: "PostgreSQL describes itself in its <strong>catalog</strong>" },
  { q: "Q19", url: "/learn/database-architecture/normalize/", has: "Parquet, a compressed format that stores data column by column" },
  { q: "Q20", url: "/learn/database-architecture/normalize/", has: "The taxonomy and its own id are from the Catalogue of Life", not: "the outside ids from Wikidata and GBIF", from: { file: "e2e/__snapshots__/d2-provenance.txt", values: ["ids.col | Catalogue of Life"] } },
  { q: "Q21", url: "/learn/database-architecture/indexes/", has: "(40,386 of 40,395 rows thrown away to find the pangolin's nine)", not: "the pangolin's 40,395 rows", from: { file: "site/learn/labs/checked/d3-seq.txt", values: ["Rows Removed by Filter: 40386"] } },
  { q: "Q22", url: "/learn/database-architecture/indexes/", has: "<code>license</code> a little (0.39)", from: { file: "site/learn/labs/checked/d3-stats.txt", values: ["license | 0 | 2 | 0.39390513"] } },
  { q: "Q23", url: "/learn/database-architecture/indexes/", has: "Ask for the records of 2026, 74 of them,", not: "this year's records", from: { file: "site/learn/labs/checked/d3-few-rows.txt", values: ["year >= 2026"] } },
  { q: "Q24", url: "/learn/database-architecture/indexes/", has: "<code>VACUUM</code>, PostgreSQL's housekeeping" },
  { q: "Q25", url: "/learn/database-architecture/transactions/", has: "<code>IS DISTINCT FROM</code> is <code>&lt;&gt;</code> for values that may be <code>NULL</code>" },
  { q: "Q26", url: "/learn/gis-in-sql/crs/", has: "about 80 at its northern coast", not: "about 81 at its northern coast" },
  { q: "Q27", url: "/learn/gis-in-sql/load-validate/", has: "<code>(ST_IsValidDetail(geom)).reason</code>" },
  { q: "Q28", url: "/learn/gis-in-sql/load-validate/", has: "the left half of the 2 × 2 square it sits in", not: "the square's left half" },
  { q: "Q29", url: "/learn/gis-in-sql/spatial-join/", has: "call that id <code>id_no</code> and hold several rows per taxon" },
  { q: "Q30", url: "/learn/gis-in-sql/measure-overlay/", has: "the buffer's round ends add a little", not: "and smaller where the sea" },
  { q: "Q31", url: "/learn/gis-in-sql/spatial-index/", has: "529 more within 25 km", not: "529 within 25 km" },
  { q: "Q32", url: "/learn/gis-in-sql/grids/", has: "<code>ST_Dump</code> splits a MultiPolygon into one row per part" },
  { q: "Q33", url: "/learn/gis-in-sql/raster/", has: "Method 2, counting cells on coarser copies of the map, wasn't chosen" },
  { q: "Q34", url: "/learn/gis-in-sql/raster/", has: "come out 4.8 and 3.9 % smaller", not: "come out 3.9 and 4.8 %" },
  { q: "Q35", url: "/learn/gis-in-sql/raster/", has: "on a grid of 0.05° steps", not: "square holding the most" },
  { q: "Q36", url: "/learn/gis-in-sql/raster/", has: "some of Costa Rica or Tasmania", not: "The country reaches every edge" },
  { q: "Q37", url: "/learn/gis-in-sql/raster/", has: "the worst are all under 135 km²", not: "the worst are islands" },
  { q: "Q38", url: "/learn/spatial-statistics/bias/", has: "20 of the 28 museum specimens", not: "19 of the 28" },
  { q: "Q39", url: "/learn/spatial-statistics/bias/", has: "134,690 fixes from 117 jaguars", not: "from a few animals" },
  { q: "Q39", url: "/learn/power-bi/maps-report/", has: "and they draw collared animals' paths;", not: "a few collared" },
  { q: "Q39", url: "/learn/capstone/game-feed/", has: "1,948 GPS-collar fixes, so a jaguar feed", not: "fixes of a few animals" },
  { q: "Q40", url: "/learn/foundations/window/", has: "one GPS-collar dataset is almost everything", not: "one GPS-collar study" },
  { q: "Q40", url: "/learn/spatial-statistics/zonal/", has: "from how many datasets?", not: "collar study" },
  { q: "Q40", url: "/learn/capstone/game-feed/", has: "If one dataset dominates", not: "If one study dominates" },
  { q: "Q41", url: "/learn/spatial-statistics/bias/", has: "the standard vocabulary for biodiversity records", not: "a Darwin Core term" },
  { q: "Q42", url: "/learn/spatial-statistics/point-patterns/", has: "Both tests say clustered", not: "Every test says clustered" },
  { q: "Q42", url: "/learn/spatial-statistics/point-patterns/", has: "Every method below measures", not: "Every test below measures" },
  { q: "Q43", url: "/learn/spatial-statistics/point-patterns/", has: "A z-score beyond ±1.96", not: "A z-score below −1.96" },
  { q: "Q44", url: "/learn/spatial-statistics/point-patterns/", has: "188 records lie in a cell but outside the island" },
  { q: "Q45", url: "/learn/spatial-statistics/point-patterns/", has: "the same number as the distinct locations above, by chance" },
  { q: "Q46", url: "/learn/spatial-statistics/point-patterns/", has: "<code>ST_ClusterWithinWin</code>", not: "<code>ST_ClusterWithin</code>" },
  { q: "Q47", url: "/learn/spatial-statistics/weights/", has: "would show as a row with 0", not: "wouldn't appear here at all" },
  { q: "Q48", url: "/learn/spatial-statistics/moran/", has: "by about 10⁻¹² at most", not: "by 10⁻¹² at most" },
  { q: "Q49", url: "/learn/spatial-statistics/moran/", has: "Unlike most blocks, this one keeps its work", not: "This block runs when a PostGIS run starts" },
  { q: "Q50", url: "/learn/spatial-statistics/local/", has: "Under the null hypothesis, here no spatial pattern", not: "Under the null hypothesis a z-score" },
  { q: "Q51", url: "/learn/spatial-statistics/local/", has: "if no test passes", not: "if every test would pass" },
  { q: "Q52", url: "/learn/spatial-statistics/local/", has: "times (n − 1)/n" },
  { q: "Q53", url: "/learn/spatial-statistics/local/", has: "the museum's dataset 21.4 %", not: "material samples 21.4 %" },
  { q: "Q54", url: "/learn/database-architecture/keys/", has: "tbls also lists <code>s4_cells</code>" },
  { q: "Q56", url: "/learn/etl/extract/", has: "the lab sample's five filters", not: "six filters", from: { file: "site/learn/labs/checked/e1-request.txt", values: ["LICENSE in", "HAS_COORDINATE equals", "HAS_GEOSPATIAL_ISSUE equals", "OCCURRENCE_STATUS equals", "BASIS_OF_RECORD in"] } },
  { q: "Q57", url: "/learn/etl/extract/", has: "equal, as JSON, the ones GBIF stored", not: "Apart from <code>creator</code>" },
  { q: "Q58", url: "/learn/etl/transform-load/", has: "the decimal comma in the next record", not: "two records later" },
  { q: "Q59", url: "/learn/etl/transform-load/", has: "takes the geometry column's name, <code>geom</code> unless you say otherwise", not: "needs the geometry column's name" },
  { q: "Q60", url: "/learn/etl/transform-load/", has: "The catalog (<code>pg_class</code>", not: "The catalogue (" },
  { q: "Q61", url: "/learn/etl/idempotent/", has: "The SQL blocks run in your own PostgreSQL with PostGIS and the Python blocks in the Python environment", not: "The Python blocks run in the Python environment" },
  { q: "Q61", url: "/learn/etl/quality-provenance/", has: "Everything runs in your own PostgreSQL with PostGIS and the Python environment", not: "Everything runs in the Python environment" },
];

// What's wrong with each row on the origin `request` points at; [] when every fix shows.
export async function qaFixErrors(request: APIRequestContext): Promise<string[]> {
  const errors: string[] = [];
  for (const { q, url, has, not } of QA_FIXES) {
    const res = await request.get(url);
    if (res.status() !== 200) {
      errors.push(`${q} ${url}: ${res.status()}`);
      continue;
    }
    const html = await res.text();
    if (!html.includes(has)) errors.push(`${q} ${url}: lacks "${has}"`);
    if (not && html.includes(not)) errors.push(`${q} ${url}: still has "${not}"`);
  }
  return errors;
}
