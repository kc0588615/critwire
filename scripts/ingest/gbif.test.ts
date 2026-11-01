// H3 (plan D14 SC3): the datasetKey facet pages moving under the ingest. Written before the code, seen failing first.
// Failure modes: a page whose total count differs from the countries query (the index moved between requests), or a
// key already seen on an earlier page (pages shifted), is accepted and the counts are summed wrong.
// PG (fetchDatasets, paging past FACET_LIMIT against a fixture fetch). Written before the tests, failure modes:
// (a) a page of 300 taken as the end, so datasets past 300 are lost, or the stored URL isn't offset 0's;
// (b) exactly 300 datasets: paging doesn't stop at the empty page at 300, or stops without asking for it;
// (c) a short page taken as the end, though GBIF may return one mid-way;
// (d) pages that overlap are summed twice instead of refused;
// (e) the total moves between pages and the mixed counts are kept;
// (f) facet counts short of the query's count are stored as if complete.
import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { fetchDatasets, toDatasetPage } from "./gbif.ts";

const URL_ = "https://api.gbif.org/v1/occurrence/search?facet=datasetKey";
const K1 = "50c9509d-22c7-4a22-a47d-8c48425ef4a7";
const K2 = "4fa7b334-ce0d-4e88-aaae-2e0c138d049e";
const page = (count: number, counts: { name: string; count: number }[]) =>
  ({ count, results: [], facets: [{ field: "DATASET_KEY", counts }] });

test("H3 a page with the countries query's count and new keys passes; an empty page ends paging", () => {
  assert.deepEqual(toDatasetPage(URL_, page(7, [{ name: K1, count: 7 }]), 7, {}), [{ name: K1, count: 7 }]);
  assert.deepEqual(toDatasetPage(URL_, { count: 7, results: [], facets: [] }, 7, { [K1]: 7 }), []);
});

test("H3 a page whose count changed refuses (index moved)", () => {
  assert.throws(() => toDatasetPage(URL_, page(8, [{ name: K1, count: 8 }]), 7, {}), /count 8 ≠ countries query count 7 \(index moved; re-run\)/);
});

test("H3 a key seen on an earlier page refuses (pages shifted)", () => {
  assert.throws(() => toDatasetPage(URL_, page(7, [{ name: K1, count: 3 }, { name: K2, count: 4 }]), 7, { [K1]: 3 }),
    new RegExp(`datasetKey ${K1} repeated across pages`));
});

test("H3 a bad key, a non-positive count, results or another facet refuse", () => {
  assert.throws(() => toDatasetPage(URL_, page(7, [{ name: "nope", count: 7 }]), 7, {}), /bad datasetKey "nope"/);
  assert.throws(() => toDatasetPage(URL_, page(7, [{ name: K1, count: 0 }]), 7, {}), new RegExp(`${K1} count 0`));
  assert.throws(() => toDatasetPage(URL_, { ...page(7, []), results: [{}] }, 7, {}), /limit=0 returned 1 results/);
  assert.throws(() => toDatasetPage(URL_, { count: 7, results: [], facets: [{ field: "COUNTRY", counts: [] }] }, 7, {}), /unexpected facets/);
});

type Row = { name: string; count: number };
const TAXON = 2431950;
const key = (i: number) => `00000000-0000-4000-8000-${i.toString(16).padStart(12, "0")}`;
const rows = (from: number, n: number): Row[] => Array.from({ length: n }, (_, i) => ({ name: key(from + i), count: 1 }));
// Answers fetch by facetOffset from `pages`, an empty page past them, and returns the offsets asked for in order.
function fixture(t: TestContext, pages: Record<number, Row[]>, total: number | ((offset: number) => number)): number[] {
  const asked: number[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    const offset = Number(new URL(url).searchParams.get("facetOffset"));
    asked.push(offset);
    const count = typeof total === "number" ? total : total(offset);
    return Response.json({ count, results: [], facets: pages[offset] ? [{ field: "DATASET_KEY", counts: pages[offset] }] : [] });
  });
  return asked;
}

test("PG(a) 305 datasets: asks offsets 0, 300, 600, keeps all 305, stores offset 0's URL", async (t) => {
  const asked = fixture(t, { 0: rows(0, 300), 300: rows(300, 5) }, 305);
  const { url, counts } = await fetchDatasets(TAXON, 305);
  assert.deepEqual(asked, [0, 300, 600]);
  assert.equal(Object.keys(counts).length, 305);
  assert.equal(counts[key(304)], 1);
  assert.equal(new URL(url).searchParams.get("facetOffset"), "0");
});

test("PG(b) exactly 300 datasets: stops after the empty page at 300", async (t) => {
  const asked = fixture(t, { 0: rows(0, 300) }, 300);
  assert.equal(Object.keys((await fetchDatasets(TAXON, 300)).counts).length, 300);
  assert.deepEqual(asked, [0, 300]);
});

test("PG(c) a short page doesn't end paging", async (t) => {
  const asked = fixture(t, { 0: rows(0, 100), 300: rows(100, 5) }, 105);
  assert.equal(Object.keys((await fetchDatasets(TAXON, 105)).counts).length, 105);
  assert.deepEqual(asked, [0, 300, 600]);
});

test("PG(d) overlapping pages refuse", async (t) => {
  fixture(t, { 0: rows(0, 300), 300: rows(299, 2) }, 302);
  await assert.rejects(fetchDatasets(TAXON, 302), new RegExp(`datasetKey ${key(299)} repeated across pages`));
});

test("PG(e) a total that moves on page 2 refuses", async (t) => {
  fixture(t, { 0: rows(0, 300), 300: rows(300, 5) }, (offset) => (offset === 0 ? 305 : 306));
  await assert.rejects(fetchDatasets(TAXON, 305), /count 306 ≠ countries query count 305 \(index moved; re-run\)/);
});

test("PG(f) facet counts short of the query's count refuse", async (t) => {
  fixture(t, { 0: rows(0, 7) }, 10);
  await assert.rejects(fetchDatasets(TAXON, 10), new RegExp(`taxon ${TAXON}: datasetKey counts sum to 7, count is 10`));
});
