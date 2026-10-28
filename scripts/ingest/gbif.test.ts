// H3 (plan D14 SC3): the datasetKey facet pages moving under the ingest. Written before the code, seen failing first.
// Failure modes: a page whose total count differs from the countries query (the index moved between requests), or a
// key already seen on an earlier page (pages shifted), is accepted and the counts are summed wrong.
import { test } from "node:test";
import assert from "node:assert/strict";
import { toDatasetPage } from "./gbif.ts";

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
