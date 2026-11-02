// GBIF checklists ingest (plan F1). Written before the code, seen failing first. Failure modes:
// 1. A key beyond the five leaks on a row (threatStatus, appendixCites, locality, remarks), or beyond the four on a dataset.
// 2. assertNoIucnData passes a threatStatus key.
// 3. The red-list dataset's rows or key get written. Only its count may.
// 4. A no-role row gets written, or isn't counted under its dataset key.
// 5. A row with no sourceTaxonKey gets written, or isn't counted.
// 6. An unknown license URL passes; a role dataset at CC BY-NC 4.0 passes because DATASET_LICENSES holds it.
// 7. A role dataset lacking doi, title or citation.text passes.
// 8. Metadata is fetched for a no-role dataset.
// 9. A failed request or short page leaves a partial result instead of throwing.
// 10. A species with no keys goes missing; it must be { keys: [], rows: [] }.
// 11. Two keys on one species lose rows, or fetch one key twice.
// 12. Row order depends on fetch order.
// 13. The snapshot's allowlist carries reason, or loses area.
// (14, checklistKeys: scripts/derive/gbif.test.ts.)
import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { assertNoIucnData } from "../raw.ts";
import { CHECKLIST_ROLES } from "./checklist-roles.ts";
import { fetchGbifChecklists } from "./gbif-checklists.ts";

const RED_LIST = "19491596-35ae-4a91-9a98-85cf505f1bd3";
const ROLE_A = "39f36f10-559b-427f-8c86-2d28afff68ca"; // no area
const ROLE_B = "6baf6a53-c106-40fb-bbde-f6d4e4051513"; // area Hawaii
const NO_ROLE = "00000000-0000-4000-8000-000000000001";
const CC_BY = "http://creativecommons.org/licenses/by/4.0/legalcode";
const CC0 = "http://creativecommons.org/publicdomain/zero/1.0/legalcode";
const NC = "http://creativecommons.org/licenses/by-nc/4.0/legalcode";

const meta = (over: object = {}) => ({
  title: "A list", license: CC_BY, doi: "10.15468/abc", citation: { text: "A list. Cited.", citationProvidedBySource: true },
  description: "unkept", contacts: [{ lastName: "unkept" }], ...over,
});

interface Fixture {
  distributions: Record<number, { pages?: object[][]; status?: number }>; // per species key; one page unless pages given
  taxa?: Record<number, string>; // sourceTaxonKey → datasetKey
  datasets?: Record<string, object>;
}

// Answers GBIF's three endpoints from the fixture; returns every path asked, in order.
function gbif(t: TestContext, { distributions, taxa = {}, datasets = {} }: Fixture): string[] {
  const asked: string[] = [];
  t.mock.method(globalThis, "fetch", async (input: string) => {
    const url = new URL(input);
    const path = url.pathname.replace("/v1", "");
    asked.push(path);
    const dist = /^\/species\/(\d+)\/distributions$/.exec(path);
    if (dist) {
      const entry = distributions[Number(dist[1])];
      if (entry?.status) return new Response("no", { status: entry.status });
      const pages = entry?.pages ?? [[]];
      const offset = Number(url.searchParams.get("offset"));
      let start = 0;
      for (const [i, page] of pages.entries()) {
        if (offset === start) return Response.json({ results: page, endOfRecords: i === pages.length - 1 });
        start += page.length;
      }
      return Response.json({ results: [], endOfRecords: false });
    }
    const usage = /^\/species\/(\d+)$/.exec(path);
    if (usage) return Response.json({ key: Number(usage[1]), datasetKey: taxa[Number(usage[1])] });
    const dataset = /^\/dataset\/([-0-9a-f]+)$/.exec(path);
    if (dataset) return Response.json(datasets[dataset[1]] ?? meta());
    return new Response("unexpected", { status: 404 });
  });
  return asked;
}

