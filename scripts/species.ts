// The species record as committed in data/species.json. Shared by seed-cc and load.
export interface Photo { url: string; credit: string; license: string; page: string }

export interface Species {
  id: number;
  slug: string;
  scientificName: string;
  commonName: string;
  taxonomy: { class: string; order: string; family: string; genus: string };
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

export const speciesFile = new URL("../data/species.json", import.meta.url);
