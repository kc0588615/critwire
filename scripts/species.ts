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

export interface Species {
  id: number;
  slug: string;
  scientificName: string;
  commonName: string;
  taxonomy: Taxonomy;
  ids: {
    iucn: number | null;
    gbif: number | null;
    col: string | null;
    wikidata: string | null;
    inaturalist: number | null;
    ncbi: number | null;
  };
  photo: Photo | null;
  replacedBy: number[] | null;
}

export const baseFile = new URL("../data/base.json", import.meta.url);
export const speciesFile = new URL("../data/species.json", import.meta.url);

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
