// GBIF rule tests (plan §5.3, §7). Failure modes first:
// G1: an EXACT SPECIES match of the same canonical name with no P846 is rejected → ids.gbif = usageKey, countries
//     counted for that key.
// G2: a backbone synonym (Emydoidea blandingii → Emys blandingii) with one P846 equal to the usage or accepted key is
//     blanked, or passes unmarked → filled + synonym-info (info) naming the accepted key the countries are counted for.
// G3: a single P846 outside {usageKey, acceptedKey} is ignored → identity, ids.gbif and countries null. Several P846
//     values (the multi-value entry is §5.1's) → ids.gbif and countries null, no second entry.
// G4: FUZZY, HIGHERRANK, NONE, a non-SPECIES rank, another canonical name, a non-Animalia classification, or a status
//     that is neither ACCEPTED nor a synonym is accepted → ids.gbif and countries null + not-found (or identity for
//     the status).
// G5: a synonym whose accepted name has another epithet (a lump) publishes the other species' countries → id kept,
//     countries null + identity (blocking) on range.countriesWithOpenRecords.
// G6: a usage or accepted key that isn't an integer is passed on, or an unknown backbone license is mapped → throws.
// G7: a LICENSE facet containing CC_BY_NC_4_0 (or any license outside CC0 1.0 / CC BY 4.0), a missing LICENSE facet,
//     or license counts that don't sum to `count` → throws (the country list must come only from CC0 and CC BY records).
import assert from "node:assert/strict";
import { test } from "node:test";
import { deriveGbif, gbifBackboneLicense } from "./gbif.ts";
import { assertOpenLicenses, type GbifMatchResponse, type GbifOccurrenceResponse, type GbifUsage } from "../raw.ts";
import type { Mismatch } from "../species.ts";

function occurrences(count: number, licenses: Record<string, number> | null): GbifOccurrenceResponse {
  const facets = [{ field: "COUNTRY", counts: [{ name: "CA", count: 1 }] }];
  if (licenses) facets.unshift({ field: "LICENSE", counts: Object.entries(licenses).map(([name, n]) => ({ name, count: n })) });
  return { count, facets };
}

test("G7 assertOpenLicenses throws on a non-open license or counts that don't sum to count", () => {
  assert.throws(() => assertOpenLicenses(occurrences(1409, { CC0_1_0: 365, CC_BY_4_0: 944, CC_BY_NC_4_0: 100 })), /CC_BY_NC_4_0/);
  assert.throws(() => assertOpenLicenses(occurrences(10, { UNSPECIFIED: 10 })), /UNSPECIFIED/);
  assert.throws(() => assertOpenLicenses(occurrences(1310, { CC0_1_0: 365, CC_BY_4_0: 944 })), /1309.*1310|1310.*1309/);
  assert.throws(() => assertOpenLicenses(occurrences(5, null)), /LICENSE/);
  assert.doesNotThrow(() => assertOpenLicenses(occurrences(1309, { CC0_1_0: 365, CC_BY_4_0: 944 })));
  assert.doesNotThrow(() => assertOpenLicenses({ count: 0, facets: [] }));
});

const SPECIES = { id: 1, scientificName: "Emydoidea blandingii" };
const usage = (key: string, canonicalName: string, status?: string): GbifUsage => {
  const [genericName, specificEpithet] = canonicalName.split(" ");
  return { key, name: `${canonicalName} (Holbrook, 1838)`, canonicalName, rank: "SPECIES", genericName, specificEpithet, ...(status ? { status } : {}) };
};
const KINGDOM = [{ key: "1", name: "Animalia", rank: "KINGDOM" }, { key: "44", name: "Chordata", rank: "PHYLUM" }];
function match(over: { matchType?: string; usage?: Partial<GbifUsage>; accepted?: GbifUsage; kingdom?: string } = {}): GbifMatchResponse {
  return {
    usage: { ...usage("2442885", "Emydoidea blandingii", over.accepted ? "SYNONYM" : "ACCEPTED"), ...over.usage },
    ...(over.accepted ? { acceptedUsage: over.accepted, synonym: true } : {}),
    classification: over.kingdom ? [{ key: "6", name: over.kingdom, rank: "KINGDOM" }] : KINGDOM,
    diagnostics: { matchType: over.matchType ?? "EXACT", confidence: 98 },
  };
}
const EMYS = usage("5220530", "Emys blandingii");
const kinds = (entries: Mismatch[]) => entries.map((e) => `${e.field}:${e.kind}:${e.severity}`).sort();

test("G1 EXACT SPECIES same name, no P846 → usageKey, countries for that key", () => {
  assert.deepEqual(deriveGbif(SPECIES, match(), []), { id: 2442885, taxonKey: 2442885, entries: [] });
  assert.deepEqual(deriveGbif(SPECIES, match(), [2442885]), { id: 2442885, taxonKey: 2442885, entries: [] });
});

