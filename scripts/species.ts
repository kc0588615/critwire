// Species records. data/base.json (BaseSpecies, written by seed-cc) is the input; data/species.json (Species) the published output.
export interface Photo { url: string; credit: string; license: string; page: string }

export interface Taxonomy { class: string; order: string; family: string; genus: string }

export interface BaseSpecies {
  id: number;
  slug: string;
  scientificName: string;
  commonName: string;
  taxonomy: Taxonomy;
  ids: { iucn: number };
  photo: Photo | null;
  replacedBy: number[] | null;
}

// One citation in a record's sources[] (plan §4): the published fields one source filled. A type, not an interface,
// so it is assignable to postgres.js's JSONValue in load.ts.
export type Source = {
  source: string;
  fields: string[];
  license: string;
  retrieved?: string;
  url: string;
  doi?: string;
  release?: { key: number; alias: string; version: string; issued: string };
  checklistKey?: string;
};

// Built by scripts/derive/record.ts in this key order.
export interface Species {
  id: number;
  slug: string;
  scientificName: string;
  commonName: string;
  taxonomy: Taxonomy;
  ids: {
    iucn: number;
    gbif: number | null;
    col: string | null;
    wikidata: string | null;
    inaturalist: number | null;
    ncbi: number | null;
  };
  // ISO alpha-2 codes of countries with records (never native range); null when the GBIF taxon isn't settled.
  range: { countriesWithRecords: string[] | null };
  photo: Photo | null;
  sources: Source[];
  replacedBy: number[] | null;
}

// One review entry in data/review/mismatches.json (plan §5.6). Built with the keys in this order.
export type Severity = "blocking" | "review" | "info";
export type MismatchKind =
  | "not-found" | "multi-value" | "identity" | "iucn-id" | "synonym-info" | "status-info" | "taxonomy-info"
  | "country-captive-suspect" | "country-borderline" | "no-records";
export interface Mismatch {
  speciesId: number;
  scientificName: string;
  field: string;
  kind: MismatchKind;
  severity: Severity;
  country?: string;
  values: Record<string, unknown>;
  reason: string;
}

// One element of data/review/country-overrides.json (owner-owned, plan §5.5).
export interface CountryOverride { speciesId: number; country: string; action: "keep" | "remove"; reason: string }

export const baseFile = new URL("../data/base.json", import.meta.url);
export const speciesFile = new URL("../data/species.json", import.meta.url);
export const mismatchesFile = new URL("../data/review/mismatches.json", import.meta.url);
export const overridesFile = new URL("../data/review/country-overrides.json", import.meta.url);

// Throws unless ids, slugs, scientific names and IUCN ids are unique and ids and IUCN ids are positive integers.
// Step 2 keys all raw data by scientificName, so a duplicate name would silently merge two species.
export function validateBase(base: BaseSpecies[]): void {
  const seen = { id: new Set<unknown>(), slug: new Set<unknown>(), scientificName: new Set<unknown>(), iucn: new Set<unknown>() };
  for (const s of base) {
    const name = s.scientificName;
    if (!Number.isInteger(s.id) || s.id < 1) throw new Error(`base: bad id ${s.id} (${name})`);
    if (!Number.isInteger(s.ids?.iucn) || s.ids.iucn < 1) throw new Error(`base: bad ids.iucn ${s.ids?.iucn} (${name})`);
    const keys = { id: s.id, slug: s.slug, scientificName: name, iucn: s.ids.iucn };
    for (const [field, value] of Object.entries(keys) as [keyof typeof seen, unknown][]) {
      if (seen[field].has(value)) throw new Error(`base: duplicate ${field} ${value} (${name})`);
      seen[field].add(value);
    }
  }
}
