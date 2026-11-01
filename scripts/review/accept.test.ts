// Accept core tests (mission plan 2026-11-01-critwire-review-presort, Q5). Failure modes first:
// A1: no selector, both selectors, a repeated selector, an unknown flag, a stray argument, a bad level, or an empty or
//     malformed id list → UsageError (the CLI exits 2).
// A2: --ids with a key the evidence doesn't hold, or one without a recommendation → throws.
// A3: --ids with a non-country key → throws "not an override; its fix is in 005".
// A4: a selection left empty (nothing at that level, or --confirm-only dropped everything) → throws.
// A7: a selected pair the overrides file holds with the other action → throws, naming both actions.
// A8: sameFlag false when kind, severity, country, records, region or core moved; true when only speciesRecords or reason did.
// A11: a selected pair the overrides file holds with the same action → skipped, not added (a rerun adds nothing).
// Plus: --confidence medium = medium + high; --confirm-only drops output-changing proposals; the owner's entries keep
// order and text, new ones appended sorted; countryChanges lists per species what a merge adds and removes.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { CountryOverride, Mismatch, Species } from "../species.ts";
import { countryChanges, mergeOverrides, parseAcceptArgs, selectProposals, UsageError } from "./accept.ts";
import { sameFlag, type Recommendation } from "./presort.ts";

const entry = (speciesId: number, country: string, kind: Mismatch["kind"], severity: Mismatch["severity"]): Mismatch => ({
  speciesId, scientificName: `Species ${speciesId}`, field: "range.countriesWithOpenRecords", kind, severity, country,
  values: { gbif: { records: 1, region: "EUROPE", speciesRecords: 4174, coreRegions: ["AMERICAS"] } },
  reason: `${country} flagged.`,
});
const stray = entry(2, "PT", "country-captive-suspect", "blocking");
const kept = entry(2, "DE", "country-captive-suspect", "review");
const borderline = entry(3, "AR", "country-borderline", "review");
const lowStray = entry(5, "FR", "country-captive-suspect", "blocking");
const iucnId: Mismatch = {
  speciesId: 4, scientificName: "Species 4", field: "ids.iucn", kind: "iucn-id", severity: "blocking",
  values: { base: 9605, wikidata: ["17585"] }, reason: "Differs.",
};
const FIX_KEY = "4:ids.iucn:iucn-id";
const evidence = {
  entries: [
    { key: "2:PT", entry: stray, gbif: null },
    { key: "2:DE", entry: kept, gbif: null },
    { key: "3:AR", entry: borderline, gbif: null },
    { key: "5:FR", entry: lowStray, gbif: null },
    { key: "6:ES", entry: entry(6, "ES", "country-borderline", "review"), gbif: null },
    { key: FIX_KEY, entry: iucnId, gbif: null },
  ],
};
const rec = (key: string, recommendation: string, confidence: Recommendation["confidence"]): Recommendation => ({
  key, recommendation, confidence, reason: `${key} reason.`, cite: ["entry"],
});
const recs: Recommendation[] = [
  rec("3:AR", "remove", "high"), // output-changing (kept → removed)
  rec("2:PT", "remove", "high"), // confirming (stays excluded)
  rec("2:DE", "keep", "medium"), // confirming (stays kept)
  rec("5:FR", "remove", "low"), // confirming (stays excluded)
  rec(FIX_KEY, "Fix the Wikidata statement.", "high"),
];
const pairs = (list: readonly CountryOverride[]) => list.map((o) => `${o.speciesId}:${o.country}:${o.action}`);
const override = (speciesId: number, country: string, action: CountryOverride["action"], reason = "owner's words"): CountryOverride => ({ speciesId, country, action, reason });
const throwsWith = (fn: () => unknown, re: RegExp) => assert.throws(fn, (e: Error) => re.test(e.message));

