// Countries rule tests (plan §5.4, §5.5, §7). Failure modes first:
// K1: ZZ (unknown country) is counted or published → must be dropped before every rule, and not count towards T.
// K2: T < 50: an in-core singleton is flagged or dropped → must be kept with no entry (saola VN 2, LA 1).
// K3: T ≥ 50: in-core counts of 1 and 2 not flagged → kept + country-borderline (review); 3 → no entry.
// K4: a single record outside the core region is published → excluded + country-captive-suspect (blocking), at any T
//     (hirola US 1).
// K5: a country outside the core with ≥ 2 records is dropped or unflagged → kept + country-captive-suspect (review)
//     (tiger DE 6, RU 8).
// K6: core chosen by records instead of countries (elephant US 4,461 would be core and the range flagged);
//     ties not broken by records, or full ties not all core; NORTH_AMERICA and LATIN_AMERICA treated as different
//     regions (spiny softshell MX, jaguar US flagged).
// K7: a country code missing from GBIF's enumeration is silently accepted → throws.
// K8: overrides: keep doesn't restore a stray or leaves its entry; remove doesn't drop; keep of a country with no
//     counted records, an unknown species, a duplicate, bad keys/action/code/reason, or an override on a species
//     whose countries are null are accepted → each throws.
// K9: T == 0 publishes [] or throws → null, status no-open-records, + no-records (info).
// K11: status wrong or [] published: a list without ok; overrides removing every country leave []; an unsettled taxon
//      is not identity-unsettled → null + the right status, never [].
// K10: output depends on facet order → value and entries sorted and identical for shuffled input.
import assert from "node:assert/strict";
import { test } from "node:test";
import { deriveCountries, parseOverrides } from "./countries.ts";
import type { GbifOccurrenceResponse, GbifSnapshot } from "../raw.ts";
import type { CountryOverride, Mismatch } from "../species.ts";

const REGION: Record<string, string> = {
  US: "NORTH_AMERICA", CA: "NORTH_AMERICA", MX: "LATIN_AMERICA", BR: "LATIN_AMERICA", HN: "LATIN_AMERICA",
  DE: "EUROPE", NL: "EUROPE", RU: "EUROPE", FR: "EUROPE",
  IN: "ASIA", NP: "ASIA", BD: "ASIA", VN: "ASIA", LA: "ASIA",
  KE: "AFRICA", ZA: "AFRICA", TZ: "AFRICA",
};
const regions: GbifSnapshot["countries"] = Object.fromEntries(
  Object.entries(REGION).map(([iso2, gbifRegion]) => [iso2, { gbifRegion, title: iso2 }]),
);
const species = { id: 25, scientificName: "Panthera tigris" };

function occ(counts: Record<string, number>): GbifOccurrenceResponse {
  const total = Object.values(counts).reduce((a, n) => a + n, 0);
  return {
    count: total,
    facets: [
      { field: "COUNTRY", counts: Object.entries(counts).map(([name, count]) => ({ name, count })) },
      { field: "LICENSE", counts: total ? [{ name: "CC_BY_4_0", count: total }] : [] },
    ],
  };
}

function run(counts: Record<string, number>, overrides: CountryOverride[] = []) {
  return deriveCountries({ species, occurrences: occ(counts), regions, overrides });
}

const flags = (entries: Mismatch[]) => entries.map((e) => `${e.country ?? ""}:${e.kind}:${e.severity}`);
const keep = (country: string, speciesId = 25): CountryOverride => ({ speciesId, country, action: "keep", reason: "checked" });
const remove = (country: string, speciesId = 25): CountryOverride => ({ speciesId, country, action: "remove", reason: "checked" });

const TIGER = { IN: 100, NP: 20, BD: 2, VN: 1, DE: 6, RU: 8, KE: 1 };

test("K1 ZZ is dropped and doesn't count towards T", () => {
  const r = run({ ZZ: 60, US: 3, CA: 1 });
  assert.deepEqual(r.value, ["CA", "US"]);
  assert.deepEqual(r.entries, []); // T = 4 < 50, so CA 1 is not borderline
  const only = run({ ZZ: 7 });
  assert.equal(only.value, null);
  assert.equal(only.status, "no-open-records");
  assert.deepEqual(flags(only.entries), [":no-records:info"]);
});

