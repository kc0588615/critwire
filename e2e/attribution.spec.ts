// /v1/attribution.json (plan §9 attribution): every source and photo credited, and the GBIF derived dataset matching
// data/gbif-derived-dataset/. The expected values are computed here from data/, not with the build's code.
import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { Species } from "../scripts/species.ts";
import { records, repoPath } from "./helpers.ts";

const REGISTRATION = repoPath("data/gbif-derived-dataset/registration.json");
const CONTRIBUTIONS = repoPath("data/gbif-derived-dataset/contributions.json");
const COUNTRIES_SOURCE = "GBIF.org occurrence search";

interface Attribution {
  critwire: { license: string; licenseUrl: string; credit: string; terms: string; code: { license: string; url: string } };
  sources: { source: string; url: string; fields: string[]; records: number; license: string; licenseUrl: string | null; citation: string; doi?: string }[];
  gbifDerivedDataset: { doi: string; url: string; citation: string; sourceUrl: string; records: number; datasets: { datasetKey: string; records: number }[] } | null;
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
  const names = [...new Set(species.flatMap((s) => s.sources.map((x) => x.source)))].sort();
  expect(attribution.sources.map((s) => s.source)).toEqual(names);
  for (const s of attribution.sources) {
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