test("parseAcceptArgs: one selector, with or without --confirm-only", () => {
  assert.deepEqual(parseAcceptArgs(["--confidence", "high"]), { confidence: "high", confirmOnly: false });
  assert.deepEqual(parseAcceptArgs(["--confidence", "low", "--confirm-only"]), { confidence: "low", confirmOnly: true });
  assert.deepEqual(parseAcceptArgs(["--ids", "25:DE,25:RU"]), { ids: ["25:DE", "25:RU"], confirmOnly: false });
  assert.deepEqual(parseAcceptArgs(["--confirm-only", "--ids", "25:DE,25:DE"]), { ids: ["25:DE"], confirmOnly: true });
});

test("A1: every malformed command line is a UsageError naming the usage", () => {
  const bad = [
    [],
    ["--confirm-only"],
    ["--confidence", "high", "--ids", "25:DE"],
    ["--confidence", "high", "--confidence", "low"],
    ["--ids", "25:DE", "--ids", "25:RU"],
    ["--confidence", "certain"],
    ["--confidence"],
    ["--ids", ""],
    ["--ids", "25:DE,"],
    ["--ids", " 25:DE"],
    ["--force"],
    ["high"],
    ["--confidence", "high", "extra"],
  ];
  for (const args of bad) {
    assert.throws(() => parseAcceptArgs(args), (e: Error) => e instanceof UsageError && /^usage: pnpm review:accept/m.test(e.message), JSON.stringify(args));
  }
});

test("selectProposals: --confidence is that level or higher, countries only, as sorted overrides", () => {
  const high = selectProposals({ confidence: "high", confirmOnly: false }, recs, evidence);
  assert.deepEqual(high, [
    { speciesId: 2, country: "PT", action: "remove", reason: "2:PT reason." },
    { speciesId: 3, country: "AR", action: "remove", reason: "3:AR reason." },
  ]);
  assert.deepEqual(pairs(selectProposals({ confidence: "medium", confirmOnly: false }, recs, evidence)), ["2:DE:keep", "2:PT:remove", "3:AR:remove"]);
  assert.deepEqual(pairs(selectProposals({ confidence: "low", confirmOnly: false }, recs, evidence)), ["2:DE:keep", "2:PT:remove", "3:AR:remove", "5:FR:remove"]);
});

test("selectProposals: --ids selects only what it names, whatever its confidence", () => {
  assert.deepEqual(pairs(selectProposals({ ids: ["5:FR", "2:DE"], confirmOnly: false }, recs, evidence)), ["2:DE:keep", "5:FR:remove"]);
});

test("selectProposals: --confirm-only drops output-changing proposals", () => {
  assert.deepEqual(pairs(selectProposals({ confidence: "high", confirmOnly: true }, recs, evidence)), ["2:PT:remove"]);
  assert.deepEqual(pairs(selectProposals({ ids: ["2:PT", "3:AR"], confirmOnly: true }, recs, evidence)), ["2:PT:remove"]);
});

test("A2: an unknown key, or one with no recommendation, throws", () => {
  throwsWith(() => selectProposals({ ids: ["2:PT", "9:XX"], confirmOnly: false }, recs, evidence), /9:XX is not in the evidence/);
  throwsWith(() => selectProposals({ ids: ["6:ES"], confirmOnly: false }, recs, evidence), /6:ES has no recommendation/);
});

test("A3: a non-country key throws, even beside valid ones", () => {
  throwsWith(() => selectProposals({ ids: ["2:PT", FIX_KEY], confirmOnly: false }, recs, evidence), /4:ids\.iucn:iucn-id is not an override; its fix is in 005/);
});

test("A4: an empty selection throws", () => {
  const noHigh = recs.filter((r) => r.confidence !== "high");
  throwsWith(() => selectProposals({ confidence: "high", confirmOnly: false }, noHigh, evidence), /nothing selected/);
  throwsWith(() => selectProposals({ ids: ["3:AR"], confirmOnly: true }, recs, evidence), /nothing selected/);
});

