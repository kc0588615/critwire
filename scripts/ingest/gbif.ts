// GBIF ingest (plan §3): the pinned legacy backbone checklist, the country enumeration, one v2 name match per base
// species, and per species-rank match one occurrence country/license facet query plus the datasetKey facet paged to
// the end (the derived dataset's contribution counts). Fetch and normalize only; no fs.
import { getJson } from "../http.ts";
import {
  assertNoIucnData, assertOpenLicenses, gbifTaxonKey, omitKeys,
  type GbifChecklist, type GbifDatasets, type GbifFacet, type GbifMatchResponse, type GbifOccurrenceResponse, type GbifSnapshot,
} from "../raw.ts";
import type { BaseSpecies } from "../species.ts";

const API = "https://api.gbif.org";
// The legacy GBIF Backbone Taxonomy: ids.gbif and Wikidata P846 are its keys (D2).
export const BACKBONE_KEY = "d7dddbf4-2cf0-4f39-9b2a-bb099caae36c";
const FACET_LIMIT = 300;
// Zoos/gardens (LIVING_SPECIMEN) and FOSSIL_SPECIMEN are left out by listing the allowed values (negation is a 400).
// Shared with the lab sample's download request (scripts/learn/download.ts): one definition of the countries rule.
export const BASIS_OF_RECORD = [
  "HUMAN_OBSERVATION", "OBSERVATION", "MACHINE_OBSERVATION", "PRESERVED_SPECIMEN", "MATERIAL_SAMPLE", "MATERIAL_CITATION", "OCCURRENCE",
];
// Timing diagnostics, IUCN status, and nested-set indexes that move on every backbone rebuild.
const MATCH_DROP = new Set(["timeTaken", "timings", "additionalStatus", "left", "right"]);

export const gbifMatchUrl = (name: string) =>
  `${API}/v2/species/match?checklistKey=${BACKBONE_KEY}&scientificName=${encodeURIComponent(name)}`;

// The record filters of the countries rule, shared by every occurrence query so the counts agree.
const OCCURRENCE_FILTERS = [
  "occurrenceStatus=PRESENT", "hasGeospatialIssue=false", "hasCoordinate=true", "license=CC0_1_0", "license=CC_BY_4_0",
  ...BASIS_OF_RECORD.map((b) => `basisOfRecord=${b}`),
];
const UUID = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;

// An occurrence search's query, parameters in a fixed order, so the stored URL (sources[].url) is stable. Also the lab
// sample's search count at submission (ingest gbif-sample --new), over all its taxa.
export const occurrenceSearchQuery = (taxonKeys: readonly number[], facets: string[] = []) =>
  [`checklistKey=${BACKBONE_KEY}`, ...taxonKeys.map((k) => `taxonKey=${k}`), ...facets, "limit=0", ...OCCURRENCE_FILTERS].join("&");
const occurrenceSearchUrl = (taxonKey: number, facets: string[]) => `${API}/v1/occurrence/search?${occurrenceSearchQuery([taxonKey], facets)}`;

export const gbifOccurrenceUrl = (taxonKey: number) =>
  occurrenceSearchUrl(taxonKey, ["facet=country", "facet=license", `facetLimit=${FACET_LIMIT}`]);

export const gbifDatasetsUrl = (taxonKey: number, offset: number) =>
  occurrenceSearchUrl(taxonKey, ["facet=datasetKey", `facetLimit=${FACET_LIMIT}`, `facetOffset=${offset}`]);

const isString = (v: unknown): v is string => typeof v === "string" && v.length > 0;

// The checklist record is allowlisted to the fields derive cites.
function toChecklist(r: Record<string, unknown>): GbifChecklist {
  const checklist = { key: r.key, title: r.title, doi: r.doi, license: r.license, pubDate: r.pubDate };
  for (const [k, v] of Object.entries(checklist)) if (!isString(v)) throw new Error(`gbif: checklist ${k} missing (${JSON.stringify(v)})`);
  if (checklist.key !== BACKBONE_KEY) throw new Error(`gbif: checklist key ${String(checklist.key)} is not ${BACKBONE_KEY}`);
  return checklist as GbifChecklist;
}

function toCountries(rows: unknown): GbifSnapshot["countries"] {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error("gbif: country enumeration is not a non-empty array");
  const countries: GbifSnapshot["countries"] = {};
  for (const { iso2, gbifRegion, title } of rows as Record<string, unknown>[]) {
    if (!isString(iso2) || !/^[A-Z]{2}$/.test(iso2) || !isString(gbifRegion) || !isString(title)) {
      throw new Error(`gbif: bad country row ${JSON.stringify({ iso2, gbifRegion, title })}`);
    }
    if (Object.hasOwn(countries, iso2)) throw new Error(`gbif: duplicate country ${iso2}`);
    countries[iso2] = { gbifRegion, title };
  }
  return countries;
}

