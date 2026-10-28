// SD1–SD5, F7, F8 (plan D7, D15): derive's half of the lab sample. Written before the code, seen failing first.
// Failure modes:
// SD1: a malformed sample.csv row (field count, header, a non-number) is read as data → refuses naming the line.
// SD2: a duplicate (or out-of-order) id is published twice → refuses naming the id.
// SD3: a row's dataset_key isn't in datasets.json, so it has no credit → refuses naming the key.
// SD4: a country code with no countries row and not ZZ/XZ gets a NULL country_code → refuses naming it.
// SD5: pnpm derive writes species.json while the sample is stale → deriveAll throws (derive.ts writes only after it).
// F7: the stored request isn't today's downloadRequest (ids.gbif or filters changed) → stale, names the ingest.
// F8: download.json's sampleRules or datasets.json's downloadKey differ → stale, names the ingest.
// Plus: a species_id that isn't a species, a license that isn't open, and the DOI only for the same counts and download.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { CountriesFile } from "./naturalearth.ts";
import { deriveAll, deriveCore, readDeriveInputs } from "./pipeline.ts";
import type { Registration } from "../gbif/derived-dataset.ts";
import { downloadRequest } from "../learn/download.ts";
import { SAMPLE_COLUMNS, type SampleDatasets, type SampleDownload } from "../learn/sample-files.ts";
import { SAMPLE_RULES } from "../learn/sample-rules.ts";
import type { Species } from "../species.ts";
import { deriveSample, type LearnInputs } from "./sample.ts";

const KEY = "0000001-260928105237408";
const DOI = "10.15468/dl.test01";
const D1 = "11111111-1111-1111-1111-111111111111";
const D2 = "22222222-2222-2222-2222-222222222222";
const D3 = "33333333-3333-3333-3333-333333333333";

const core = {
  records: [{ id: 1, ids: { gbif: 100 } }, { id: 2, ids: { gbif: 200 } }, { id: 3, ids: { gbif: null } }] as unknown as Species[],
  countries: { rows: [{ code: "TZ" }, { code: "KE" }] } as unknown as CountriesFile,
};
const ROWS = [
  "5,1,11111111-1111-1111-1111-111111111111,CC0 1.0,HUMAN_OBSERVATION,35.5,-3.1,1.0,TZ,2008,11",
  "7,2,11111111-1111-1111-1111-111111111111,CC BY 4.0,HUMAN_OBSERVATION,36.25,-1.5,,ZZ,2008,",
  "9,1,22222222-2222-2222-2222-222222222222,CC BY 4.0,PRESERVED_SPECIMEN,35.0,-3.0,805.0,,,",
  "12,2,22222222-2222-2222-2222-222222222222,CC BY 4.0,HUMAN_OBSERVATION,37,1e-3,0,KE,1999,1",
];
const csv = (rows = ROWS, header = SAMPLE_COLUMNS.join(",")) => [header, ...rows].join("\n") + "\n";
const dataset = (key: string, license: "CC0 1.0" | "CC BY 4.0" | "CC BY-NC 4.0") => ({
  key, title: `Title ${key.slice(0, 1)}`, publisher: `Publisher ${key.slice(0, 1)}`, publishingOrganizationKey: "o", doi: `10.1/${key.slice(0, 1)}`,
  license, licenseUrl: "u", records: 1, recordLicenses: {},
});
function inputs(patch: (i: LearnInputs) => void = () => {}): LearnInputs {
  const i: LearnInputs = {
    download: {
      key: KEY, doi: DOI, request: { ...downloadRequest([100, 200]), type: "OCCURRENCE", verbatimExtensions: [] }, sampleRules: structuredClone(SAMPLE_RULES),
    } as unknown as SampleDownload,
    datasets: { retrieved: "2026-10-28", downloadKey: KEY, datasets: [dataset(D2, "CC BY 4.0"), dataset(D1, "CC0 1.0"), dataset(D3, "CC BY-NC 4.0")] } as SampleDatasets,
    sampleCsv: csv(),
    registration: null,
  };
  patch(i);
  return i;
}
const registration = (relatedDatasets: Record<string, number>, originalDownloadDOI = DOI) =>
  ({ doi: "10.15468/dd.learn1", relatedDatasets, originalDownloadDOI }) as unknown as Registration;
const stale = /data\/raw\/gbif-sample is stale \(.+\): run pnpm ingest gbif-sample/;

test("a clean sample: typed rows, the country-key contract, the sample's datasets and its contributions", () => {
  const r = deriveSample(core, inputs());
  assert.deepEqual(r.occurrences.map((o) => o.id), [5, 7, 9, 12]);
  assert.deepEqual(r.occurrences[0], {
    id: 5, species_id: 1, dataset_key: D1, license: "CC0 1.0", basis_of_record: "HUMAN_OBSERVATION", longitude: 35.5, latitude: -3.1,
    coordinate_uncertainty_m: 1, country_code_gbif: "TZ", country_code: "TZ", year: 2008, month: 11,
  });
  assert.deepEqual([r.occurrences[1].country_code_gbif, r.occurrences[1].country_code, r.occurrences[1].coordinate_uncertainty_m, r.occurrences[1].month], ["ZZ", null, null, null]);
  assert.deepEqual([r.occurrences[2].country_code_gbif, r.occurrences[2].country_code, r.occurrences[2].year], [null, null, null]);
  assert.deepEqual([r.occurrences[3].latitude, r.occurrences[3].coordinate_uncertainty_m, r.occurrences[3].country_code], [0.001, 0, "KE"]);
  assert.deepEqual(r.datasets, [
    { dataset_key: D1, title: "Title 1", publisher: "Publisher 1", doi: "10.1/1", license: "CC0 1.0" },
    { dataset_key: D2, title: "Title 2", publisher: "Publisher 2", doi: "10.1/2", license: "CC BY 4.0" },
  ]);
  assert.deepEqual(r.contributions, {
    downloadKey: KEY, originalDownloadDoi: DOI, records: 4, datasets: { [D1]: 2, [D2]: 2 },
    sample: { file: "data/raw/gbif-sample/sample.csv", sha256: createHash("sha256").update(csv()).digest("hex") },
  });
  assert.equal(r.doi, null);
});