const row = (sourceTaxonKey: number, country: string, over: object = {}) => ({ sourceTaxonKey, country, establishmentMeans: "INTRODUCED", status: "PRESENT", ...over });

test("F1(1,11,12) kept rows have exactly five keys, sorted whatever the fetch order; both keys fetched once; datasets exactly four", async (t) => {
  const asked = gbif(t, {
    distributions: {
      1: { pages: [[row(20, "US", { threatStatus: "VULNERABLE", appendixCites: "II", locality: "Somewhere", remarks: "A note" }), row(10, "SE")]] },
      2: { pages: [[row(10, "BE", { establishmentMeans: undefined, status: undefined, country: undefined })]] },
    },
    taxa: { 10: ROLE_A, 20: ROLE_B },
    datasets: { [ROLE_B]: meta({ title: "Hawaii", license: CC0 }) },
  });
  const out = await fetchGbifChecklists({ "A a": [1, 2] });
  assert.deepEqual(out.species["A a"], {
    keys: [1, 2],
    rows: [
      { datasetKey: ROLE_A, sourceTaxonKey: 10, country: null, establishmentMeans: null, status: null },
      { datasetKey: ROLE_A, sourceTaxonKey: 10, country: "SE", establishmentMeans: "INTRODUCED", status: "PRESENT" },
      { datasetKey: ROLE_B, sourceTaxonKey: 20, country: "US", establishmentMeans: "INTRODUCED", status: "PRESENT" },
    ],
  });
  assert.deepEqual(out.datasets, {
    [ROLE_A]: { title: "A list", license: "CC BY 4.0", doi: "10.15468/abc", citation: "A list. Cited." },
    [ROLE_B]: { title: "Hawaii", license: "CC0 1.0", doi: "10.15468/abc", citation: "A list. Cited." },
  });
  assert.equal(asked.filter((p) => p === "/species/1/distributions").length, 1);
  assert.equal(asked.filter((p) => p === "/species/2/distributions").length, 1);
  assert.equal(asked.filter((p) => p === "/species/10").length, 1, "a taxon's dataset is read once");
});

test("F1(12) the same rows fetched in another order give the same snapshot", async (t) => {
  const rows = [row(20, "US"), row(10, "SE"), row(10, "BE")];
  const run = async (order: object[]) => {
    t.mock.restoreAll();
    gbif(t, { distributions: { 1: { pages: [order] } }, taxa: { 10: ROLE_A, 20: ROLE_B } });
    return fetchGbifChecklists({ "A a": [1] });
  };
  assert.deepEqual(await run(rows), await run([...rows].reverse()));
});

test("F1(3,4,5,8,10) red-list, no-role and keyless rows are only counted; no metadata for them; a species with no keys stays", async (t) => {
  const asked = gbif(t, {
    distributions: { 1: { pages: [[
      row(30, "US"), row(30, "CA"), // red list
      row(40, "DE"), row(40, "FR"), row(41, "IT"), // no role
      { country: "XX", establishmentMeans: "NATIVE", status: "PRESENT" }, // no sourceTaxonKey
    ]] } },
    taxa: { 30: RED_LIST, 40: NO_ROLE, 41: NO_ROLE },
  });
  const out = await fetchGbifChecklists({ "A a": [1], "B b": [] });
  assert.deepEqual(out.species, { "A a": { keys: [1], rows: [] }, "B b": { keys: [], rows: [] } });
  assert.deepEqual(out.dropped, { noSourceTaxonKey: 1, redList: 2, noRole: { [NO_ROLE]: 3 } });
  assert.deepEqual(out.datasets, {});
  assert.ok(!asked.some((p) => p.startsWith("/dataset/")), "no metadata for a dataset without a role");
  assert.ok(!JSON.stringify(out).includes(RED_LIST), "the red-list key is never written");
});

test("F1(2) the guard refuses a threatStatus key, wherever it sits", () => {
  assert.throws(() => assertNoIucnData({ species: { rows: [{ threatStatus: "VULNERABLE" }] } }), /IUCN data at \$\.species\.rows\.0\.threatStatus/);
});