test("mergeOverrides: the owner's entries keep order and text, new ones are appended sorted", () => {
  const current = [override(9, "ZA", "keep", "zoo checked"), override(1, "BR", "remove", "my call")];
  const selected = [override(3, "AR", "remove"), override(2, "PT", "remove"), override(2, "DE", "keep")];
  const { merged, added, skipped } = mergeOverrides(current, selected);
  assert.deepEqual(merged, [current[0], current[1], selected[2], selected[1], selected[0]]);
  assert.deepEqual(pairs(added), ["2:DE:keep", "2:PT:remove", "3:AR:remove"]);
  assert.deepEqual(skipped, []);
  assert.deepEqual(current.length, 2);
});

test("A11: a pair already held with the same action is skipped; the owner's reason stays", () => {
  const current = [override(2, "PT", "remove", "my call")];
  const { merged, added, skipped } = mergeOverrides(current, [override(2, "PT", "remove", "proposal's words"), override(3, "AR", "remove")]);
  assert.deepEqual(merged, [current[0], override(3, "AR", "remove")]);
  assert.deepEqual(pairs(added), ["3:AR:remove"]);
  assert.deepEqual(pairs(skipped), ["2:PT:remove"]);
  const rerun = mergeOverrides(merged, [override(2, "PT", "remove"), override(3, "AR", "remove")]);
  assert.deepEqual(rerun.merged, merged);
  assert.deepEqual(rerun.added, []);
});

test("A7: a pair held with the other action throws, naming both", () => {
  throwsWith(() => mergeOverrides([override(2, "PT", "keep")], [override(2, "PT", "remove")]), /2:PT: .*keep.*remove/);
});

test("A8: sameFlag ignores reason and speciesRecords, and is false on anything else that moved", () => {
  const moved = (change: (e: Mismatch & { values: { gbif: Record<string, unknown> } }) => void) => {
    const copy = structuredClone(stray) as Mismatch & { values: { gbif: Record<string, unknown> } };
    change(copy);
    return copy;
  };
  assert.equal(sameFlag(stray, structuredClone(stray)), true);
  assert.equal(sameFlag(stray, moved((e) => { e.reason = "Reworded."; })), true);
  assert.equal(sameFlag(stray, moved((e) => { e.values.gbif["speciesRecords"] = 5000; })), true);
  assert.equal(sameFlag(stray, moved((e) => { e.kind = "country-borderline"; })), false);
  assert.equal(sameFlag(stray, moved((e) => { e.severity = "review"; })), false);
  assert.equal(sameFlag(stray, moved((e) => { e.country = "ES"; })), false);
  assert.equal(sameFlag(stray, moved((e) => { e.values.gbif["records"] = 2; })), false);
  assert.equal(sameFlag(stray, moved((e) => { e.values.gbif["region"] = "ASIA"; })), false);
  assert.equal(sameFlag(stray, moved((e) => { e.values.gbif["coreRegions"] = ["EUROPE"]; })), false);
});

test("countryChanges: per species, what was added and removed; a species losing its last country counts; unchanged ones don't", () => {
  const species = (id: number, list: string[] | null) => ({
    id, range: { countriesWithOpenRecords: list, status: list ? "ok" : "no-open-records" },
  }) as unknown as Species;
  const before = [species(1, ["AR", "BR"]), species(2, ["DE"]), species(3, ["FR"]), species(4, null)];
  const after = [species(1, ["BR", "CL"]), species(2, ["DE"]), species(3, null), species(4, ["KE"])];
  assert.deepEqual(countryChanges(before, after), [
    { speciesId: 1, added: ["CL"], removed: ["AR"] },
    { speciesId: 3, added: [], removed: ["FR"] },
    { speciesId: 4, added: ["KE"], removed: [] },
  ]);
  throwsWith(() => countryChanges(before, after.slice(1)), /species 1/);
});
