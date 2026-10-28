// CD1–CD10, NE2: the countries matcher (002 §6, plan D4), ported from A1's spike test/countries-draft.test.ts. Written
// before the code, seen failing first. CD8/CD9's Parquet half moves to the build (S5); CD11 is the ingest's.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { NaturalEarthSnapshot } from "../raw.ts";
import { NE_COMMIT, NE_FIELDS, NE_RELEASE } from "../ingest/naturalearth.ts";
import { assertNaturalEarthFresh, COUNTRY_COLUMNS, matchCountries, type NeProps } from "./naturalearth.ts";

const FIX = new URL("../fixtures/", import.meta.url);
const features = (f: string): NeProps[] => JSON.parse(readFileSync(new URL(f, FIX), "utf8")).features.map((x: { properties: NeProps }) => x.properties);
const fixture = () => ({
  layers: { countries: features("ne-countries.geojson"), map_units: features("ne-map-units.geojson") },
  // The spike's gbif-country.json fixture: GBIF's enumeration codes (a cross-check, never a source).
  gbifCodes: ["FR", "NO", "XK", "NA", "BR", "GF", "MQ", "RE", "SO"],
  speciesCodes: ["BR", "FR", "GF", "MQ", "NA", "NO", "RE", "TW", "XK"],
});
type Fixture = ReturnType<typeof fixture>;
const run = ({ layers, ...opts }: Fixture) => matchCountries(layers, opts);
const byCode = (d: ReturnType<typeof matchCountries>) => new Map(d.rows.map((r) => [r.code, r]));
const edit = (rows: NeProps[], unit: string, patch: NeProps) => rows.map((p) => (p.ADMIN === unit || p.GEOUNIT === unit ? { ...p, ...patch } : p));
const withCountries = (f: Fixture, countries: NeProps[]) => ({ ...f, layers: { ...f.layers, countries } });

test("CD1 a species code with no row fails, listing every unmatched code", () => {
  const f = fixture();
  assert.throws(() => run({ ...f, speciesCodes: [...f.speciesCodes, "QQ", "ZY"] }), /no country row for 2 species codes: QQ, ZY/);
  assert.throws(() => run(withCountries(f, f.layers.countries.filter((p) => p.ADMIN !== "Norway"))), /: NO$/);
  assert.doesNotThrow(() => run(f));
});

test("CD2 ISO_A2 -99 with a valid ISO_A2_EH uses ISO_A2_EH (FR, NO, XK); CN-TW too (TW)", () => {
  const d = run(fixture());
  const m = byCode(d);
  assert.equal(m.get("FR")?.name, "France");
  assert.equal(m.get("NO")?.name, "Norway");
  assert.equal(m.get("XK")?.name, "Kosovo");
  assert.equal(m.get("TW")?.name, "Taiwan");
  assert.deepEqual(d.report.matches.NO, { layer: "countries", field: "ISO_A2_EH", index: 1, unit: "Norway" });
  assert.deepEqual(d.report.matches.NA, { layer: "countries", field: "ISO_A2", index: 3, unit: "Namibia" });
});

test("CD3 a row with both codes -99 (or an Overlay unit) gets no code; a species needing it fails CD1", () => {
  const f = fixture();
  const d = run(f);
  assert.ok(!d.rows.some((r) => r.name === "Somaliland"));
  assert.deepEqual(d.report.noCode, ["Somaliland"]);
  assert.ok(!byCode(d).has("XD"));
  assert.deepEqual(d.report.overlays, ["UNDOF"]);
  const somalia = edit(f.layers.countries, "Somaliland", { ADMIN: "Somalia" });
  assert.throws(() => run({ ...withCountries(f, somalia), speciesCodes: [...f.speciesCodes, "SO"] }), /: SO$/);
});

test("CD4 map_units supplies only codes with no countries row (GF, MQ, RE); a countries row wins", () => {
  const d = run(fixture());
  assert.deepEqual(d.report.fromMapUnits, ["GF", "MQ", "RE"]);
  assert.equal(byCode(d).get("FR")?.name, "France");
  assert.deepEqual(byCode(d).get("GF"), { code: "GF", name: "French Guiana", continent: "South America", region: "Americas", subregion: "South America" });
  assert.equal(d.report.matches.GF.layer, "map_units");
});

