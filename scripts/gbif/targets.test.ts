// gbif:register's two targets (plan D8; SC4), in a temp XDG_STATE_HOME. Failure modes first:
// RT1: the targets share a lock, an intent, a tag prefix or a deposit, so one run blocks, overwrites or "verifies" the
//      other's → each has its own; countries keeps every current name; --target defaults to countries and refuses others.
// RT2: one target's intent or lock blocks the other → independent.
// RT3: the learn-sample body lacks originalDownloadDOI (GBIF stores the derived dataset without its download, which
//      then expires uncited) or the hash line → both there; countries' body is the same as today's, with no download key.
// RT4: a read-back with another download DOI (or none) passes → hard error, for every kind of run; countries with none
//      passes, and countries with one is a hard error.
// RT5: an ambiguous POST that did create the learn-sample DOI is posted again, or adopted without its download checked
//      → the next run lists, adopts it, and its read-back checks the download DOI.
// RT6: countries' registration.json changes bytes (a new key, another order) → the read-back of the committed one
//      reproduces it byte for byte; learn-sample's carries originalDownloadDOI.
// RT7: the learn-sample DOI counts as current for the same counts from another download → it doesn't.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { formatJson } from "../json.ts";
import type { Contributions, Registration, SampleContributions } from "./derived-dataset.ts";
import { classifyPost, decide, hashLine, readBackErrors, requestBody, toRegistration, type DerivedDatasetRecord } from "./register.ts";
import { parseTarget, TARGETS } from "./targets.ts";

let home: string;
before(() => {
  home = mkdtempSync(join(tmpdir(), "critwire-targets-"));
  process.env.XDG_STATE_HOME = home;
});
after(() => rmSync(home, { recursive: true, force: true }));

const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const HASH = "1".repeat(64);
const DL = "10.15468/dl.fbpk9w";
const SOURCE = `https://github.com/kc0588615/critwire/tree/${"a".repeat(40)}/data`;
const COUNTRIES: Contributions = {
  retrieved: "2026-10-21", records: 7,
  taxa: [{ taxonKey: 10, speciesIds: [1], records: 7, url: "https://api.gbif.org/v1/occurrence/search?taxonKey=10" }],
  datasets: { [A]: 3, [B]: 4 },
};
const SAMPLE: SampleContributions = {
  downloadKey: "0041824-260928105237408", originalDownloadDoi: DL, records: 7, datasets: { [A]: 3, [B]: 4 },
  sample: { file: "data/raw/gbif-sample/sample.csv", sha256: "9".repeat(64) },
};
const learn = TARGETS["learn-sample"];
const countries = TARGETS.countries;

test("RT1 the targets share no lock, intent, tag prefix, deposit or file; countries keeps its names; --target", () => {
  const values = (t: typeof countries | typeof learn) => [t.state.lockFile(), t.state.intentFile(), t.tagPrefix, t.depositPath,
    t.contributionsFile.href, t.registrationFile.href];
  const [c, l] = [values(countries), values(learn)];
  for (let i = 0; i < c.length; i++) assert.notEqual(c[i], l[i]);
  assert.deepEqual(c, [join(home, "critwire", "gbif-register.lock"), join(home, "critwire", "gbif-register-intent.json"),
    "gbif-dd", "gbif-derived-dataset/contributions.json", new URL("../../data/gbif-derived-dataset/contributions.json", import.meta.url).href,
    new URL("../../data/gbif-derived-dataset/registration.json", import.meta.url).href]);
  assert.deepEqual(l.slice(0, 4), [join(home, "critwire", "gbif-register-learn-sample.lock"),
    join(home, "critwire", "gbif-register-learn-sample-intent.json"), "gbif-learn", "gbif-learn-sample/contributions.json"]);
  assert.equal(learn.contributionsFile.href, new URL(`../../data/${learn.depositPath}`, import.meta.url).href);
  assert.equal(parseTarget([]), countries);
  assert.equal(parseTarget(["--target", "countries"]), countries);
  assert.equal(parseTarget(["--target", "learn-sample"]), learn);
  for (const args of [["--target"], ["--target", "sample"], ["learn-sample"], ["--target", "countries", "x"]]) {
    assert.throws(() => parseTarget(args), /usage: pnpm gbif:register \[--target countries\|learn-sample\]/, JSON.stringify(args));
  }
});

test("RT2 one target's intent or lock doesn't block the other", async () => {
  const intent = { contributionsSha256: HASH, request: requestBody(COUNTRIES, HASH, SOURCE), startedAt: "2026-10-28T07:00:00.000Z" };
  await countries.state.createIntent(intent);
  assert.equal(await learn.state.readIntent(), null);
  await countries.state.withLock(async () => {
    assert.equal(await learn.state.withLock(async () => 1), 1);
    await learn.state.withLock(async () => {
      await assert.rejects(learn.state.withLock(async () => 2), /gbif:register --target learn-sample is running/);
    });
  });
  assert.deepEqual(await countries.state.readIntent(), intent);
  await countries.state.deleteIntent();
});

