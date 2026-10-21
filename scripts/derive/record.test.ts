// Record and sources tests (plan §4, §7). Failure modes first:
// S1: a published ids.*, taxonomy or non-null countries field is cited by no source, or by two; a null field is cited;
//     a source cites nothing or an unknown field; the step-1 taxonomy kept as fallback is cited to COL instead of
//     critwire base; a source that filled nothing gets an entry; countries are published without the occurrence query
//     URL; the record's key order or the sources' order drifts → throws, or the wrong record is built.
// S2: [] is published, or countries and range.status disagree (a list without ok, ok without a list) → throws.
import assert from "node:assert/strict";
import { test } from "node:test";
import { assertCitations, buildRecord, type RecordInput } from "./record.ts";
import type { BaseSpecies, Species } from "../species.ts";

const BASE: BaseSpecies = {
  id: 1, slug: "blandings-turtle", scientificName: "Emydoidea blandingii", commonName: "Blanding's Turtle",
  taxonomy: { class: "Reptilia", order: "Testudines", family: "Emydidae", genus: "Emydoidea" },
  ids: { iucn: 7709 },
  photo: { url: "https://example.org/p.jpg", credit: "Andrew C", license: "CC BY 2.0", page: "https://example.org/p" },
  replacedBy: null,
};
const COL_TAXONOMY = { class: "Testudines", order: "Testudines", family: "Emydidae", genus: "Emydoidea" };
const OCC_URL = "https://api.gbif.org/v1/occurrence/search?checklistKey=d7dddbf4-2cf0-4f39-9b2a-bb099caae36c&taxonKey=5220530&facet=country";

function input(over: { col?: Partial<RecordInput["col"]>; gbif?: Partial<RecordInput["gbif"]>; wikidata?: Partial<RecordInput["wikidata"]["ids"]> } = {}): RecordInput {
  return {
    base: BASE,
    wikidata: { retrieved: "2026-10-20", ids: { wikidata: "Q185526", inaturalist: 39885, ncbi: null, ...over.wikidata } },
    col: {
      retrieved: "2026-10-20",
      release: { key: 316595, alias: "COL26.10", title: "Catalogue of Life", version: "2026-10-14", issued: "2026-10-14", doi: "10.48580/dgzh4", license: "cc by", url: "https://www.checklistbank.org/dataset/316595" },
      url: "https://api.checklistbank.org/dataset/316595/match/nameusage?scientificName=Emydoidea%20blandingii",
      id: "39LSJ", taxonomy: COL_TAXONOMY, taxonomySource: "col",
      ...over.col,
    },
    gbif: {
      retrieved: "2026-10-19",
      checklist: { key: "d7dddbf4-2cf0-4f39-9b2a-bb099caae36c", title: "GBIF Backbone Taxonomy", doi: "10.15468/39omei", license: "http://creativecommons.org/licenses/by/4.0/legalcode", pubDate: "2023-08-28" },
      url: "https://api.gbif.org/v2/species/match?checklistKey=d7dddbf4-2cf0-4f39-9b2a-bb099caae36c&scientificName=Emydoidea%20blandingii",
      id: 2442885, occurrencesUrl: OCC_URL, countries: ["CA", "US"], rangeStatus: "ok",
      ...over.gbif,
    },
  };
}
const cited = (r: Species) => Object.fromEntries(r.sources.map((s) => [s.source, s.fields]));

test("S1 settled record: fixed key order, every field cited once, sources sorted", () => {
  const r = buildRecord(input());
  assert.deepEqual(Object.keys(r), ["id", "slug", "scientificName", "commonName", "taxonomy", "ids", "range", "photo", "sources", "replacedBy"]);
  assert.deepEqual(Object.keys(r.ids), ["iucn", "gbif", "col", "wikidata", "inaturalist", "ncbi"]);
  assert.deepEqual(r.ids, { iucn: 7709, gbif: 2442885, col: "39LSJ", wikidata: "Q185526", inaturalist: 39885, ncbi: null });
  assert.deepEqual(r.taxonomy, COL_TAXONOMY);
  assert.deepEqual(r.range, { countriesWithOpenRecords: ["CA", "US"], status: "ok" });
  assert.deepEqual(r.sources.map((s) => s.source), ["Catalogue of Life", "GBIF Backbone Taxonomy", "GBIF.org occurrence search", "Wikidata", "critwire base"]);
  assert.deepEqual(cited(r), {
    "Catalogue of Life": ["ids.col", "taxonomy"],
    "GBIF Backbone Taxonomy": ["ids.gbif"],
    "GBIF.org occurrence search": ["range.countriesWithOpenRecords"],
    "Wikidata": ["ids.wikidata", "ids.inaturalist"],
    "critwire base": ["ids.iucn"],
  });
  const [col, backbone, occ, wd, base] = r.sources;
  assert.deepEqual(col, {
    source: "Catalogue of Life", fields: ["ids.col", "taxonomy"], license: "CC BY 4.0", retrieved: "2026-10-20",
    url: input().col.url, doi: "10.48580/dgzh4", release: { key: 316595, alias: "COL26.10", version: "2026-10-14", issued: "2026-10-14" },
  });
  assert.deepEqual(backbone, {
    source: "GBIF Backbone Taxonomy", fields: ["ids.gbif"], license: "CC BY 4.0", retrieved: "2026-10-19",
    url: input().gbif.url, doi: "10.15468/39omei", checklistKey: "d7dddbf4-2cf0-4f39-9b2a-bb099caae36c",
  });
  assert.deepEqual(occ, { source: "GBIF.org occurrence search", fields: ["range.countriesWithOpenRecords"], license: "CC BY 4.0", retrieved: "2026-10-19", url: OCC_URL });
  assert.deepEqual(wd, { source: "Wikidata", fields: ["ids.wikidata", "ids.inaturalist"], license: "CC0 1.0", retrieved: "2026-10-20", url: "https://www.wikidata.org/wiki/Special:EntityData/Q185526.json" });
  assert.deepEqual(base, { source: "critwire base", fields: ["ids.iucn"], license: "CC BY 4.0", url: "https://github.com/kc0588615/critwire/blob/main/data/base.json" });
  assert.deepEqual(r.photo, BASE.photo);
});

