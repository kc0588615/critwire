// GBIF derived-dataset contribution tests (plan §5 Derive). Failure modes first:
// D1: a taxon whose datasetKey counts don't sum to its query's `count` is registered → throws.
// D2: a settled species without dataset counts (raw from before the datasetKey facet) is skipped → throws, naming the ingest.
// D3: two species on one GBIF taxon key count its records twice → counted once, with both species ids; two species on
//     one key with different raw → throws.
// D4: an unsettled species (taxonKey null) contributes records → excluded.
// D5: a taxon with zero records is dropped, or adds a dataset with 0 records (GBIF rejects counts ≤ 0) → listed with
//     records 0, no dataset.
// D6: a dataset key that isn't a lowercase UUID, or a count that isn't a positive integer, is registered → throws.
// D7: the output depends on input order → shuffled input gives the same output.
import assert from "node:assert/strict";
import { test } from "node:test";
import { gbifContributions, type ContributionInput } from "./contributions.ts";

const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const C = "cccccccc-0000-4000-8000-000000000003";
const url = (taxonKey: number) => `https://api.gbif.org/v1/occurrence/search?taxonKey=${taxonKey}&facet=country`;

function taxon(speciesId: number, taxonKey: number | null, counts: Record<string, number> | null, count?: number): ContributionInput {
  const key = taxonKey ?? 999;
  const total = count ?? Object.values(counts ?? {}).reduce((a, n) => a + n, 0);
  return {
    speciesId, taxonKey,
    occurrences: { url: url(key), response: { count: total, facets: [] } },
    datasets: counts === null ? null : { url: `${url(key)}&facet=datasetKey&facetOffset=0`, counts },
  };
}

test("D1 counts that don't sum to the query's count throw", () => {
  assert.throws(() => gbifContributions("2026-10-21", [taxon(1, 10, { [A]: 3, [B]: 4 }, 8)]), /taxon 10.*7.*8/);
});

test("D2 a settled species without dataset counts throws, naming the ingest", () => {
  assert.throws(() => gbifContributions("2026-10-21", [taxon(1, 10, null, 5)]), /data\/raw\/gbif is stale: run pnpm ingest gbif/);
  const noQuery = { ...taxon(1, 10, { [A]: 1 }), occurrences: null };
  assert.throws(() => gbifContributions("2026-10-21", [noQuery]), /data\/raw\/gbif is stale: run pnpm ingest gbif/);
});

test("D3 one taxon key on two species counts once; different raw on a shared key throws", () => {
  const out = gbifContributions("2026-10-21", [taxon(4, 10, { [A]: 3, [B]: 4 }), taxon(2, 10, { [A]: 3, [B]: 4 })]);
  assert.deepEqual(out.taxa, [{ taxonKey: 10, speciesIds: [2, 4], records: 7, url: url(10) }]);
  assert.deepEqual(out.datasets, { [A]: 3, [B]: 4 });
  assert.equal(out.records, 7);
  assert.throws(() => gbifContributions("2026-10-21", [taxon(4, 10, { [A]: 3, [B]: 4 }), taxon(2, 10, { [A]: 3, [B]: 5 })]), /taxon 10.*species 2 and 4/);
});

test("D4 unsettled species are excluded", () => {
  const out = gbifContributions("2026-10-21", [taxon(1, 10, { [A]: 3 }), taxon(2, null, { [B]: 50 }), taxon(3, null, null, 9)]);
  assert.deepEqual(out.taxa.map((t) => t.speciesIds), [[1]]);
  assert.deepEqual(out.datasets, { [A]: 3 });
  assert.equal(out.records, 3);
});

test("D5 a zero-record taxon is listed but adds no dataset", () => {
  const out = gbifContributions("2026-10-21", [taxon(1, 10, { [A]: 3 }), taxon(2, 20, {})]);
  assert.deepEqual(out.taxa, [{ taxonKey: 10, speciesIds: [1], records: 3, url: url(10) }, { taxonKey: 20, speciesIds: [2], records: 0, url: url(20) }]);
  assert.deepEqual(out.datasets, { [A]: 3 });
});

test("D6 a bad dataset key or a count that isn't a positive integer throws", () => {
  assert.throws(() => gbifContributions("2026-10-21", [taxon(1, 10, { "not-a-uuid": 3 })]), /dataset key/);
  assert.throws(() => gbifContributions("2026-10-21", [taxon(1, 10, { [A.toUpperCase()]: 3 })]), /dataset key/);
  assert.throws(() => gbifContributions("2026-10-21", [taxon(1, 10, { [A]: 0 })]), /count 0/);
  assert.throws(() => gbifContributions("2026-10-21", [taxon(1, 10, { [A]: -2, [B]: 4 })]), /count -2/);
  assert.throws(() => gbifContributions("2026-10-21", [taxon(1, 10, { [A]: 1.5, [B]: 1.5 })]), /count 1.5/);
});

test("D7 shuffled input gives the same output, sums per dataset across taxa", () => {
  const species = [taxon(1, 30, { [B]: 2, [A]: 1 }), taxon(2, 10, { [C]: 5, [A]: 4 }), taxon(3, 20, {}), taxon(4, 10, { [C]: 5, [A]: 4 }), taxon(5, null, null)];
  const want = {
    retrieved: "2026-10-21", records: 12,
    taxa: [
      { taxonKey: 10, speciesIds: [2, 4], records: 9, url: url(10) },
      { taxonKey: 20, speciesIds: [3], records: 0, url: url(20) },
      { taxonKey: 30, speciesIds: [1], records: 3, url: url(30) },
    ],
    datasets: { [A]: 5, [B]: 2, [C]: 5 },
  };
  const out = gbifContributions("2026-10-21", species);
  assert.deepEqual(out, want);
  assert.deepEqual(Object.keys(out.datasets), [A, B, C]);
  assert.deepEqual(gbifContributions("2026-10-21", [...species].reverse()), want);
  assert.deepEqual(gbifContributions("2026-10-21", [species[2], species[4], species[0], species[3], species[1]]), want);
});
