// Published record (plan §4): one data/species.json entry from a base species and the rule results, with sources[].
// Pure: no fs, network or clock. Keys are built in a fixed order; every published ids.*, the taxonomy and non-null
// countries are cited by exactly one source (range.status is critwire's own and uncited), which buildRecord asserts before returning.
import { colLicense } from "./col.ts";
import { gbifBackboneLicense } from "./gbif.ts";
import type { ColRelease, GbifChecklist } from "../raw.ts";
import type { BaseSpecies, RangeStatus, Source, Species, Taxonomy } from "../species.ts";

export interface RecordInput {
  base: BaseSpecies;
  wikidata: { retrieved: string; ids: { wikidata: string | null; inaturalist: number | null; ncbi: number | null } };
  col: { retrieved: string; release: ColRelease; url: string; id: string | null; taxonomy: Taxonomy; taxonomySource: "col" | "base" };
  gbif: { retrieved: string; checklist: GbifChecklist; url: string; id: number | null; occurrencesUrl: string | null; countries: string[] | null; rangeStatus: RangeStatus;
    // The current GBIF derived-dataset DOI (gbif/derived-dataset.ts currentDoi), cited on the countries entry only.
    doi: string | null };
}

// Citable fields, in the fixed order sources[].fields uses.
const FIELDS = ["ids.iucn", "ids.gbif", "ids.col", "ids.wikidata", "ids.inaturalist", "ids.ncbi", "taxonomy", "range.countriesWithOpenRecords"] as const;
type Field = (typeof FIELDS)[number];

const WIKIDATA_LICENSE = "CC0 1.0";
// Counts come only from CC0 1.0 and CC BY 4.0 records (D7), so the country list is published as CC BY 4.0.
const OCCURRENCE_LICENSE = "CC BY 4.0";
// critwire's own registry data (ids.iucn, step-1 taxonomy), under DATA-LICENSE.md.
const BASE_SOURCE = { source: "critwire base", license: "CC BY 4.0", url: "https://github.com/kc0588615/critwire/blob/main/data/base.json" };

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function value(r: Species, f: Field): unknown {
  if (f === "taxonomy") return r.taxonomy;
  if (f === "range.countriesWithOpenRecords") return r.range.countriesWithOpenRecords;
  return r.ids[f.slice("ids.".length) as keyof Species["ids"]];
}

export function buildRecord({ base, wikidata, col, gbif }: RecordInput): Species {
  const N = base.scientificName;
  if (gbif.countries !== null && gbif.occurrencesUrl === null) throw new Error(`record: countries for ${N} without an occurrence query URL`);
  if (gbif.countries?.length === 0) throw new Error(`record: empty countries for ${N}; publish null with a status instead`);
  if ((gbif.countries !== null) !== (gbif.rangeStatus === "ok")) throw new Error(`record: countries ${JSON.stringify(gbif.countries)} with status ${gbif.rangeStatus} for ${N}`);
  const ids: Species["ids"] = {
    iucn: base.ids.iucn, gbif: gbif.id, col: col.id,
    wikidata: wikidata.ids.wikidata, inaturalist: wikidata.ids.inaturalist, ncbi: wikidata.ids.ncbi,
  };

  const record: Species = {
    id: base.id, slug: base.slug, scientificName: N, commonName: base.commonName,
    taxonomy: { ...col.taxonomy }, ids, range: { countriesWithOpenRecords: gbif.countries === null ? null : [...gbif.countries], status: gbif.rangeStatus },
    photo: base.photo, sources: [], replacedBy: base.replacedBy,
  };

  // Each source cites the non-null fields it filled; sources that filled nothing are dropped.
  const filled = (fields: Field[]) => fields.filter((f) => value(record, f) !== null);
  const taxonomyIf = (source: RecordInput["col"]["taxonomySource"]): Field[] => (col.taxonomySource === source ? ["taxonomy"] : []);
  const { key, alias, version, issued } = col.release;
  const candidates: Source[] = [
    { source: "Catalogue of Life", fields: filled(["ids.col", ...taxonomyIf("col")]), license: colLicense(col.release.license),
      retrieved: col.retrieved, url: col.url, doi: col.release.doi, release: { key, alias, version, issued } },
    { source: "GBIF Backbone Taxonomy", fields: filled(["ids.gbif"]), license: gbifBackboneLicense(gbif.checklist.license),
      retrieved: gbif.retrieved, url: gbif.url, doi: gbif.checklist.doi, checklistKey: gbif.checklist.key },
    { source: "GBIF.org occurrence search", fields: filled(["range.countriesWithOpenRecords"]), license: OCCURRENCE_LICENSE,
      retrieved: gbif.retrieved, url: gbif.occurrencesUrl ?? "", ...(gbif.doi === null ? {} : { doi: gbif.doi }) },
    { source: "Wikidata", fields: filled(["ids.wikidata", "ids.inaturalist", "ids.ncbi"]), license: WIKIDATA_LICENSE,
      retrieved: wikidata.retrieved, url: `https://www.wikidata.org/wiki/Special:EntityData/${ids.wikidata}.json` },
    { source: BASE_SOURCE.source, fields: ["ids.iucn", ...taxonomyIf("base")], license: BASE_SOURCE.license, url: BASE_SOURCE.url },
  ];
  record.sources = candidates.filter((s) => s.fields.length > 0).sort((a, b) => byText(a.source, b.source));
  assertCitations(record);
  return record;
}

// Throws unless every published citable field is in exactly one source's fields, no source cites a null or unknown
// field, no source cites nothing, and each source's fields are in the fixed order.
export function assertCitations(r: Species): void {
  const at = `record ${r.id} (${r.scientificName})`;
  const count = new Map<string, number>();
  for (const s of r.sources) {
    if (s.fields.length === 0) throw new Error(`${at}: source ${s.source} cites nothing`);
    for (const f of s.fields) {
      if (!(FIELDS as readonly string[]).includes(f)) throw new Error(`${at}: source ${s.source} cites unknown field ${f}`);
      if (value(r, f as Field) === null) throw new Error(`${at}: source ${s.source} cites ${f}, which is null`);
      count.set(f, (count.get(f) ?? 0) + 1);
    }
    const order = s.fields.map((f) => FIELDS.indexOf(f as Field));
    if (order.some((i, k) => k > 0 && i <= order[k - 1])) throw new Error(`${at}: source ${s.source} fields out of order: ${s.fields.join(", ")}`);
  }
  for (const f of FIELDS) {
    const n = count.get(f) ?? 0;
    if (value(r, f) !== null && n !== 1) throw new Error(`${at}: ${f} is cited ${n} times, not once`);
  }
}
