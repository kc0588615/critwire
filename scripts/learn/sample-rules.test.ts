// CK1–CK5 (country-key contract), SC1–SC5 (cap, species rule) and the effective license, ported from the spike's
// tests_py/test_sample_rules.py (plan D6), plus the cap's gbifID tie-break. Written before the code, seen failing first.
// SC4's writer half (same bytes) is the occurrences writer's (S14).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { withOfflineDuckDb } from "../build/duckdb.ts";
import { CAP, capSample, countryKeys, effectiveLicense, NON_COUNTRY, orderKey, SAMPLE_RULES, speciesFor } from "./sample-rules.ts";

const COUNTRIES = new Set(["AU", "BR", "XK"]);
const md5 = (s: string) => createHash("md5").update(s).digest("hex");

test("CK1 a countries code: country_code_gbif = country_code = the code", () => {
  assert.deepEqual(countryKeys(new Map([["AU", 3], ["XK", 1]]), COUNTRIES), new Map([["AU", { gbif: "AU", code: "AU" }], ["XK", { gbif: "XK", code: "XK" }]]));
});

test("CK2 ZZ, XZ: raw code kept, country_code NULL", () => {
  assert.deepEqual(countryKeys(new Map([["ZZ", 2], ["XZ", 5]]), COUNTRIES), new Map([["ZZ", { gbif: "ZZ", code: null }], ["XZ", { gbif: "XZ", code: null }]]));
});

test("CK3 an empty or NULL code: both NULL", () => {
  assert.deepEqual(countryKeys(new Map([[null, 4], ["", 1]]), COUNTRIES), new Map([[null, { gbif: null, code: null }], ["", { gbif: null, code: null }]]));
});

test("CK4 any other code fails, naming every such code and its rows", () => {
  for (const code of ["QQ", "zz", "au"]) {
    assert.throws(() => countryKeys(new Map([["AU", 1], [code, 7]]), COUNTRIES), (e: Error) => e.message.includes(`${code} (7 rows)`));
  }
  assert.throws(() => countryKeys(new Map([["QQ", 2], ["AU", 1], ["QA", 3]]), COUNTRIES), /country codes with no countries row and not ZZ\/XZ: QA \(3 rows\), QQ \(2 rows\)$/);
});

test("CK5 the non-country constant is exactly ZZ and XZ, with GBIF's meanings", () => {
  assert.deepEqual(Object.keys(NON_COUNTRY).sort(), ["XZ", "ZZ"]);
  assert.match(NON_COUNTRY.ZZ, /unknown/);
  assert.match(NON_COUNTRY.XZ, /international waters/);
});

const BY_GBIF = new Map([[100, 1], [200, 2], [300, 3]]);

test("species rule: speciesKey first", () => {
  assert.equal(speciesFor(100, 999, BY_GBIF), 1);
  assert.equal(speciesFor(100, 100, BY_GBIF), 1);
});

test("species rule: a synonym key via taxonKey", () => {
  assert.equal(speciesFor(555, 300, BY_GBIF), 3);
  assert.equal(speciesFor(null, 300, BY_GBIF), 3);
});

test("SC5 neither key a critwire ids.gbif fails", () => {
  assert.throws(() => speciesFor(555, 666, BY_GBIF), /neither speciesKey 555 nor taxonKey 666/);
  assert.throws(() => speciesFor(null, null, BY_GBIF), /neither speciesKey null nor taxonKey null/);
});

test("SC5 the two keys naming two species fails", () => {
  assert.throws(() => speciesFor(100, 200, BY_GBIF), /speciesKey 100 is species 1, taxonKey 200 is species 2/);
});

test("effective license: the more restrictive wins", () => {
  assert.equal(effectiveLicense("CC0 1.0", "CC BY 4.0"), "CC BY 4.0");
  assert.equal(effectiveLicense("CC BY 4.0", "CC0 1.0"), "CC BY 4.0");
  assert.equal(effectiveLicense("CC BY 4.0", "CC BY-NC 4.0"), "CC BY-NC 4.0");
  assert.equal(effectiveLicense("CC0 1.0", "CC0 1.0"), "CC0 1.0");
});

test("effective license: an unknown license fails, naming it", () => {
  assert.throws(() => effectiveLicense("CC BY-SA 4.0", "CC0 1.0"), /unknown license "CC BY-SA 4.0"/);
  assert.throws(() => effectiveLicense("CC0 1.0", "CC0_1_0"), /unknown license "CC0_1_0"/);
});

