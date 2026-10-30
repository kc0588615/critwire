// ST4 (plan D9.7, 004 §4.5; ported from the spike's test/star-export.test.ts): the lab files' credits. Written before
// the code, seen failing first. Failure modes: a /learn/data/ file is published with no sources or an unknown one; a
// source's license has no deed URL, so the manifest can't link it; a CC BY source has no citation to give; the sample is
// credited while a dataset in it has no title or publisher (or there are none); the GBIF download's license isn't one we
// know; the sample's derived-dataset DOI is lost from its credit; a LAB_FILES entry names a source labSources lacks.
// ST7 (L5 plan S10): c1's feed credits critwire and the sample (FEED.sources) through the same credits(), so ST4's checks
// apply; its datasets carry their DOI from the sample, which feedAttributionErrors matches the feed's credit rows on.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { Registration } from "../../gbif/derived-dataset.ts";
import { readLearnInputs } from "../../derive/sample.ts";
import { CRITWIRE_CREDIT } from "../sources.ts";
import { FEED } from "../../learn/feed.ts";
import { credits, feedAttribution, labCreditContext, LAB_FILES, labSources, type CreditContext } from "./credits.ts";
import { derived } from "./dist-fixture.ts";

const ctx = (edit: Partial<CreditContext> = {}): CreditContext => ({
  sources: {
    ne: { name: "Natural Earth", license: "Public domain", citation: "Made with Natural Earth.", url: "https://www.naturalearthdata.com/" },
    gbif: { name: "GBIF occurrence download", license: "CC BY 4.0", citation: "GBIF.org (23 October 2026) GBIF Occurrence Download https://doi.org/10.15468/dl.x", url: "https://doi.org/10.15468/dl.x", doi: "10.15468/dl.x", datasets: "datasets.csv" },
  },
  files: { "a.parquet": ["ne"], "b.csv": ["gbif"], "none.csv": [] },
  datasets: [{ dataset_key: "k1", title: "T", publisher: "P", doi: null }],
  ...edit,
});

test("ST4 credits() gives each source with its license URL, in a fixed key order", () => {
  assert.deepEqual(credits("a.parquet", ctx()), [{ name: "Natural Earth", license: "Public domain", licenseUrl: null, citation: "Made with Natural Earth.", url: "https://www.naturalearthdata.com/" }]);
  const [gbif] = credits("b.csv", ctx());
  assert.equal(gbif!.licenseUrl, "https://creativecommons.org/licenses/by/4.0/");
  assert.deepEqual(Object.keys(gbif!), ["name", "license", "licenseUrl", "citation", "url", "doi", "datasets"]);
});

test("ST4 credits() refuses no sources, an unknown source, an unknown license, CC BY without a citation", () => {
  assert.throws(() => credits("c.csv", ctx()), /c\.csv: no sources/);
  assert.throws(() => credits("none.csv", ctx()), /none\.csv: no sources/);
  assert.throws(() => credits("a.parquet", ctx({ files: { "a.parquet": ["nope"] } })), /a\.parquet: unknown source nope/);
  assert.throws(() => credits("a.parquet", ctx({ sources: { ne: { name: "NE", license: "CC BY 9.0", citation: "x", url: "u" } } })), /unknown license "CC BY 9\.0"/);
  assert.throws(() => credits("b.csv", ctx({ sources: { gbif: { name: "GBIF", license: "CC BY 4.0", citation: " ", url: "u" } } })), /b\.csv: GBIF is CC BY 4\.0 with no citation/);
});

test("ST4 credits() refuses crediting the sample while a dataset has no title or publisher, or there are none", () => {
  assert.throws(() => credits("b.csv", ctx({ datasets: [{ dataset_key: "k2", title: "", publisher: "P", doi: null }] })), /b\.csv: dataset k2 has no title/);
  assert.throws(() => credits("b.csv", ctx({ datasets: [{ dataset_key: "k3", title: "T", publisher: " ", doi: null }] })), /b\.csv: dataset k3 has no publisher/);
  assert.throws(() => credits("b.csv", ctx({ datasets: [] })), /b\.csv: no datasets to credit/);
  // A file whose sources don't credit datasets doesn't need them.
  assert.equal(credits("a.parquet", ctx({ datasets: [] })).length, 1);
});