test("G2 synonym with P846 = usage or accepted key → filled + synonym-info naming the accepted key", () => {
  for (const p846 of [[], [2442885], [5220530]]) {
    const r = deriveGbif(SPECIES, match({ accepted: EMYS }), p846);
    assert.equal(r.id, 2442885);
    assert.equal(r.taxonKey, 5220530);
    assert.deepEqual(kinds(r.entries), ["ids.gbif:synonym-info:info"]);
    assert.deepEqual(r.entries[0].values, { gbif: { usageKey: 2442885, status: "SYNONYM", accepted: { key: 5220530, name: "Emys blandingii" } } });
    assert.match(r.entries[0].reason, /Emys blandingii.*5220530.*countr/);
  }
});

test("G3 P846 outside {usageKey, acceptedKey} → identity, id and countries null; several P846 → null, no entry", () => {
  const r = deriveGbif(SPECIES, match({ accepted: EMYS }), [999]);
  assert.deepEqual([r.id, r.taxonKey], [null, null]);
  assert.deepEqual(kinds(r.entries), ["ids.gbif:identity:blocking"]);
  assert.deepEqual(r.entries[0].values, { gbif: { usageKey: 2442885, acceptedKey: 5220530 }, wikidata: [999] });
  assert.deepEqual(deriveGbif(SPECIES, match({ accepted: EMYS }), [2442885, 5220530]), { id: null, taxonKey: null, entries: [] });
});

test("G4 FUZZY, HIGHERRANK, NONE, other rank/name/kingdom → not-found; odd status → identity", () => {
  const cases: GbifMatchResponse[] = [
    match({ matchType: "FUZZY" }),
    match({ matchType: "HIGHERRANK", usage: { rank: "GENUS", canonicalName: "Emydoidea" } }),
    { diagnostics: { matchType: "NONE" } },
    match({ usage: { rank: "SUBSPECIES" } }),
    match({ usage: { canonicalName: "Emydoidea blandingi" } }),
    match({ kingdom: "Plantae" }),
  ];
  for (const m of cases) {
    const r = deriveGbif(SPECIES, m, []);
    assert.deepEqual([r.id, r.taxonKey], [null, null], JSON.stringify(m.diagnostics));
    assert.deepEqual(kinds(r.entries), ["ids.gbif:not-found:blocking"], JSON.stringify(m));
  }
  const doubtful = deriveGbif(SPECIES, match({ usage: { status: "DOUBTFUL" } }), []);
  assert.deepEqual([doubtful.id, doubtful.taxonKey], [null, null]);
  assert.deepEqual(kinds(doubtful.entries), ["ids.gbif:identity:blocking"]);
});

test("G5 accepted name with another epithet (lump) → id kept, countries null + identity on countries", () => {
  const r = deriveGbif(SPECIES, match({ accepted: usage("5220531", "Emys orbicularis") }), []);
  assert.equal(r.id, 2442885);
  assert.equal(r.taxonKey, null);
  assert.deepEqual(kinds(r.entries), ["ids.gbif:synonym-info:info", "range.countriesWithOpenRecords:identity:blocking"]);
  // A genus move with the same epithet is not a lump (Smutsia gigantea → Manis gigantea).
  const pangolin = deriveGbif({ id: 55, scientificName: "Smutsia gigantea" }, match({ usage: usage("5786559", "Smutsia gigantea", "SYNONYM"), accepted: usage("5219631", "Manis gigantea") }), []);
  assert.deepEqual([pangolin.id, pangolin.taxonKey], [5786559, 5219631]);
  assert.deepEqual(kinds(pangolin.entries), ["ids.gbif:synonym-info:info"]);
});

test("G6 a key that isn't an integer, a synonym without an accepted usage, or an unknown license → throws", () => {
  assert.throws(() => deriveGbif(SPECIES, match({ usage: { key: "2442885a" } }), []), /integer/);
  assert.throws(() => deriveGbif(SPECIES, match({ usage: { key: "39LSJ" } }), []), /integer/);
  assert.throws(() => deriveGbif(SPECIES, match({ accepted: { ...EMYS, key: "1.5" } }), []), /integer/);
  assert.throws(() => deriveGbif(SPECIES, match({ usage: { status: "SYNONYM" } }), []), /accepted/);
  assert.equal(gbifBackboneLicense("http://creativecommons.org/licenses/by/4.0/legalcode"), "CC BY 4.0");
  for (const l of ["http://creativecommons.org/licenses/by-nc/4.0/legalcode", "CC_BY_4_0", ""]) assert.throws(() => gbifBackboneLicense(l), /license/);
});