// {species_id: gbif ids} -> rows in a fixed shuffled order.
function rows(spec: Record<number, Iterable<number>>) {
  const out = Object.entries(spec).flatMap(([s, ids]) => [...ids].map((id) => ({ id, species_id: Number(s) })));
  let seed = 7;
  for (let i = out.length - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) % 2 ** 31;
    const j = seed % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
const range = (a: number, b: number) => Array.from({ length: b - a }, (_, i) => a + i);
const ids = (r: { id: number }[]) => r.map((x) => x.id);

test("SC1 at most cap rows per species; a smaller species keeps all; default cap 2,000", () => {
  const per = new Map<number, number>();
  for (const r of capSample(rows({ 1: range(1, 51), 2: range(100, 103) }), 10)) per.set(r.species_id, (per.get(r.species_id) ?? 0) + 1);
  assert.deepEqual(per, new Map([[1, 10], [2, 3]]));
  assert.equal(CAP, 2000);
  assert.equal(capSample(rows({ 1: range(1, 2101) })).length, 2000);
});

test("SC2 order key is md5 of the decimal gbifID text, ascending", () => {
  const all = range(1, 51);
  const want = all.map((id) => [md5(String(id)), id] as const).sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(0, 10).map((x) => x[1]).sort((a, b) => a - b);
  assert.deepEqual(ids(capSample(rows({ 1: all }), 10)), want);
  assert.equal(orderKey(1234567890123), md5("1234567890123"));
});

test("SC2 a duplicate gbifID fails, even across species", () => {
  assert.throws(() => capSample([{ id: 5, species_id: 1 }, { id: 5, species_id: 2 }], 10), /gbifID 5 twice/);
});

test("cap tie-break: equal order keys fall back to ascending gbifID", () => {
  assert.deepEqual(ids(capSample(rows({ 1: [9, 3, 7, 1, 5] }), 3, () => "same")), [1, 3, 5]);
});

test("cap: a newly eligible low-hash record displaces the highest-hash one", () => {
  const before = capSample(rows({ 1: range(1, 51) }), 10);
  const worst = [...before].sort((a, b) => (orderKey(a.id) < orderKey(b.id) ? 1 : -1))[0].id;
  const low = range(1000, 2000).find((id) => orderKey(id) < orderKey(worst))!;
  const after = ids(capSample([...rows({ 1: range(1, 51) }), { id: low, species_id: 1 }], 10));
  assert.ok(after.includes(low));
  assert.ok(!after.includes(worst));
  assert.equal(after.length, 10);
});

test("SC3 the cap picks what DuckDB's md5(CAST(id AS VARCHAR)), id picks", async () => {
  const data = rows({ 1: range(1000, 1400), 2: range(5_000_000_000, 5_000_000_030), 3: [7] });
  const values = data.map((r) => `(${r.id}::BIGINT, ${r.species_id})`).join(", ");
  const sql = `SELECT id FROM (VALUES ${values}) t(id, species_id)
    QUALIFY row_number() OVER (PARTITION BY species_id ORDER BY md5(CAST(id AS VARCHAR)), id) <= 25 ORDER BY id`;
  const duck = await withOfflineDuckDb(async (con) => (await con.runAndReadAll(sql)).getRowsJson().map((r) => Number(r[0])));
  assert.equal(duck.length, 25 + 25 + 1);
  assert.deepEqual(ids(capSample(data, 25)), duck);
});

test("SC4 output sorted by id; any input order gives the same rows", () => {
  const data = rows({ 1: range(1, 40), 2: range(40, 60) });
  const got = capSample(data, 15);
  assert.deepEqual(ids(got), ids(got).sort((a, b) => a - b));
  assert.deepEqual(capSample([...data].reverse(), 15), got);
});

test("SAMPLE_RULES names the cap, its order, the license order and the species rule", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(SAMPLE_RULES)), SAMPLE_RULES);
  assert.equal(SAMPLE_RULES.cap, CAP);
  assert.deepEqual(SAMPLE_RULES.licenseOrder, ["CC0 1.0", "CC BY 4.0", "CC BY-NC 4.0"]);
  assert.deepEqual(SAMPLE_RULES.openLicenses, ["CC0 1.0", "CC BY 4.0"]);
  assert.match(SAMPLE_RULES.capOrder, /md5.*gbifID.*then gbifID/);
  assert.match(SAMPLE_RULES.species, /speciesKey.*taxonKey/);
});