function toMatch(url: string, r: unknown): GbifMatchResponse {
  const match = omitKeys(r, MATCH_DROP) as GbifMatchResponse;
  if (!isString(match?.diagnostics?.matchType)) throw new Error(`gbif: ${url}: no diagnostics.matchType in ${JSON.stringify(r).slice(0, 300)}`);
  return match;
}

// Facets sorted by field and counts by name (ties in count order aren't stable); a saturated facet throws.
function toOccurrences(url: string, r: unknown): GbifOccurrenceResponse {
  const o = r as GbifOccurrenceResponse & { results?: unknown[] };
  if (!Number.isInteger(o?.count) || !Array.isArray(o.facets)) throw new Error(`gbif: ${url}: no count/facets in ${JSON.stringify(r).slice(0, 300)}`);
  if (o.results?.length) throw new Error(`gbif: ${url}: limit=0 returned ${o.results.length} results`);
  const facets = o.facets
    .map((f) => {
      if (f.counts.length >= FACET_LIMIT) throw new Error(`gbif: ${url}: facet ${f.field} saturated (${f.counts.length} ≥ ${FACET_LIMIT})`);
      return { ...f, counts: [...f.counts].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0)) };
    })
    .sort((a, b) => (a.field < b.field ? -1 : a.field > b.field ? 1 : 0));
  const occurrences = { ...o, facets };
  assertOpenLicenses(occurrences);
  return occurrences;
}

// One datasetKey facet page: same `count` as the countries query, UUID keys not seen on earlier pages, positive counts.
function toDatasetPage(url: string, r: unknown, count: number, seen: Record<string, number>): GbifFacet["counts"] {
  const o = r as GbifOccurrenceResponse & { results?: unknown[] };
  if (o?.count !== count) throw new Error(`gbif: ${url}: count ${String(o?.count)} ≠ countries query count ${count} (index moved; re-run)`);
  if (o.results?.length) throw new Error(`gbif: ${url}: limit=0 returned ${o.results.length} results`);
  if (!Array.isArray(o.facets) || o.facets.some((f) => f.field !== "DATASET_KEY")) throw new Error(`gbif: ${url}: unexpected facets in ${JSON.stringify(r).slice(0, 300)}`);
  const counts = o.facets[0]?.counts ?? [];
  for (const { name, count: n } of counts) {
    if (typeof name !== "string" || !UUID.test(name)) throw new Error(`gbif: ${url}: bad datasetKey ${JSON.stringify(name)}`);
    if (Object.hasOwn(seen, name)) throw new Error(`gbif: ${url}: datasetKey ${name} repeated across pages`);
    if (!Number.isSafeInteger(n) || n < 1) throw new Error(`gbif: ${url}: datasetKey ${name} count ${JSON.stringify(n)}`);
  }
  return counts;
}

// Pages the datasetKey facet until an empty page (never trusting a short page or the facet limit); counts must sum to `count`.
async function fetchDatasets(taxonKey: number, count: number): Promise<GbifDatasets> {
  const counts: Record<string, number> = {};
  for (let offset = 0; ; offset += FACET_LIMIT) {
    const url = gbifDatasetsUrl(taxonKey, offset);
    const page = toDatasetPage(url, await getJson(url), count, counts);
    if (page.length === 0) break;
    for (const { name, count: n } of page) counts[name] = n;
  }
  const sum = Object.values(counts).reduce((a, n) => a + n, 0);
  if (sum !== count) throw new Error(`gbif: taxon ${taxonKey}: datasetKey counts sum to ${sum}, count is ${count}`);
  return { url: gbifDatasetsUrl(taxonKey, 0), counts };
}

export async function fetchGbif(base: BaseSpecies[]): Promise<Omit<GbifSnapshot, "retrieved">> {
  const checklist = toChecklist((await getJson(`${API}/v1/dataset/${BACKBONE_KEY}`)) as Record<string, unknown>);
  const countries = toCountries(await getJson(`${API}/v1/enumeration/country`));
  const species: GbifSnapshot["species"] = {};
  for (const { scientificName } of base) {
    const matchUrl = gbifMatchUrl(scientificName);
    const match = toMatch(matchUrl, await getJson(matchUrl));
    let occurrences = null;
    let datasets = null;
    if (match.usage?.rank === "SPECIES") {
      const taxonKey = gbifTaxonKey(match);
      const url = gbifOccurrenceUrl(taxonKey);
      occurrences = { url, response: toOccurrences(url, await getJson(url)) };
      datasets = await fetchDatasets(taxonKey, occurrences.response.count);
    }
    species[scientificName] = { match: { url: matchUrl, response: match }, occurrences, datasets };
  }
  const snapshot = { checklist, countries, species };
  assertNoIucnData(snapshot);
  return snapshot;
}