test("K2 T < 50 keeps in-core singletons with no entry (saola)", () => {
  const r = run({ VN: 2, LA: 1 });
  assert.deepEqual(r.value, ["LA", "VN"]);
  assert.deepEqual(r.entries, []);
});

test("K3 T ≥ 50: in-core counts 1 and 2 are borderline, 3 is not", () => {
  const r = run({ IN: 44, NP: 1, BD: 2, VN: 3 });
  assert.deepEqual(r.value, ["BD", "IN", "NP", "VN"]);
  assert.deepEqual(flags(r.entries), ["BD:country-borderline:review", "NP:country-borderline:review"]);
  const bd = r.entries.find((e) => e.country === "BD")!;
  assert.deepEqual(bd.values, { gbif: { records: 2, region: "ASIA", speciesRecords: 50, coreRegions: ["ASIA"] } });
  assert.equal(bd.field, "range.countriesWithOpenRecords");
  assert.equal(bd.speciesId, 25);
  assert.equal(bd.scientificName, "Panthera tigris");
});

test("K4 a single record outside the core is an excluded stray at any T (hirola US 1)", () => {
  const small = run({ KE: 23, US: 1 });
  assert.deepEqual(small.value, ["KE"]);
  assert.deepEqual(flags(small.entries), ["US:country-captive-suspect:blocking"]);
  const big = run({ KE: 230, TZ: 50, US: 1 });
  assert.deepEqual(big.value, ["KE", "TZ"]);
  assert.deepEqual(flags(big.entries), ["US:country-captive-suspect:blocking"]);
});

test("K5 outside the core with ≥ 2 records is kept and flagged for review (tiger DE, RU)", () => {
  const r = run(TIGER);
  assert.deepEqual(r.value, ["BD", "DE", "IN", "NP", "RU", "VN"]);
  assert.deepEqual(flags(r.entries), [
    "BD:country-borderline:review",
    "DE:country-captive-suspect:review",
    "KE:country-captive-suspect:blocking",
    "RU:country-captive-suspect:review",
    "VN:country-borderline:review",
  ]);
  const de = r.entries.find((e) => e.country === "DE")!;
  assert.deepEqual(de.values, { gbif: { records: 6, region: "EUROPE", speciesRecords: 138, coreRegions: ["ASIA"] } });
});

test("K6 core counts countries, ties go to records, full ties are all core, the Americas are one region", () => {
  // Elephant: US holds most records, but ASIA has the most countries.
  const elephant = run({ US: 4461, IN: 500, NP: 100, LA: 50 });
  assert.deepEqual(flags(elephant.entries), ["US:country-captive-suspect:review"]);
  // Tie on countries (2 v 2): EUROPE has more records, so it's core and AFRICA is flagged.
  const tie = run({ KE: 10, ZA: 10, DE: 30, NL: 3 });
  assert.deepEqual(flags(tie.entries), ["KE:country-captive-suspect:review", "ZA:country-captive-suspect:review"]);
  assert.deepEqual(tie.entries[0].values, { gbif: { records: 10, region: "AFRICA", speciesRecords: 53, coreRegions: ["EUROPE"] } });
  // Full tie: both regions are core, nothing is outside.
  const full = run({ KE: 20, ZA: 10, DE: 20, NL: 10 });
  assert.deepEqual(full.value, ["DE", "KE", "NL", "ZA"]);
  assert.deepEqual(full.entries, []);
  const fullThin = run({ KE: 40, ZA: 2, DE: 40, NL: 2 });
  assert.deepEqual((fullThin.entries[0].values.gbif as { coreRegions: string[] }).coreRegions, ["AFRICA", "EUROPE"]);
  // Spiny softshell and jaguar: MX and US sit in one merged AMERICAS region.
  const softshell = run({ US: 18207, MX: 1012, CA: 475 });
  assert.deepEqual(softshell.value, ["CA", "MX", "US"]);
  assert.deepEqual(softshell.entries, []);
  const jaguar = run({ BR: 1000, MX: 100, US: 99, HN: 1 });
  assert.deepEqual(flags(jaguar.entries), ["HN:country-borderline:review"]);
  assert.equal(jaguar.entries[0].values.gbif && (jaguar.entries[0].values.gbif as { region: string }).region, "AMERICAS");
});

test("K7 a country code missing from the enumeration throws", () => {
  assert.throws(() => run({ IN: 5, XK: 1 }), /XK/);
});

