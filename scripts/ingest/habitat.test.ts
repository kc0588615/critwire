// HB1–HB6 (L3 §1.3 rules, §1.7 #6, 7, 9, 10): the habitat ingest's pure rules. Written before the code, seen failing
// first. Offline. Failure modes:
// HB1: pickClass gives a record an overlay class (open water over the land partition), a tie depends on input order,
//      or a record outside every layer gets a class (or throws) instead of NULL.
// HB2: countryHabitatRows publishes overlay rows, rounds off the 0.01 km² grid, keeps rows that round to 0, lets a
//      negative, NaN or infinite estimate through, or a duplicate (country, code), or depends on input order.
// HB3: rasterWkb's header or band layout differs from PostGIS raster WKB v0 (ST_RastFromWKB then misreads it), or a
//      pixel buffer of the wrong length or a size past uint16 is written anyway.
// HB4: habitatRecordsCsv depends on input order or formats numbers other than JS does (the fingerprint drifts).
// HB5: assertHabitatFresh passes habitat rows made for other records (a moved coordinate, an added or dropped id, a
//      rule change that publishes another row set) or other country outlines.
// HB6: assertHabitatFresh flags a sample.csv edit that leaves every published (id, longitude, latitude) equal.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { CountriesFile } from "../derive/naturalearth.ts";
import { deriveSample, type LearnInputs } from "../derive/sample.ts";
import { downloadRequest } from "../learn/download.ts";
import { SAMPLE_COLUMNS, type SampleDatasets, type SampleDownload } from "../learn/sample-files.ts";
import { SAMPLE_RULES } from "../learn/sample-rules.ts";
import type { Species } from "../species.ts";
import {
  assertHabitatFresh, CLIPS, countryHabitatRows, HABITAT_INPUTS, habitatRecordsCsv, LAYER_CODES, OVERLAY_CODES, pickClass,
  rasterWkb, recordsFingerprint,
} from "./habitat.ts";

test("HB0 the pins: 79 layer codes, the overlay inside them, two Zenodo files by md5, two 0.75° clips", () => {
  assert.equal(LAYER_CODES.length, 79);
  assert.deepEqual([...LAYER_CODES].sort((a, b) => a - b), LAYER_CODES);
  for (const c of OVERLAY_CODES) assert.ok(LAYER_CODES.includes(c), `overlay ${c} is a layer`);
  for (const f of Object.values(HABITAT_INPUTS)) assert.match(f.md5, /^[0-9a-f]{32}$/);
  for (const { west, south, east, north } of Object.values(CLIPS)) {
    assert.equal(Math.round((east - west) * 100), 75);
    assert.equal(Math.round((north - south) * 100), 75);
  }
});

test("HB1 pickClass: largest partition fraction, ties to the lowest code, overlay never wins, nothing gives NULL", () => {
  assert.equal(pickClass([{ code: 104, fraction: 300 }, { code: 105, fraction: 600 }, { code: 106, fraction: 100 }]), 105);
  assert.equal(pickClass([{ code: 1405, fraction: 500 }, { code: 104, fraction: 500 }]), 104);
  assert.equal(pickClass([{ code: 104, fraction: 500 }, { code: 1405, fraction: 500 }]), 104);
  assert.equal(pickClass([{ code: 1001, fraction: 900 }, { code: 901, fraction: 800 }, { code: 600, fraction: 100 }]), 600);
  assert.equal(pickClass([{ code: 1000, fraction: 1000 }]), null);
  assert.equal(pickClass([{ code: 104, fraction: 0 }, { code: 105, fraction: 0 }]), null);
  assert.equal(pickClass([]), null);
  assert.throws(() => pickClass([{ code: 104, fraction: -1 }]), /fraction -1/);
  assert.throws(() => pickClass([{ code: 104, fraction: Number.NaN }]), /fraction NaN/);
});

