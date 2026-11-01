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
