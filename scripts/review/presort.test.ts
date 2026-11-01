// Presort core tests (mission plan 2026-11-01-critwire-review-presort, Q4). Failure modes first:
// P1: a recommendation key missing (with complete), repeated or unknown; an evidence key repeated → each throws.
// P2: evidence entries differ from the queue (one changed, missing or reordered) → throws "queue changed".
// P3: keep/remove on a non-country entry, a fix text on a country entry, or an empty fix → throws.
// P4: a confidence other than high, medium or low → throws.
// P5: low that isn't the status quo (keep a stray, remove a kept country, a fix other than "no action") → throws.
// P6: a cite that doesn't resolve (an occurrence or dataset of another entry, an unknown col/wikidata/species id, a bad
//     form), no cite at all, or a country entry at medium or high without a gbif:occurrence or gbif:dataset cite → throws.
// P7: an empty or blank reason, or one over 300 characters → throws.
// P8: the committed proposal breaks a rule derive runs on country-overrides.json (parseOverrides, deriveCountries) → throws.
// P9: a script outside scripts/review/ and scripts/review-*.ts names a presort file or imports scripts/review/.
// P10: a high remove whose live count differs from the entry's records, whose datasetKey facet is truncated, or
//      whose entry has no gbif section → throws.
// P11: evidence breaking assertEvidence: a key that isn't entryKey(entry), a fetched key or string matching /iucn/i
//      (while ids.iucn and iucn-id in the copied entry pass), a taxonKey other than the snapshot's, a gbif section on a
//      non-country entry or none on a country entry → throws.
// Plus: proposalOf gives the exact override format, sorted, country recommendations only; statusQuo/changesOutput.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { deriveCore, readCoreInputs } from "../derive/pipeline.ts";
import { readJson } from "../json.ts";
import type { GbifSnapshot } from "../raw.ts";
import type { Mismatch } from "../species.ts";
import {
  assertEvidence, assertQueue, assertRecommendations, changesOutput, entryKey, indexEntries, proposalFile, proposalOf, statusQuo,
  type Evidence, type GbifEvidence, type Recommendation,
} from "./presort.ts";

const DS_A = "aaaaaaaa-0000-0000-0000-000000000001";
const DS_B = "bbbbbbbb-0000-0000-0000-000000000002";

const stray: Mismatch = {
  speciesId: 2, scientificName: "Apalone spinifera", field: "range.countriesWithOpenRecords", kind: "country-captive-suspect",
  severity: "blocking", country: "PT",
  values: { gbif: { records: 1, region: "EUROPE", speciesRecords: 4174, coreRegions: ["AMERICAS"] } },
  reason: "PT (EUROPE) has 1 record, outside the core region (AMERICAS); excluded as a stray. Restore with keep in country-overrides.json.",
};
const borderline: Mismatch = {
  speciesId: 2, scientificName: "Apalone spinifera", field: "range.countriesWithOpenRecords", kind: "country-borderline",
  severity: "review", country: "AR",
  values: { gbif: { records: 2, region: "AMERICAS", speciesRecords: 4174, coreRegions: ["AMERICAS"] } },
  reason: "AR has 2 records of 4174; kept. Settle with keep or remove in country-overrides.json.",
};
const iucnId: Mismatch = {
  speciesId: 4, scientificName: "Platysternon megacephalum", field: "ids.iucn", kind: "iucn-id", severity: "blocking",
  values: { base: 9605, wikidata: ["17585"] },
  reason: "Wikidata Q754035 (P225 Platysternon megacephalum) has P627 17585. Kept 9605.",
};
const queue: Mismatch[] = [stray, borderline, iucnId];

const gbifSnapshot = {
  species: {
    "Apalone spinifera": { match: { response: { usage: { key: "5220530" }, diagnostics: { matchType: "EXACT" } } } },
    "Platysternon megacephalum": { match: { response: { usage: { key: "2442000" }, diagnostics: { matchType: "EXACT" } } } },
  },
} as unknown as GbifSnapshot;

function gbifSection(records: number, datasets: Record<string, number>, truncated = false): GbifEvidence {
  return {
    taxonKey: 5220530,
    url: "https://api.gbif.org/v1/occurrence/search?taxonKey=5220530",
    count: records,
    facets: { datasetKey: { counts: Object.entries(datasets).map(([name, count]) => ({ name, count })), truncated } },
    records: [{ key: 100 + records, datasetKey: Object.keys(datasets)[0]!, license: "CC_BY_4_0", basisOfRecord: "HUMAN_OBSERVATION" }],
  };
}