test("S1 fallback taxonomy is cited to critwire base; a source that filled nothing has no entry", () => {
  const r = buildRecord(input({ col: { id: null, taxonomy: BASE.taxonomy, taxonomySource: "base" }, gbif: { id: null, occurrencesUrl: null, countries: null, rangeStatus: "identity-unsettled" }, wikidata: { wikidata: null, inaturalist: null } }));
  assert.deepEqual(r.taxonomy, BASE.taxonomy);
  assert.deepEqual(r.range, { countriesWithOpenRecords: null, status: "identity-unsettled" });
  assert.deepEqual(cited(r), { "critwire base": ["ids.iucn", "taxonomy"] });
  // ids.col filled but a rank missing: COL cites only the id.
  const partial = buildRecord(input({ col: { taxonomy: BASE.taxonomy, taxonomySource: "base" } }));
  assert.deepEqual(cited(partial)["Catalogue of Life"], ["ids.col"]);
  assert.deepEqual(cited(partial)["critwire base"], ["ids.iucn", "taxonomy"]);
});

test("S2 no-open-records publishes null, uncited; [] and a status that disagrees with the list throw", () => {
  const r = buildRecord(input({ gbif: { countries: null, rangeStatus: "no-open-records" } }));
  assert.deepEqual(r.range, { countriesWithOpenRecords: null, status: "no-open-records" });
  assert.equal(cited(r)["GBIF.org occurrence search"], undefined);
  assert.equal(cited(r)["GBIF Backbone Taxonomy"][0], "ids.gbif");
  assert.throws(() => buildRecord(input({ gbif: { countries: [], rangeStatus: "ok" } })), /empty countries/);
  assert.throws(() => buildRecord(input({ gbif: { countries: [], rangeStatus: "no-open-records" } })), /empty countries/);
  assert.throws(() => buildRecord(input({ gbif: { countries: null, rangeStatus: "ok" } })), /status ok/);
  assert.throws(() => buildRecord(input({ gbif: { rangeStatus: "no-open-records" } })), /status no-open-records/);
  assert.throws(() => buildRecord(input({ gbif: { occurrencesUrl: null } })), /occurrence/);
});

test("S1 assertCitations throws on a field cited twice, not at all, a null field cited, an unknown field, or an empty source", () => {
  const good = buildRecord(input());
  const withSources = (f: (s: Species["sources"]) => Species["sources"]): Species => ({ ...good, sources: f(structuredClone(good.sources)) });
  assert.doesNotThrow(() => assertCitations(good));
  assert.throws(() => assertCitations(withSources((s) => { s[4].fields.push("taxonomy"); return s; })), /taxonomy.*2/);
  assert.throws(() => assertCitations(withSources((s) => s.filter((x) => x.source !== "GBIF Backbone Taxonomy"))), /ids\.gbif.*0/);
  assert.throws(() => assertCitations(withSources((s) => s.filter((x) => x.source !== "critwire base"))), /ids\.iucn.*0/);
  assert.throws(() => assertCitations(withSources((s) => { s[3].fields.push("ids.ncbi"); return s; })), /ids\.ncbi.*null/);
  assert.throws(() => assertCitations(withSources((s) => { s[3].fields.push("traits"); return s; })), /unknown field traits/);
  assert.throws(() => assertCitations(withSources((s) => { s[3].fields = []; s[1].fields.push("ids.wikidata", "ids.inaturalist"); return s; })), /cites nothing/);
});