test("CD5 two rows with one code fail, listing both, unless exactly one is the code's own unit (ADM0_A3 = ISO_A3_EH)", () => {
  const f = fixture();
  const d = run(f);
  assert.equal(byCode(d).get("BR")?.name, "Brazil");
  assert.deepEqual(d.report.folded, [{ code: "BR", kept: "Brazil", dropped: ["Brazilian Island"] }]);
  const twoOwn = edit(f.layers.countries, "Brazilian Island", { ADM0_A3: "BRA" });
  assert.throws(() => run(withCountries(f, twoOwn)), /code BR on 2 countries rows: Brazil, Brazilian Island/);
  const noneOwn = edit(f.layers.countries, "Brazil", { ADM0_A3: "BRX" });
  assert.throws(() => run(withCountries(f, noneOwn)), /code BR on 2 countries rows: Brazil, Brazilian Island/);
  const mu = [...f.layers.map_units, { ...f.layers.map_units.find((p) => p.GEOUNIT === "Martinique")!, GEOUNIT: "Martinique 2", NAME_EN: "Martinique 2" }];
  assert.throws(() => run({ ...f, layers: { ...f.layers, map_units: mu } }), /code MQ on 2 map_units rows: Martinique, Martinique 2/);
});

test("CD6 two rows with the same name fail", () => {
  const f = fixture();
  assert.throws(() => run(withCountries(f, edit(f.layers.countries, "Norway", { NAME_EN: "France" }))), /name "France" on 2 codes: FR, NO/);
});

test("CD7 an empty or null name, continent, region or subregion fails", () => {
  const f = fixture();
  for (const [field, v] of [["NAME_EN", ""], ["CONTINENT", null], ["REGION_UN", "  "], ["SUBREGION", undefined]] as const) {
    assert.throws(() => run(withCountries(f, edit(f.layers.countries, "Norway", { [field]: v }))), new RegExp(`NO: empty ${field}`));
  }
});

test("CD8 + CD9 rows: exactly code, name, continent, region, subregion, in that order; sorted by code; NA is the text 'NA'", () => {
  const { rows } = run(fixture());
  assert.deepEqual(COUNTRY_COLUMNS, ["code", "name", "continent", "region", "subregion"]);
  assert.ok(rows.every((r) => JSON.stringify(Object.keys(r)) === JSON.stringify(COUNTRY_COLUMNS)));
  assert.deepEqual(rows.map((r) => r.code), [...rows.map((r) => r.code)].sort());
  assert.equal(rows.find((r) => r.name === "Namibia")?.code, "NA");
});

test("CD10 codes missing from GBIF's enumeration are reported, not fatal; XK is present", () => {
  const d = run(fixture());
  assert.deepEqual(d.report.notInGbif, ["TW"]);
  assert.deepEqual(d.report.gbifNotInRows, ["SO"]);
  assert.ok(byCode(d).has("XK"));
});

test("NE2 a snapshot whose release, commit or fields differ from the ingest's constants is stale", () => {
  const snapshot = { release: NE_RELEASE, commit: NE_COMMIT, fields: NE_FIELDS } as NaturalEarthSnapshot;
  assert.doesNotThrow(() => assertNaturalEarthFresh(snapshot));
  const stale = /^Error: data\/raw\/naturalearth is stale: run pnpm ingest naturalearth$/;
  assert.throws(() => assertNaturalEarthFresh({ ...snapshot, release: { ...NE_RELEASE, version: "v5.1.1" } }), stale);
  assert.throws(() => assertNaturalEarthFresh({ ...snapshot, commit: "0".repeat(40) }), stale);
  assert.throws(() => assertNaturalEarthFresh({ ...snapshot, fields: { ...NE_FIELDS, map_units: NE_FIELDS.map_units.slice(1) } }), stale);
});
