// /v1/range-listings.{json,csv,parquet} (007, Contract). Expectations come from data/, never the build's code.
//
// The conflict test (plan F7, E11) is the suite's one isolated check, so its ways to fail come first:
// Must find: native-or-pre-1500 vs introduced; native + absent vs introduced + present; introduced + present vs introduced + absent.
// Must not find: a pair where one row has an area; native vs native-or-pre-1500; uncertain vs introduced.
// JS and SQL differing on any of them.
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { rangeConflicts, type ConflictRow, type RangeListing } from "../scripts/derive/listings.ts";
import { csvRows, distPath, openDuckDB, ORIGIN, repoPath, type DuckDB } from "./helpers.ts";

const FILES = ["range-listings.json", "range-listings.csv", "range-listings.parquet"];
const PARQUET = `read_parquet('${ORIGIN}/v1/range-listings.parquet')`;
const snake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
const json = async <T>(path: string): Promise<T> => JSON.parse(await readFile(repoPath(path), "utf8"));
const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

let rows: RangeListing[];
let contract: { rangeListings: Record<string, { type: string }>; rangeListingsCsv: string[] };
let db: DuckDB;
test.beforeAll(async () => {
  rows = (await json<{ rows: RangeListing[] }>("data/range-listings.json")).rows;
  contract = await json("contracts/v1.json");
  db = await openDuckDB();
});
test.afterAll(() => db.close());

test("E1: the three files download with the built bytes", async ({ request }) => {
  expect(rows.length).toBeGreaterThan(0);
  for (const file of FILES) {
    const res = await request.get(`/v1/${file}`);
    expect(res.status(), file).toBe(200);
    expect((await res.body()).equals(await readFile(distPath(`v1/${file}`))), file).toBe(true);
  }
});

test("E2: JSON, Parquet and CSV hold the same rows, with the contract's names, order and types", async ({ request }) => {
  const columns = Object.keys(contract.rangeListings);
  expect(await (await request.get("/v1/range-listings.json")).json()).toEqual(rows);
  for (const r of rows) expect(Object.keys(r), `${r.speciesId} ${r.country}`).toEqual(columns);

  expect(await db.rows(`SELECT column_name, column_type FROM (DESCRIBE SELECT * FROM ${PARQUET})`))
    .toEqual(columns.map((column_name) => ({ column_name, column_type: contract.rangeListings[column_name].type })));
  expect(await db.rows(`SELECT * FROM ${PARQUET}`)).toEqual(rows);

  expect(contract.rangeListingsCsv).toEqual(columns.map(snake));
  expect((await (await request.get("/v1/range-listings.csv")).text()).split("\n")[0]).toBe(contract.rangeListingsCsv.join(","));
  expect(await csvRows(db, `${ORIGIN}/v1/range-listings.csv`)).toEqual(rows.map((r) =>
    Object.fromEntries(columns.map((c) => { const v = r[c as keyof RangeListing]; return [snake(c), v === null ? null : String(v)]; }))));
});

test("E3: NA (Namibia) stays text in every format, with DuckDB's default reading", async () => {
  const want = rows.filter((r) => r.country === "NA").length;
  expect(want).toBeGreaterThan(0);
  for (const from of [PARQUET, `read_csv('${ORIGIN}/v1/range-listings.csv')`, `read_json('${ORIGIN}/v1/range-listings.json')`]) {
    expect(await db.rows(`SELECT count(*)::INTEGER AS n FROM ${from} WHERE country = 'NA'`), from).toEqual([{ n: want }]);
  }
});

test("E4: rows are sorted, null area first, and unique on 007's key", () => {
  const compare = (a: RangeListing, b: RangeListing) => a.speciesId - b.speciesId || byText(a.country, b.country)
    || (a.area === b.area ? 0 : a.area === null ? -1 : b.area === null ? 1 : byText(a.area, b.area))
    || byText(a.origin, b.origin) || byText(a.presence, b.presence) || byText(a.sourceKey, b.sourceKey);
  expect(rows).toEqual([...rows].sort(compare));
  const keys = rows.map((r) => JSON.stringify([r.speciesId, r.country, r.area, r.origin, r.presence, r.sourceKey]));
  expect(new Set(keys).size).toBe(rows.length);
});

test("E5: every species_id joins /v1/species and every country /v1/countries, on served Parquet", async () => {
  for (const [column, table, key] of [["speciesId", "species", "id"], ["country", "countries", "code"]]) {
    expect(await db.rows(`SELECT count(*)::INTEGER AS unmatched FROM ${PARQUET} AS l
      ANTI JOIN read_parquet('${ORIGIN}/v1/${table}.parquet') AS t ON t.${key} = l.${column}`), table).toEqual([{ unmatched: 0 }]);
  }
});