function evidence(): Evidence {
  return {
    retrieved: "2026-11-01",
    sources: [{ source: "GBIF.org", license: "CC BY 4.0", url: "https://www.gbif.org" }],
    entries: [
      { key: "2:PT", entry: structuredClone(stray), gbif: gbifSection(1, { [DS_A]: 1 }) },
      { key: "2:AR", entry: structuredClone(borderline), gbif: gbifSection(2, { [DS_B]: 2 }) },
      { key: "4:ids.iucn:iucn-id", entry: structuredClone(iucnId), gbif: null },
    ],
    datasets: { [DS_A]: { title: "Zoo collection", type: "OCCURRENCE", license: "CC_BY_4_0", doi: null, publishingOrganizationKey: null } },
    organizations: {},
    col: { "3GXL": { name: "Apalone spinifera", rank: "species", status: "accepted" } },
    gbifSpecies: { "5220530": { key: 5220530, scientificName: "Apalone spinifera", rank: "SPECIES", taxonomicStatus: "ACCEPTED" } },
    wikidata: { query: "SELECT ?item WHERE {}", statements: [{ item: "Q754035", property: "P627", value: "17585", rank: "normal", references: [{ statedIn: "Q32059", retrieved: "2020-01-01" }] }] },
  };
}

const recs = (): Recommendation[] => [
  { key: "2:PT", recommendation: "remove", confidence: "high", reason: "Only record is a zoo specimen.", cite: [`gbif:dataset:${DS_A}`] },
  { key: "2:AR", recommendation: "keep", confidence: "medium", reason: "Field observations near the border.", cite: ["gbif:occurrence:102", "col:3GXL"] },
  { key: "4:ids.iucn:iucn-id", recommendation: "no action", confidence: "low", reason: "Check both links.", cite: ["wikidata:Q754035", "entry"] },
];

const throwsWith = (fn: () => unknown, re: RegExp) => assert.throws(fn, (e: Error) => re.test(e.message));

test("entryKey: <id>:<CC> for country entries, <id>:<field>:<kind> otherwise; indexEntries refuses a repeated key (P1)", () => {
  assert.equal(entryKey(stray), "2:PT");
  assert.equal(entryKey(iucnId), "4:ids.iucn:iucn-id");
  assert.equal(indexEntries(queue).size, 3);
  throwsWith(() => indexEntries([stray, structuredClone(stray)]), /repeated key 2:PT/);
});

test("statusQuo and changesOutput: a blocking stray is removed, every other country entry kept", () => {
  assert.equal(statusQuo(stray), "remove");
  assert.equal(statusQuo(borderline), "keep");
  assert.equal(changesOutput(stray, "keep"), true);
  assert.equal(changesOutput(stray, "remove"), false);
  assert.equal(changesOutput(borderline, "remove"), true);
  throwsWith(() => statusQuo(iucnId), /not a country entry/);
});

test("the valid fixture passes assertEvidence and assertRecommendations (complete)", () => {
  assertEvidence(evidence(), gbifSnapshot);
  assertRecommendations(recs(), evidence(), { complete: true });
});

test("P1: a missing (complete only), repeated or unknown recommendation key throws; a repeated evidence key throws", () => {
  assertRecommendations(recs().slice(1), evidence());
  throwsWith(() => assertRecommendations(recs().slice(1), evidence(), { complete: true }), /2:PT has no recommendation/);
  throwsWith(() => assertRecommendations([...recs(), recs()[0]!], evidence()), /2:PT is repeated/);
  throwsWith(() => assertRecommendations([...recs(), { ...recs()[0]!, key: "9:XX" }], evidence()), /9:XX is not in the evidence/);
  const ev = evidence();
  ev.entries.push(structuredClone(ev.entries[0]!));
  throwsWith(() => assertEvidence(ev, gbifSnapshot), /repeated key 2:PT/);
});

test("P2: evidence entries that differ from the queue throw", () => {
  assertQueue(evidence(), queue);
  throwsWith(() => assertQueue(evidence(), [stray, borderline]), /queue changed: re-run pnpm review:evidence/);
  throwsWith(() => assertQueue(evidence(), [borderline, stray, iucnId]), /queue changed/);
  throwsWith(() => assertQueue(evidence(), [stray, { ...borderline, reason: "x" }, iucnId]), /queue changed/);
});