test("F1(1,2) a kept field naming IUCN refuses at the ingest: nothing returned", async (t) => {
  gbif(t, { distributions: { 1: { pages: [[row(10, "SE")]] } }, taxa: { 10: ROLE_A }, datasets: { [ROLE_A]: meta({ title: "IUCN list" }) } });
  await assert.rejects(fetchGbifChecklists({ "A a": [1] }), /IUCN data at .*title/);
});

for (const [why, over, message] of [
  ["an unknown license URL", { license: "https://example.org/mine" }, /license "https:\/\/example.org\/mine"/],
  ["no license", { license: undefined }, /license null/],
  ["CC BY-NC 4.0, though DATASET_LICENSES holds it", { license: NC }, /license ".*by-nc.*"/],
  ["no doi", { doi: undefined }, /no doi/],
  ["no title", { title: undefined }, /no title/],
  ["no citation.text", { citation: {} }, /no citation/],
] as const) {
  test(`F1(6,7) a role dataset with ${why} refuses`, async (t) => {
    gbif(t, { distributions: { 1: { pages: [[row(10, "SE")]] } }, taxa: { 10: ROLE_A }, datasets: { [ROLE_A]: meta(over) } });
    await assert.rejects(fetchGbifChecklists({ "A a": [1] }), (e: Error) => message.test(e.message) && e.message.includes(ROLE_A));
  });
}

test("F1(6) a no-role dataset's license is never read, so it can't refuse", async (t) => {
  gbif(t, { distributions: { 1: { pages: [[row(40, "DE")]] } }, taxa: { 40: NO_ROLE }, datasets: { [NO_ROLE]: meta({ license: NC }) } });
  assert.deepEqual((await fetchGbifChecklists({ "A a": [1] })).dropped.noRole, { [NO_ROLE]: 1 });
});

test("F1(9) a failed request throws at once, no partial result", async (t) => {
  gbif(t, { distributions: { 1: { pages: [[row(10, "SE")]] }, 2: { status: 404 } }, taxa: { 10: ROLE_A } });
  await assert.rejects(fetchGbifChecklists({ "A a": [1, 2] }), /404/);
});

test("F1(9) an empty page before endOfRecords throws; a short page is followed to the end", async (t) => {
  gbif(t, { distributions: { 1: { pages: [[row(10, "SE")], [row(10, "BE")]] } }, taxa: { 10: ROLE_A } });
  assert.equal((await fetchGbifChecklists({ "A a": [1] })).species["A a"].rows.length, 2);
  t.mock.restoreAll();
  t.mock.method(globalThis, "fetch", async () => Response.json({ results: [], endOfRecords: false }));
  await assert.rejects(fetchGbifChecklists({ "A a": [1] }), /empty page/);
});

test("F1(9) a sourceTaxonKey with no dataset throws", async (t) => {
  gbif(t, { distributions: { 1: { pages: [[row(99, "SE")]] } } });
  await assert.rejects(fetchGbifChecklists({ "A a": [1] }), /sourceTaxonKey 99: no datasetKey/);
});

test("F1(13) the allowlist holds every role's role and area, never a reason", async (t) => {
  gbif(t, { distributions: {} });
  const { allowlist } = await fetchGbifChecklists({});
  assert.equal(Object.keys(allowlist).length, 18);
  assert.deepEqual(allowlist[ROLE_B], { role: "register", area: "Hawaii" });
  for (const [key, entry] of Object.entries(allowlist)) {
    assert.deepEqual(Object.keys(entry).sort(), ["area", "role"]);
    assert.deepEqual(entry, { role: CHECKLIST_ROLES[key].role, area: CHECKLIST_ROLES[key].area });
  }
  assert.ok(!Object.keys(allowlist).includes(RED_LIST));
  assertNoIucnData(allowlist);
});

