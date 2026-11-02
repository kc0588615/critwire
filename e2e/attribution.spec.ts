// /v1/attribution.json (plan §9 attribution): every source and photo credited, the GBIF derived dataset matching
// data/gbif-derived-dataset/, and the range listings' sources matching data/range-listings.json. The expected values are computed here from data/, not with the build's code.
import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { Species } from "../scripts/species.ts";
import { records, repoPath } from "./helpers.ts";

const REGISTRATION = repoPath("data/gbif-derived-dataset/registration.json");
const CONTRIBUTIONS = repoPath("data/gbif-derived-dataset/contributions.json");
const COUNTRIES_SOURCE = "GBIF.org occurrence search";
const NATURAL_EARTH = "Natural Earth";
const GBIF_CHECKLISTS = "GBIF checklists";
const MDD = "Mammal Diversity Database";
const CURATED = "critwire curated";
const FILE_SOURCES = [NATURAL_EARTH, GBIF_CHECKLISTS, MDD, CURATED];

interface Attribution {
  critwire: { license: string; licenseUrl: string; credit: string; terms: string; code: { license: string; url: string } };
  sources: { source: string; url: string; fields: string[]; records: number; license: string; licenseUrl: string | null; citation: string;
    doi?: string; retrieved?: string; release?: object; notes?: string; sourceKey?: string }[];
  gbifDerivedDataset: { doi: string; url: string; citation: string; sourceUrl: string; records: number; datasets: { datasetKey: string; records: number }[] } | null;
  gbifChecklists: { key: string; title: string; license: string; licenseUrl: string; doi: string; url: string; citation: string; rows: number }[];
  photos: { speciesId: number; slug: string; credit: string; license: string; licenseUrl: string | null; page: string; citation: string }[];
}

let species: Species[];
let attribution: Attribution;
test.beforeAll(async ({ request }) => {
  species = await records();
  const res = await request.get("/v1/attribution.json");
  expect(res.status()).toBe(200);
  attribution = await res.json();
});