test("SD1 a malformed row, a changed header or a non-number refuses, naming the line", () => {
  assert.throws(() => deriveSample(core, inputs((i) => { i.sampleCsv = csv([...ROWS, "13,1,x"]); })), /sample\.csv line 6: 3 fields, expected 11/);
  assert.throws(() => deriveSample(core, inputs((i) => { i.sampleCsv = csv(ROWS, "id,species"); })), /sample\.csv: header .* expected id,species_id,/);
  assert.throws(() => deriveSample(core, inputs((i) => { i.sampleCsv = csv([ROWS[0].replace("35.5", "east")]); })), /sample\.csv line 2: longitude "east"/);
  assert.throws(() => deriveSample(core, inputs((i) => { i.sampleCsv = csv([ROWS[0].replace(",2008,", ",20x8,")]); })), /sample\.csv line 2: year "20x8"/);
  assert.throws(() => deriveSample(core, inputs((i) => { i.sampleCsv = csv([ROWS[0].replace("5,1,", ",1,")]); })), /sample\.csv line 2: id ""/);
  assert.throws(() => deriveSample(core, inputs((i) => { i.sampleCsv = csv(ROWS).slice(0, -1); })), /sample\.csv doesn't end with a newline/);
});

test("SD2 a duplicate or out-of-order id refuses, naming it", () => {
  assert.throws(() => deriveSample(core, inputs((i) => { i.sampleCsv = csv([ROWS[0], ROWS[0]]); })), /sample\.csv line 3: id 5 after 5 \(duplicate or out of order\)/);
  assert.throws(() => deriveSample(core, inputs((i) => { i.sampleCsv = csv([ROWS[1], ROWS[0]]); })), /line 3: id 5 after 7/);
});

test("SD3 a dataset_key missing from datasets.json refuses, naming it", () => {
  const row = ROWS[0].replace(D1, "44444444-4444-4444-4444-444444444444");
  assert.throws(() => deriveSample(core, inputs((i) => { i.sampleCsv = csv([row]); })), /line 2: dataset 44444444-4444-4444-4444-444444444444 isn't in datasets\.json/);
});

test("SD4 a country code with no countries row, not ZZ or XZ, refuses, naming it; XZ keeps the raw code", () => {
  assert.throws(() => deriveSample(core, inputs((i) => { i.sampleCsv = csv([ROWS[0].replace(",TZ,", ",QQ,")]); })), /country codes with no countries row and not ZZ\/XZ: QQ \(1 rows\)/);
  const xz = deriveSample(core, inputs((i) => { i.sampleCsv = csv([ROWS[0].replace(",TZ,", ",XZ,")]); }));
  assert.deepEqual([xz.occurrences[0].country_code_gbif, xz.occurrences[0].country_code], ["XZ", null]);
});

test("a species_id that isn't a species with an ids.gbif, or a license that isn't open, refuses", () => {
  assert.throws(() => deriveSample(core, inputs((i) => { i.sampleCsv = csv([ROWS[0].replace("5,1,", "5,3,")]); })), /line 2: species_id 3 isn't a species with an ids\.gbif/);
  assert.throws(() => deriveSample(core, inputs((i) => { i.sampleCsv = csv([ROWS[0].replace("CC0 1.0", "CC BY-NC 4.0")]); })), /line 2: license "CC BY-NC 4.0" isn't open/);
});

test("F7 a stored request that isn't today's downloadRequest is stale", () => {
  assert.throws(() => deriveSample(core, inputs((i) => { i.download.request = downloadRequest([100]) as unknown as SampleDownload["request"]; })), stale);
  const moved = { ...core, records: [{ id: 1, ids: { gbif: 101 } }, { id: 2, ids: { gbif: 200 } }] as unknown as Species[] };
  assert.throws(() => deriveSample(moved, inputs()), /stale \(its request isn't today's downloadRequest/);
});

test("F8 other sampleRules, or datasets.json from another download, is stale", () => {
  assert.throws(() => deriveSample(core, inputs((i) => { (i.download.sampleRules as { cap: number }).cap = 1000; })), /stale \(sampleRules differ/);
  assert.throws(() => deriveSample(core, inputs((i) => { i.datasets.downloadKey = "0000002-260928105237408"; })), /stale \(datasets\.json is for download 0000002-/);
});

test("the learn-sample DOI is current only for the same counts and the same download DOI", () => {
  const counts = { [D1]: 2, [D2]: 2 };
  assert.equal(deriveSample(core, inputs((i) => { i.registration = registration(counts); })).doi, "10.15468/dd.learn1");
  assert.equal(deriveSample(core, inputs((i) => { i.registration = registration({ ...counts, [D2]: 3 }); })).doi, null);
  assert.equal(deriveSample(core, inputs((i) => { i.registration = registration(counts, "10.15468/dl.other"); })).doi, null);
});

test("SD5 with a stale sample deriveAll throws (so pnpm derive writes nothing); the ingest's deriveCore still runs", async () => {
  const real = await readDeriveInputs();
  const learn = { ...real.learn, download: { ...real.learn.download, sampleRules: { ...real.learn.download.sampleRules, cap: 1 } } };
  assert.throws(() => deriveAll({ ...real, learn }), stale);
  const stalled = { ...real, learn };
  assert.equal(deriveCore(stalled).records.length, 76);
});