test("K8 overrides: keep, remove, and every invalid override throws", () => {
  // keep restores a stray and drops its entry
  const restored = run({ KE: 23, US: 1 }, [keep("US")]);
  assert.deepEqual(restored.value, ["KE", "US"]);
  assert.deepEqual(restored.entries, []);
  // keep on a flagged kept country drops the entry; remove drops a kept country and its entry
  const tiger = run(TIGER, [keep("DE"), remove("RU"), remove("IN")]);
  assert.deepEqual(tiger.value, ["BD", "DE", "NP", "VN"]);
  assert.deepEqual(flags(tiger.entries), [
    "BD:country-borderline:review",
    "KE:country-captive-suspect:blocking",
    "VN:country-borderline:review",
  ]);
  // remove confirming an exclusion, and an override on another species, change nothing
  assert.deepEqual(run(TIGER, [remove("KE"), keep("FR", 3)]).value, run(TIGER).value);
  assert.ok(!flags(run(TIGER, [remove("KE")]).entries).some((f) => f.startsWith("KE:")));
  // keep without counted records
  assert.throws(() => run(TIGER, [keep("FR")]), /FR.*no counted records|no counted records.*FR/);
  // override on a species whose countries are null
  assert.throws(() => deriveCountries({ species, occurrences: null, regions, overrides: [keep("DE")] }), /null/);
  assert.deepEqual(deriveCountries({ species, occurrences: null, regions, overrides: [keep("DE", 3)] }), { value: null, status: "identity-unsettled", entries: [] });

  // parseOverrides validates the whole file
  const ids = new Set([3, 25]);
  const ok = { speciesId: 25, country: "DE", action: "keep", reason: "zoo, but wild records too" };
  assert.deepEqual(parseOverrides([ok], ids), [ok]);
  assert.deepEqual(parseOverrides([], ids), []);
  const bad: [unknown, RegExp][] = [
    [{}, /array/],
    [[{ ...ok, speciesId: 99 }], /species/],
    [[ok, { ...ok, action: "remove" }], /duplicate/],
    [[{ ...ok, extra: 1 }], /keys/],
    [[{ speciesId: 25, country: "DE", action: "keep" }], /keys/],
    [[{ ...ok, action: "drop" }], /action/],
    [[{ ...ok, country: "de" }], /country/],
    [[{ ...ok, country: "DEU" }], /country/],
    [[{ ...ok, country: "ZZ" }], /country/],
    [[{ ...ok, reason: "  " }], /reason/],
    [[{ ...ok, speciesId: "25" }], /species/],
  ];
  for (const [input, re] of bad) assert.throws(() => parseOverrides(input, ids), re, JSON.stringify(input));
});

test("K9 T == 0 gives null, no-open-records, plus a no-records info entry", () => {
  const r = deriveCountries({ species, occurrences: { count: 0, facets: [] }, regions, overrides: [] });
  assert.equal(r.value, null);
  assert.equal(r.status, "no-open-records");
  assert.deepEqual(flags(r.entries), [":no-records:info"]);
  assert.equal(r.entries[0].field, "range.countriesWithOpenRecords");
  assert.equal("country" in r.entries[0], false);
});

test("K10 value and entries are sorted and independent of facet order", () => {
  const a = run(TIGER);
  const shuffled = Object.fromEntries(Object.entries(TIGER).reverse());
  const b = run(shuffled);
  assert.deepEqual(b, a);
  assert.equal(JSON.stringify(b), JSON.stringify(a)); // same key order too
  assert.deepEqual(a.value, [...a.value!].sort());
  const countries = a.entries.map((e) => e.country!);
  assert.deepEqual(countries, [...countries].sort());
});

test("K11 three statuses; never []", () => {
  const ok = run(TIGER);
  assert.equal(ok.status, "ok");
  assert.ok(ok.value!.length > 0);
  // Overrides removing every country: null + no-open-records, not [].
  const gone = run({ KE: 3, TZ: 2 }, [remove("KE"), remove("TZ")]);
  assert.deepEqual([gone.value, gone.status, gone.entries], [null, "no-open-records", []]);
  const unsettled = deriveCountries({ species, occurrences: null, regions, overrides: [] });
  assert.deepEqual([unsettled.value, unsettled.status], [null, "identity-unsettled"]);
  for (const r of [ok, gone, unsettled, run({ ZZ: 2 })]) {
    assert.notDeepEqual(r.value, []);
    assert.equal(r.value !== null, r.status === "ok");
  }
});