test("P3: keep/remove only on country entries, a non-empty fix text otherwise", () => {
  const r = recs();
  r[2] = { ...r[2]!, recommendation: "keep" };
  throwsWith(() => assertRecommendations(r, evidence()), /4:ids\.iucn:iucn-id: keep\/remove is for country entries/);
  const c = recs();
  c[1] = { ...c[1]!, recommendation: "fix the profile" };
  throwsWith(() => assertRecommendations(c, evidence()), /2:AR: recommendation must be keep or remove/);
  const e = recs();
  e[2] = { ...e[2]!, recommendation: " " };
  throwsWith(() => assertRecommendations(e, evidence()), /4:ids\.iucn:iucn-id: the fix must be a non-empty string/);
});

test("P4: a confidence other than high, medium or low throws", () => {
  const r = recs();
  r[0] = { ...r[0]!, confidence: "certain" as Recommendation["confidence"] };
  throwsWith(() => assertRecommendations(r, evidence()), /2:PT: confidence must be high, medium or low/);
});

test("P5: low must be the status quo", () => {
  const keepStray = recs();
  keepStray[0] = { ...keepStray[0]!, recommendation: "keep", confidence: "low" };
  throwsWith(() => assertRecommendations(keepStray, evidence()), /2:PT: low must be the status quo \(remove\)/);
  const removeKept = recs();
  removeKept[1] = { ...removeKept[1]!, recommendation: "remove", confidence: "low" };
  throwsWith(() => assertRecommendations(removeKept, evidence()), /2:AR: low must be the status quo \(keep\)/);
  const fix = recs();
  fix[2] = { ...fix[2]!, recommendation: "edit Wikidata" };
  throwsWith(() => assertRecommendations(fix, evidence()), /4:ids\.iucn:iucn-id: low must be the status quo \(no action\)/);
  const lowOk = recs();
  lowOk[1] = { ...lowOk[1]!, confidence: "low" };
  assertRecommendations(lowOk, evidence());
});

