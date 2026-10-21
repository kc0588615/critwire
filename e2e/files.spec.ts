// /v1 files (plan §9 files): each downloads, parses and equals data/species.json.
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { Species } from "../scripts/species.ts";
import { csvRows, distPath, openDuckDB, ORIGIN, parquetRecords, records, speciesBytes, statusCounts, type DuckDB } from "./helpers.ts";

const TABLES = ["species.json", "species.csv", "species.parquet"];

// The CSV flattening, re-implemented here (not shared with scripts/build/columns.ts) so the test checks the build.
const CSV_HEADER = [
  "id", "slug", "scientific_name", "common_name", "taxonomy_class", "taxonomy_order", "taxonomy_family", "taxonomy_genus",
  "ids_iucn", "ids_gbif", "ids_col", "ids_wikidata", "ids_inaturalist", "ids_ncbi",
  "range_countries_with_open_records", "range_status", "photo_url", "photo_credit", "photo_license", "photo_page", "replaced_by",
];
const cell = (v: unknown) => (v == null ? null : Array.isArray(v) ? v.join(";") : String(v));
const flatten = (r: Species) => [
  r.id, r.slug, r.scientificName, r.commonName, r.taxonomy.class, r.taxonomy.order, r.taxonomy.family, r.taxonomy.genus,
  r.ids.iucn, r.ids.gbif, r.ids.col, r.ids.wikidata, r.ids.inaturalist, r.ids.ncbi,
  r.range.countriesWithOpenRecords, r.range.status, r.photo?.url, r.photo?.credit, r.photo?.license, r.photo?.page, r.replacedBy,
].map(cell);

let species: Species[];
let db: DuckDB;
test.beforeAll(async () => { species = await records(); db = await openDuckDB(); });
test.afterAll(() => db.close());

test("every /v1 file downloads with the built bytes", async ({ request }) => {
  const paths = [...TABLES, ...species.flatMap((s) => [`species/${s.id}.json`, `species/${s.slug}.json`])];
  for (const path of paths) {
    const res = await request.get(`/v1/${path}`);
    expect(res.status(), path).toBe(200);
    expect((await res.body()).equals(await readFile(distPath(`v1/${path}`))), path).toBe(true);
  }
});

test("species.json equals data/species.json", async ({ request }) => {
  const res = await request.get("/v1/species.json");
  expect((await res.body()).equals(await speciesBytes())).toBe(true);
  const got: Species[] = await res.json();
  expect(got.length).toBe(species.length);
  expect(statusCounts(got)).toEqual(statusCounts(species));
  console.log(`${got.length} records`, statusCounts(got));
});

test("species/{id}.json and species/{slug}.json are the same record", async ({ request }) => {
  for (const s of species) {
    const byId = await (await request.get(`/v1/species/${s.id}.json`)).body();
    const bySlug = await (await request.get(`/v1/species/${s.slug}.json`)).body();
    expect(byId.equals(bySlug), s.slug).toBe(true);
    expect(JSON.parse(byId.toString("utf8")), s.slug).toEqual(s);
  }
});

test("species.csv flattens every record", async () => {
  const header = (await readFile(distPath("v1/species.csv"), "utf8")).split("\n", 1)[0];
  expect(header.split(",")).toEqual(CSV_HEADER);
  const rows = await csvRows(db, distPath("v1/species.csv"));
  expect(rows.map((r) => Object.values(r))).toEqual(species.map(flatten));
});

test("species.parquet equals the records, as a file and over HTTP", async () => {
  expect(await parquetRecords(db, distPath("v1/species.parquet"))).toEqual(species);
  expect(await parquetRecords(db, `${ORIGIN}/v1/species.parquet`)).toEqual(species);
});