test("every source in sources[] is credited once, with its license, citation and record count", () => {
  const names = [...new Set([...species.flatMap((s) => s.sources.map((x) => x.source)), ...FILE_SOURCES])].sort();
  expect(attribution.sources.map((s) => s.source)).toEqual(names);
  for (const s of attribution.sources.filter((x) => !FILE_SOURCES.includes(x.source))) {
    const citing = species.filter((r) => r.sources.some((x) => x.source === s.source));
    expect(s.records, s.source).toBe(citing.length);
    expect(new Set(s.fields), s.source).toEqual(new Set(citing.flatMap((r) => r.sources.find((x) => x.source === s.source)!.fields)));
    expect(s.license, s.source).toBe(citing[0].sources.find((x) => x.source === s.source)!.license);
    expect(s.citation.length, s.source).toBeGreaterThan(0);
    expect(s.url, s.source).toMatch(/^https:\/\//);
    if (s.licenseUrl !== null) expect(s.licenseUrl, s.source).toMatch(/^https:\/\/creativecommons\.org\//);
  }
  expect(attribution.critwire.license).toBe("CC BY 4.0");
  expect(attribution.critwire.credit).toContain("critwire");
});

test("Natural Earth is credited once for data/countries.json, its release an object of COL's release keys", async () => {
  const { source, rows } = JSON.parse(await readFile(repoPath("data/countries.json"), "utf8"));
  const entry = attribution.sources.find((s) => s.source === NATURAL_EARTH)!;
  expect(entry).toEqual({
    source: NATURAL_EARTH, url: "https://www.naturalearthdata.com/",
    fields: ["countries.name", "countries.continent", "countries.region", "countries.subregion"],
    records: rows.length, license: "Public domain", licenseUrl: null, retrieved: source.retrieved, release: source.release,
    citation: "Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com.", notes: entry.notes,
  });
  expect(entry.notes).toContain("countries");
  const col = attribution.sources.find((s) => s.source === "Catalogue of Life")?.release;
  if (col) for (const key of Object.keys(source.release)) expect(Object.keys(col), key).toContain(key);
});

test("the range listings' sources: rows, license, citation, ties stated; every used checklist with its own license and DOI", async () => {
  const { sources, rows } = JSON.parse(await readFile(repoPath("data/range-listings.json"), "utf8")) as {
    sources: {
      gbifChecklists: { retrieved: string; datasets: { key: string; title: string; license: string; doi: string; citation: string; rows: number }[] };
      mdd: { retrieved: string; release: { version: string; issued: string; doi: string }; license: string };
    };
    rows: { sourceKey: string; license: string }[];
  };
  const entry = (name: string) => attribution.sources.find((s) => s.source === name)!;
  const count = (test: (key: string) => boolean) => rows.filter((r) => test(r.sourceKey)).length;
  const checklistKeys = new Set(sources.gbifChecklists.datasets.map((d) => d.key));
  const CC_BY = "https://creativecommons.org/licenses/by/4.0/";
  const FIELDS = ["country", "area", "origin", "presence", "sourceTerm"].map((c) => `range-listings.${c}`);

  expect(entry(GBIF_CHECKLISTS)).toMatchObject({
    fields: FIELDS, records: count((k) => checklistKeys.has(k)), license: "CC0 1.0 or CC BY 4.0, per dataset", licenseUrl: null, retrieved: sources.gbifChecklists.retrieved,
  });
  expect(entry(GBIF_CHECKLISTS).notes).toContain("Invasive Species Specialist Group, a group of IUCN's Species Survival Commission");
  expect(entry(GBIF_CHECKLISTS).notes).toContain("Checklist of the mammals of Central Asia");
  expect(entry(MDD)).toMatchObject({
    sourceKey: "mdd", fields: FIELDS, records: count((k) => k === "mdd"), license: sources.mdd.license, licenseUrl: CC_BY, retrieved: sources.mdd.retrieved, doi: sources.mdd.release.doi,
    release: { version: sources.mdd.release.version, issued: sources.mdd.release.issued },
    citation: "Mammal Diversity Database. (2026). Mammal Diversity Database (Version 2.5) [Data set]. Zenodo. https://doi.org/10.5281/zenodo.21654811",
  });
  expect(entry(MDD).notes).toContain('"initially sourced from the IUCN, HMW, and CMW"');
  expect(entry(CURATED)).toMatchObject({ sourceKey: "curated", fields: FIELDS, records: count((k) => k === "curated"), license: "CC BY 4.0", licenseUrl: CC_BY });
  expect(entry(CURATED).citation).toContain("critwire");

  expect(attribution.gbifChecklists).toEqual(sources.gbifChecklists.datasets.map(({ key, title, license, doi, citation, rows: n }) => ({
    key, title, license, doi, citation, rows: n, url: `https://www.gbif.org/dataset/${key}`,
    licenseUrl: license === "CC0 1.0" ? "https://creativecommons.org/publicdomain/zero/1.0/" : CC_BY,
  })));
  for (const d of attribution.gbifChecklists) {
    expect(d.rows, d.key).toBe(count((k) => k === d.key));
    expect(d.rows, d.key).toBeGreaterThan(0);
    expect(["CC0 1.0", "CC BY 4.0"], d.key).toContain(d.license);
  }
});

test("photos credit every record that has a photo", () => {
  const want = species.filter((s) => s.photo).map((s) => ({ speciesId: s.id, slug: s.slug, credit: s.photo!.credit, license: s.photo!.license, page: s.photo!.page }));
  expect(attribution.photos.map(({ speciesId, slug, credit, license, page }) => ({ speciesId, slug, credit, license, page }))).toEqual(want);
  for (const p of attribution.photos) {
    expect(p.citation, p.slug).toBe(`${p.credit}, ${p.license}, via Wikimedia Commons, ${p.page}`);
    expect(p.licenseUrl === null ? p.license : p.licenseUrl, p.slug).toMatch(/^(Public domain|https:\/\/creativecommons\.org\/.+\/)$/);
  }
});

test("the GBIF derived dataset: its DOI everywhere the countries are cited, its datasets the contributions", async ({ request }) => {
  test.skip(!existsSync(REGISTRATION), "no GBIF registration yet (H1)");
  const registration = JSON.parse(await readFile(REGISTRATION, "utf8"));
  const contributions = JSON.parse(await readFile(CONTRIBUTIONS, "utf8"));
  const dd = attribution.gbifDerivedDataset!;
  expect(dd.doi).toBe(registration.doi);
  expect(dd.url).toBe(`https://doi.org/${registration.doi}`);
  expect(dd.citation).toContain(registration.doi);
  expect(attribution.sources.find((s) => s.source === COUNTRIES_SOURCE)).toMatchObject({ doi: registration.doi, citation: registration.citation });

  const keys = Object.keys(contributions.datasets).sort();
  expect(dd.datasets).toEqual(keys.map((datasetKey) => ({ datasetKey, records: contributions.datasets[datasetKey] })));
  expect(dd.records).toBe(contributions.records);
  expect(dd.datasets.reduce((n, d) => n + d.records, 0)).toBe(dd.records);

  const served: Species[] = await (await request.get("/v1/species.json")).json();
  const entries = served.flatMap((s) => s.sources.filter((x) => x.source === COUNTRIES_SOURCE));
  expect(entries.length).toBe(served.filter((s) => s.range.countriesWithOpenRecords !== null).length);
  for (const e of entries) expect(e.doi).toBe(registration.doi);
  console.log(`DOI ${dd.doi}: ${dd.datasets.length} datasets, ${dd.records} records, ${entries.length} countries entries`);
});