test("E6: every source_key is credited; a row's license is its dataset's; the per-dataset summary is on no row", async ({ request }) => {
  const attribution = await (await request.get("/v1/attribution.json")).json() as {
    gbifChecklists: { key: string; license: string }[]; sources: { source: string; sourceKey?: string; license: string }[];
  };
  const checklists = new Map(attribution.gbifChecklists.map((d) => [d.key, d.license]));
  const named = new Map(attribution.sources.filter((s) => s.sourceKey).map((s) => [s.sourceKey!, s.license]));
  for (const r of rows) {
    const where = `${r.speciesId} ${r.country} ${r.sourceKey}`;
    expect(checklists.has(r.sourceKey) || named.has(r.sourceKey), where).toBe(true);
    expect(r.license, where).toBe(checklists.get(r.sourceKey) ?? named.get(r.sourceKey));
  }
  const summary = attribution.sources.find((s) => s.source === "GBIF checklists")!.license;
  expect(rows.filter((r) => r.license === summary)).toEqual([]);
  expect([...checklists.values()]).not.toContain(summary);
});

test("E7: no IUCN string or threatStatus in the three files", async ({ request }) => {
  const parquet = await db.rows(`SELECT to_json(t)::VARCHAR AS j FROM ${PARQUET} AS t`);
  const texts = [
    await (await request.get("/v1/range-listings.json")).text(),
    await (await request.get("/v1/range-listings.csv")).text(),
    (await request.get("/v1/range-listings.parquet").then((r) => r.body())).toString("latin1"),
    parquet.map((r) => r.j).join("\n"),
  ];
  for (const text of texts) {
    expect(text.length).toBeGreaterThan(0);
    expect(text).not.toMatch(/iucn/i);
    expect(text).not.toContain("threatStatus");
  }
});

test("E8: the committed snapshots hold only the kept keys, and no red-list dataset or MDD status", async () => {
  const sorted = (o: object) => Object.keys(o).sort();
  const raw = await readFile(repoPath("data/raw/gbif-checklists/snapshot.json"), "utf8");
  const checklists = JSON.parse(raw) as { datasets: Record<string, object>; species: Record<string, { rows: object[] }> };
  const datasets = Object.values(checklists.datasets);
  const checklistRows = Object.values(checklists.species).flatMap((s) => s.rows);
  expect(datasets.length).toBeGreaterThan(0);
  expect(checklistRows.length).toBeGreaterThan(0);
  for (const d of datasets) expect(sorted(d)).toEqual(["citation", "doi", "license", "title"]);
  for (const r of checklistRows) expect(sorted(r)).toEqual(["country", "datasetKey", "establishmentMeans", "sourceTaxonKey", "status"]);
  expect(raw).not.toMatch(/iucn|threatStatus|19491596/i);

  const mddRaw = await readFile(repoPath("data/raw/mdd/snapshot.json"), "utf8");
  const mdd = JSON.parse(mddRaw) as { species: Record<string, object | null> };
  const cells = Object.values(mdd.species).filter((c) => c !== null);
  expect(cells.length).toBeGreaterThan(0);
  for (const c of cells) expect(sorted(c!)).toEqual(["id", "places"]);
  expect(mddRaw).not.toMatch(/iucn|"extinct"/i);
});

const row = (speciesId: number, country: string, origin: ConflictRow["origin"], presence: ConflictRow["presence"], sourceKey: string, area: string | null = null): ConflictRow =>
  ({ speciesId, country, area, origin, presence, sourceKey });

// 007's six cases, one species each.
const FIXED_ROWS: ConflictRow[] = [
  row(1, "KE", "native-or-pre-1500", "present", "mdd"), row(1, "KE", "introduced", "present", "a"),
  row(2, "KZ", "native", "absent", "a"), row(2, "KZ", "introduced", "present", "b"),
  row(3, "US", "introduced", "absent", "a"), row(3, "US", "introduced", "present", "b"),
  row(4, "US", "native", "present", "curated"), row(4, "US", "introduced", "present", "a", "Hawaii"),
  row(5, "BR", "native", "present", "curated"), row(5, "BR", "native-or-pre-1500", "present", "mdd"),
  row(6, "BR", "uncertain", "present", "a"), row(6, "BR", "introduced", "present", "b"),
];
const FIXED_FOUND = [{ speciesId: 1, country: "KE" }, { speciesId: 2, country: "KZ" }, { speciesId: 3, country: "US" }];

test("conflict rule on fixed rows: rangeConflicts finds exactly 007's three", () => {
  expect(rangeConflicts(FIXED_ROWS).map(({ speciesId, country }) => ({ speciesId, country }))).toEqual(FIXED_FOUND);
});