test("P6: every cite resolves for its entry; a country entry at medium or high cites GBIF", () => {
  const bad = (cite: string[], i = 1) => { const r = recs(); r[i] = { ...r[i]!, cite }; return r; };
  throwsWith(() => assertRecommendations(bad(["gbif:occurrence:101"]), evidence()), /2:AR: cite gbif:occurrence:101 doesn't resolve/);
  throwsWith(() => assertRecommendations(bad([`gbif:dataset:${DS_A}`]), evidence()), /2:AR: cite gbif:dataset:.* doesn't resolve/);
  throwsWith(() => assertRecommendations(bad(["gbif:occurrence:102", "col:NOPE"]), evidence()), /cite col:NOPE doesn't resolve/);
  throwsWith(() => assertRecommendations(bad(["gbif:occurrence:102", "wikidata:Q1"]), evidence()), /cite wikidata:Q1 doesn't resolve/);
  throwsWith(() => assertRecommendations(bad(["gbif:occurrence:102", "gbif:species:1"]), evidence()), /cite gbif:species:1 doesn't resolve/);
  throwsWith(() => assertRecommendations(bad(["gbif:occurrence:102", "http://x"]), evidence()), /cite http:\/\/x doesn't resolve/);
  throwsWith(() => assertRecommendations(bad([]), evidence()), /2:AR: needs at least one cite/);
  throwsWith(() => assertRecommendations(bad(["col:3GXL", "entry"]), evidence()), /2:AR: medium needs a gbif:occurrence or gbif:dataset cite/);
  assertRecommendations(bad(["gbif:species:5220530", "wikidata:Q32059", `gbif:dataset:${DS_B}`]), evidence());
  const low = recs();
  low[1] = { ...low[1]!, confidence: "low", cite: ["entry"] };
  assertRecommendations(low, evidence());
});

test("P7: the reason is 1–300 characters, not blank", () => {
  const withReason = (reason: string) => { const r = recs(); r[0] = { ...r[0]!, reason }; return r; };
  throwsWith(() => assertRecommendations(withReason(""), evidence()), /2:PT: reason must be 1–300 characters/);
  throwsWith(() => assertRecommendations(withReason("   "), evidence()), /2:PT: reason must be 1–300 characters/);
  throwsWith(() => assertRecommendations(withReason("x".repeat(301)), evidence()), /2:PT: reason must be 1–300 characters/);
  assertRecommendations(withReason("x".repeat(300)), evidence());
});

test("P10: a high remove needs the live count to equal records and an untruncated datasetKey facet", () => {
  const moved = evidence();
  moved.entries[0]!.gbif!.count = 2;
  throwsWith(() => assertRecommendations(recs(), moved), /2:PT: high remove needs complete coverage: live count 2 ≠ 1 records/);
  const truncated = evidence();
  truncated.entries[0]!.gbif!.facets.datasetKey!.truncated = true;
  throwsWith(() => assertRecommendations(recs(), truncated), /2:PT: high remove needs complete coverage: datasetKey facet truncated/);
  const r = recs();
  r[0] = { ...r[0]!, confidence: "medium" };
  assertRecommendations(r, moved);
});

test("P11: assertEvidence checks keys, the IUCN gate on fetched sections only, the taxon key and gbif presence", () => {
  const badKey = evidence();
  badKey.entries[1]!.key = "2:BR";
  throwsWith(() => assertEvidence(badKey, gbifSnapshot), /evidence key 2:BR isn't 2:AR/);
  const iucnString = evidence();
  iucnString.datasets[DS_A]!.title = "IUCN range data";
  throwsWith(() => assertEvidence(iucnString, gbifSnapshot), /IUCN data at \$\.datasets/);
  const iucnKey = evidence();
  (iucnKey.entries[0]!.gbif!.records[0] as unknown as Record<string, unknown>)["iucnRedListCategory"] = "LC";
  throwsWith(() => assertEvidence(iucnKey, gbifSnapshot), /IUCN data at \$\.entries\[0\]\.gbif/);
  const iucnWikidata = evidence();
  iucnWikidata.wikidata.query = "SELECT ?iucnId";
  throwsWith(() => assertEvidence(iucnWikidata, gbifSnapshot), /IUCN data at \$\.wikidata/);
  const taxon = evidence();
  taxon.entries[0]!.gbif!.taxonKey = 1;
  throwsWith(() => assertEvidence(taxon, gbifSnapshot), /2:PT: taxon changed \(1, snapshot 5220530\): re-run pnpm review:evidence/);
  const noGbif = evidence();
  noGbif.entries[1]!.gbif = null;
  throwsWith(() => assertEvidence(noGbif, gbifSnapshot), /2:AR: a country entry needs a gbif section/);
  const extraGbif = evidence();
  extraGbif.entries[2]!.gbif = gbifSection(1, {});
  throwsWith(() => assertEvidence(extraGbif, gbifSnapshot), /4:ids\.iucn:iucn-id: only country entries have a gbif section/);
  // Every problem is listed, not just the first.
  const both = evidence();
  both.entries[1]!.key = "2:BR";
  both.datasets[DS_A]!.title = "IUCN";
  throwsWith(() => assertEvidence(both, gbifSnapshot), /isn't 2:AR[\s\S]*IUCN data/);
});

test("proposalOf: the override format, country recommendations only, sorted by speciesId then country", () => {
  const r: Recommendation[] = [
    { key: "10:DE", recommendation: "keep", confidence: "medium", reason: "b", cite: [] },
    ...recs(),
  ];
  const proposal = proposalOf(r);
  assert.deepEqual(proposal, [
    { speciesId: 2, country: "AR", action: "keep", reason: "Field observations near the border." },
    { speciesId: 2, country: "PT", action: "remove", reason: "Only record is a zoo specimen." },
    { speciesId: 10, country: "DE", action: "keep", reason: "b" },
  ]);
  assert.deepEqual(Object.keys(proposal[0]!), ["speciesId", "country", "action", "reason"]);
  throwsWith(() => proposalOf([{ ...recs()[0]!, key: "2:ids.gbif:identity" }]), /2:ids\.gbif:identity: keep\/remove on a non-country key/);
});

test("P8: the committed proposal passes the rules derive runs on country-overrides.json", async () => {
  const proposal = await readJson<unknown>(proposalFile);
  assert.ok(Array.isArray(proposal));
  const inputs = await readCoreInputs();
  assert.doesNotThrow(() => deriveCore({ ...inputs, overrides: proposal }));
});

test("P9: no script outside scripts/review/ and scripts/review-*.ts reads a presort file or imports scripts/review/", async () => {
  const GUARD = /overrides\.proposed|review\/presort|from "\.\.?\/(\.\.\/)*review\//;
  const root = new URL("../../", import.meta.url);
  const offenders: string[] = [];
  for (const dir of ["scripts", "e2e"]) {
    for (const rel of await readdir(new URL(`${dir}/`, root), { recursive: true })) {
      const path = `${dir}/${rel}`;
      if (!path.endsWith(".ts") || path.startsWith("scripts/review/") || /^scripts\/review-[^/]*\.ts$/.test(path)) continue;
      if (GUARD.test(await readFile(new URL(path, root), "utf8"))) offenders.push(path);
    }
  }
  assert.deepEqual(offenders, [], `read presort files: ${offenders.join(", ")} (root ${fileURLToPath(root)})`);
});