test("HB2 countryHabitatRows: partition only, 0.01 km², rows that round to 0 dropped, bad values throw, sorted", () => {
  assert.deepEqual(countryHabitatRows([
    { country: "TZ", code: 105, km2: 12.346 },
    { country: "CR", code: 1004, km2: 50 },
    { country: "CR", code: 106, km2: 0.004999 },
    { country: "CR", code: 107, km2: 0.005 },
    { country: "AU", code: 1405, km2: 1_234_567.891 },
    { country: "CR", code: 104, km2: 0 },
    { country: "AU", code: 300, km2: 2 },
  ]), [
    { country_code: "AU", habitat_code: 300, est_area_km2: 2 },
    { country_code: "AU", habitat_code: 1405, est_area_km2: 1_234_567.89 },
    { country_code: "CR", habitat_code: 107, est_area_km2: 0.01 },
    { country_code: "TZ", habitat_code: 105, est_area_km2: 12.35 },
  ]);
  for (const km2 of [-0.01, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(() => countryHabitatRows([{ country: "CR", code: 104, km2 }]), new RegExp(`CR 104: km² ${km2}`));
  }
  assert.throws(() => countryHabitatRows([{ country: "CR", code: 104, km2: 1 }, { country: "CR", code: 104, km2: 2 }]), /CR 104 twice/);
});

test("HB3 rasterWkb: PostGIS raster WKB v0 header, one 16BUI band with nodata, 61 + 1 + 2 + 2·w·h bytes", () => {
  const pixels = new Uint8Array(new Uint16Array([1, 2, 3, 0, 105, 1405]).buffer);
  const wkb = rasterWkb({ width: 3, height: 2, ulx: -84.2, uly: 10.6, scale: 0.000898315, srid: 4326, nodata: 0, pixels });
  assert.equal(wkb.length, 61 + 1 + 2 + 2 * 3 * 2);
  const v = new DataView(wkb.buffer, wkb.byteOffset, wkb.byteLength);
  assert.deepEqual([v.getUint8(0), v.getUint16(1, true), v.getUint16(3, true)], [1, 0, 1]);
  assert.deepEqual([5, 13, 21, 29, 37, 45].map((o) => v.getFloat64(o, true)), [0.000898315, -0.000898315, -84.2, 10.6, 0, 0]);
  assert.deepEqual([v.getInt32(53, true), v.getUint16(57, true), v.getUint16(59, true)], [4326, 3, 2]);
  assert.equal(v.getUint8(61), 0x40 | 6, "hasNodata flag + 16BUI");
  assert.equal(v.getUint16(62, true), 0);
  assert.deepEqual([...wkb.subarray(64)], [...pixels]);

  const ok = { width: 3, height: 2, ulx: 0, uly: 0, scale: 1, srid: 4326, nodata: 65535, pixels };
  assert.throws(() => rasterWkb({ ...ok, pixels: pixels.subarray(1) }), /11 pixel bytes ≠ 2 × 3 × 2/);
  assert.throws(() => rasterWkb({ ...ok, width: 65_536, pixels: new Uint8Array(2 * 65_536 * 2) }), /width 65536/);
  assert.throws(() => rasterWkb({ ...ok, nodata: 65_536 }), /nodata 65536/);
  assert.throws(() => rasterWkb({ ...ok, scale: 0 }), /scale 0/);
});

test("HB4 habitatRecordsCsv: id,longitude,latitude, sorted by id, JS number formatting", () => {
  assert.equal(habitatRecordsCsv([
    { id: 12, longitude: 37, latitude: 1e-3 },
    { id: 5, longitude: -84.2, latitude: 10.600000000000001 },
    { id: 7, longitude: 147.25, latitude: -43.1 },
  ]), "id,longitude,latitude\n5,-84.2,10.600000000000001\n7,147.25,-43.1\n12,37,0.001\n");
});

// A two-row sample through deriveSample (the build's path to the published records), as sample.test.ts builds it.
const KEY = "0000001-260928105237408";
const D1 = "11111111-1111-1111-1111-111111111111";
const core = {
  records: [{ id: 1, ids: { gbif: 100 } }] as unknown as Species[],
  countries: { rows: [{ code: "CR" }] } as unknown as CountriesFile,
};
const ROWS = [`5,1,${D1},CC0 1.0,HUMAN_OBSERVATION,-83.9,10.1,1.0,CR,2008,11`, `9,1,${D1},CC BY 4.0,PRESERVED_SPECIMEN,-84.0,10.2,,CR,,`];
const published = (rows = ROWS) => {
  const inputs: LearnInputs = {
    download: {
      key: KEY, doi: "10.15468/dl.test01", request: { ...downloadRequest([100]), type: "OCCURRENCE", verbatimExtensions: [] },
      sampleRules: structuredClone(SAMPLE_RULES), species: [{ id: 1, gbif: 100 }],
    } as unknown as SampleDownload,
    datasets: { retrieved: "2026-10-28", downloadKey: KEY, datasets: [{ key: D1, title: "T", publisher: "P", publishingOrganizationKey: "o", doi: null, license: "CC0 1.0", licenseUrl: "u", records: 2, recordLicenses: {} }] } as unknown as SampleDatasets,
    sampleCsv: [SAMPLE_COLUMNS.join(","), ...rows].join("\n") + "\n",
    registration: null,
  };
  return deriveSample(core, inputs).occurrences;
};
const SHAPES = "a".repeat(64);
const recorded = () => ({ countryShapes: { sha256: SHAPES }, records: recordsFingerprint(published()) });
const stale = (cause: string) => new RegExp(`^Error: data/learn/habitat\\.json is stale \\(${cause}\\): run pnpm ingest habitat$`);

test("HB5 assertHabitatFresh: other outlines or other published records are stale, naming the ingest", () => {
  assert.deepEqual(recordsFingerprint(published()), {
    sha256: createHash("sha256").update("id,longitude,latitude\n5,-83.9,10.1\n9,-84,10.2\n").digest("hex"), count: 2,
  });
  assert.doesNotThrow(() => assertHabitatFresh(recorded(), { countryShapesSha256: SHAPES, occurrences: published() }));
  assert.throws(() => assertHabitatFresh(recorded(), { countryShapesSha256: "b".repeat(64), occurrences: published() }),
    stale("country_shapes\\.parquet changed"));
  const cases = {
    "a moved coordinate": [ROWS[0], ROWS[1].replace("-84.0,10.2", "-84.0,10.25")],
    "an added id": [...ROWS, `11,1,${D1},CC0 1.0,HUMAN_OBSERVATION,-83.5,10.3,,CR,,`],
    "a dropped id": [ROWS[0]],
    // A sampleRules change re-ingests the sample, so it reaches the habitat ingest only as another published row set.
    "a rule change that publishes another row set (a lower cap)": [ROWS[1]],
  };
  for (const [why, rows] of Object.entries(cases)) {
    assert.throws(() => assertHabitatFresh(recorded(), { countryShapesSha256: SHAPES, occurrences: published(rows) }),
      stale("published records changed"), why);
  }
});

test("HB6 assertHabitatFresh: a sample.csv edit that leaves every published id, longitude and latitude passes", () => {
  const edited = [ROWS[0].replace("2008,11", "2009,12"), ROWS[1].replace(",,CR,,", ",250.0,CR,1999,")];
  assert.doesNotThrow(() => assertHabitatFresh(recorded(), { countryShapesSha256: SHAPES, occurrences: published(edited) }));
});