const learn = await readLearnInputs();
const habitat = { name: "Jung et al. 2020, habitat map v004", license: "CC BY 4.0", citation: "Jung (2020).", doi: "10.5281/zenodo.4058819", url: "https://doi.org/10.5281/zenodo.4058819" };
const registration = { doi: "10.15468/dd.5sthtk", citation: "Derived dataset GBIF.org (28 October 2026) Filtered export of GBIF occurrence data https://doi.org/10.15468/dd.5sthtk" } as Registration;

test("ST4 labSources: the download's citation and DOI, its derived-dataset DOI when registered, habitat named as habitat.json says (no stand-in mark)", () => {
  const s = labSources({ download: learn.download, registration, habitat });
  assert.equal(s["gbif-sample"]!.citation, "GBIF.org (23 October 2026) GBIF Occurrence Download https://doi.org/10.15468/dl.fbpk9w");
  assert.equal(s["gbif-sample"]!.doi, "10.15468/dl.fbpk9w");
  assert.equal(s["gbif-sample"]!.license, "CC BY 4.0");
  assert.deepEqual(s["gbif-sample"]!.derivedDataset, { doi: registration.doi, citation: registration.citation, url: `https://doi.org/${registration.doi}` });
  assert.equal(labSources({ download: learn.download, registration: null, habitat })["gbif-sample"]!.derivedDataset, undefined);
  assert.equal(s["jung-habitat"]!.name, habitat.name);
  assert.throws(() => labSources({ download: { ...learn.download, license: "http://creativecommons.org/licenses/by-nc/4.0/legalcode" }, registration, habitat }),
    /GBIF download license .*by-nc.* isn't one critwire publishes/);
});

test("ST4 every LAB_FILES entry credits from the real context without error", async () => {
  const real = await labCreditContext({ download: learn.download, registration, datasets: [{ dataset_key: "k", title: "T", publisher: "P", doi: null }] });
  for (const file of Object.keys(LAB_FILES)) assert.ok(credits(file, real).length > 0, file);
  assert.equal(credits("postgis/learn_curriculum.sql", real).length, 5);
  // L3's habitat files (plan §2 Credits): the map, plus what each was cut by or joined to.
  const names = (file: string) => credits(file, real).map((c) => c.name);
  const jung = habitat.name;
  assert.deepEqual(names("country_habitats.parquet"), [jung, "Natural Earth"]);
  assert.deepEqual(names("occurrence_habitats.parquet"), [jung, "GBIF occurrence download"]);
  for (const f of ["habitat_clips.parquet", "clips/cr.tif", "clips/tas.tif"]) assert.deepEqual(names(f), [jung], f);
});

test("ST6 the star's habitat files credit what they are built from, as their lab files do", async () => {
  const real = await labCreditContext({ download: learn.download, registration, datasets: [{ dataset_key: "k", title: "T", publisher: "P", doi: null }] });
  const names = (file: string) => credits(file, real).map((c) => c.name);
  assert.deepEqual(names("star/dim_habitat_class.csv"), names("habitat_classes.parquet"));
  assert.deepEqual(names("star/dim_habitat_class.csv"), [habitat.name]);
  assert.deepEqual(names("star/fact_country_habitat.csv"), names("country_habitats.parquet"));
  assert.deepEqual(names("star/fact_country_habitat.csv"), [habitat.name, "Natural Earth"]);
});

test("ST7 the feed's expected attribution: critwire's credit and the sample's citation via credits(), the sample's datasets with their DOI", async () => {
  const real = await labCreditContext({ download: learn.download, registration, datasets: derived.learn.datasets });
  const a = feedAttribution(real);
  assert.deepEqual(a.critwire, credits(FEED.input, { ...real, files: { [FEED.input]: ["critwire"] } })[0]);
  assert.deepEqual([a.critwire.license, a.critwire.licenseUrl, a.critwire.citation], ["CC BY 4.0", "https://creativecommons.org/licenses/by/4.0/", CRITWIRE_CREDIT]);
  assert.equal(a.sample.citation, "GBIF.org (23 October 2026) GBIF Occurrence Download https://doi.org/10.15468/dl.fbpk9w");
  assert.equal(a.datasets, derived.learn.datasets);
  assert.ok(a.datasets.some((d) => d.doi !== null) && a.datasets.every((d) => "doi" in d), "every dataset has its doi key, some set");
  // ST4's checks apply to the feed's sources too.
  assert.throws(() => feedAttribution({ ...real, datasets: [] }), /labs\/c1-feed\.json: no datasets to credit/);
});