test("RT3 the learn-sample body carries its download and the hash line; countries' is unchanged", () => {
  const body = learn.requestBody(SAMPLE, HASH, SOURCE);
  assert.equal(body.originalDownloadDOI, DL);
  assert.deepEqual(body.relatedDatasets, SAMPLE.datasets);
  assert.equal(body.sourceUrl, SOURCE);
  assert.equal(body.description.split("\n").at(-1), hashLine(HASH));
  assert.match(body.description, new RegExp(`${SAMPLE.downloadKey} \\(${DL}\\)`));
  const c = countries.requestBody(COUNTRIES, HASH, SOURCE);
  assert.deepEqual(c, requestBody(COUNTRIES, HASH, SOURCE));
  assert.ok(!("originalDownloadDOI" in c));
  assert.equal(learn.downloadDoi(SAMPLE), DL);
  assert.equal(countries.downloadDoi(COUNTRIES), null);
});

const record = (over: Partial<DerivedDatasetRecord> = {}): DerivedDatasetRecord => ({
  doi: "10.15468/dd.learn1", title: "t", description: `about\n${hashLine(HASH)}`, sourceUrl: SOURCE,
  citation: "GBIF.org", createdBy: "dinobytes215", ...over,
});
const usages = [{ datasetKey: A, numberRecords: 3 }, { datasetKey: B, numberRecords: 4 }];
const check = (r: DerivedDatasetRecord, expectedDownloadDoi: string | null) =>
  readBackErrors({ expected: null, record: r, usages, datasets: SAMPLE.datasets, createdBy: "dinobytes215", hash: HASH, expectedDownloadDoi });

test("RT4 a read-back with another download DOI, or none, is a hard error", () => {
  assert.deepEqual(check(record({ originalDownloadDOI: DL }), DL), { hard: [], warnings: [] });
  for (const r of [record({ originalDownloadDOI: "10.15468/dl.other1" }), record(), record({ originalDownloadDOI: null })]) {
    const { hard } = check(r, DL);
    assert.equal(hard.length, 1, JSON.stringify(hard));
    assert.match(hard[0], new RegExp(`originalDownloadDOI is .*, not ${DL}`));
  }
  assert.deepEqual(check(record(), null), { hard: [], warnings: [] });
  assert.match(check(record({ originalDownloadDOI: DL }), null).hard.join(), /originalDownloadDOI is 10\.15468\/dl\.fbpk9w, not none/);
});

test("RT5 an ambiguous POST that created the DOI is adopted on the next run, its download checked", () => {
  const request = learn.requestBody(SAMPLE, HASH, SOURCE);
  assert.equal(classifyPost({ error: "timeout" }).kind, "ambiguous");
  const intent = { contributionsSha256: HASH, request, startedAt: "2026-10-28T07:00:00.000Z" };
  const state = { registration: null, contributionsSha256: HASH, datasets: SAMPLE.datasets, intent, intentFile: learn.state.intentFile() };
  assert.deepEqual(decide({ ...state, listing: null }), { action: "list" });
  const minted = record({ title: request.title, description: request.description, originalDownloadDOI: DL });
  const d = decide({ ...state, listing: [minted] });
  assert.deepEqual(d, { action: "adopt", doi: minted.doi, expected: request });
  const expectedDownloadDoi = learn.downloadDoi(SAMPLE);
  assert.deepEqual(readBackErrors({ expected: request, record: minted, usages, datasets: SAMPLE.datasets, createdBy: "dinobytes215", hash: HASH, expectedDownloadDoi }),
    { hard: [], warnings: [] });
  assert.match(readBackErrors({ expected: request, record: { ...minted, originalDownloadDOI: undefined }, usages,
    datasets: SAMPLE.datasets, createdBy: "dinobytes215", hash: HASH, expectedDownloadDoi }).hard.join(), /originalDownloadDOI/);
});

test("RT6 countries' committed registration.json is reproduced byte for byte; learn-sample's carries the download", () => {
  const bytes = readFileSync(countries.registrationFile, "utf8");
  const reg = JSON.parse(bytes) as Registration;
  const back: DerivedDatasetRecord = {
    doi: reg.doi, title: reg.title, description: reg.description, sourceUrl: reg.sourceUrl, citation: reg.citation, createdBy: reg.createdBy,
  };
  const rows = Object.entries(reg.relatedDatasets).reverse().map(([datasetKey, numberRecords]) => ({ datasetKey, numberRecords }));
  assert.equal(formatJson(toRegistration(back, rows, reg.contributionsSha256, null), { canonical: true }), bytes);
  const l = toRegistration(record({ originalDownloadDOI: DL }), usages, HASH, DL);
  assert.equal(l.originalDownloadDOI, DL);
});

test("RT7 the learn-sample DOI is current only for the same counts from the same download", () => {
  const reg: Registration = {
    doi: "10.15468/dd.learn1", citation: "c", title: "t", description: hashLine(HASH), sourceUrl: SOURCE, createdBy: "dinobytes215",
    contributionsSha256: HASH, records: 7, relatedDatasets: { [B]: 4, [A]: 3 }, originalDownloadDOI: DL,
  };
  assert.equal(learn.currentDoi(SAMPLE, reg), "10.15468/dd.learn1");
  assert.equal(learn.currentDoi({ ...SAMPLE, originalDownloadDoi: "10.15468/dl.other1" }, reg), null);
  assert.equal(learn.currentDoi(SAMPLE, { ...reg, originalDownloadDOI: undefined }), null);
  assert.equal(learn.currentDoi({ ...SAMPLE, datasets: { [A]: 3, [B]: 5 } }, reg), null);
  assert.equal(learn.currentDoi(SAMPLE, null), null);
  const { originalDownloadDOI: _, ...countriesReg } = reg;
  assert.equal(countries.currentDoi(COUNTRIES, countriesReg), "10.15468/dd.learn1");
});
