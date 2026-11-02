// The source registry (plan §7, A9): per source name in sources[], its homepage, the citation it asks for and notes.
// Citations are each source's own wording, verbatim; a template only where the source's own format has an access date.
import { CURATED_SOURCE, MDD_SOURCE } from "../derive/listings.ts";
import type { Registration } from "../gbif/derived-dataset.ts";
import type { Source } from "../species.ts";

// What a citation is built from: a record's source entry, or a file's (MDD's release has no COL key or alias).
export type CitedSource = Omit<Source, "release"> & { release?: { version: string; issued: string; key?: number; alias?: string } };

export interface RegisteredSource {
  url: string;
  // Fixed text, or built from the source entry. registration: the current GBIF derived dataset; null only in a --draft
  // build.
  citation: string | ((source: CitedSource, registration: Registration | null) => string);
  notes?: string;
}

// Credited for data/countries.json (/v1/countries.*), not by any record's sources[] (002 §6).
export const NATURAL_EARTH = "Natural Earth";

// Credited for data/range-listings.json (/v1/range-listings.*), not by any record's sources[]; with MDD_SOURCE and
// CURATED_SOURCE. Its datasets are attribution.json's gbifChecklists.
export const GBIF_CHECKLISTS = "GBIF checklists";

// DATA-LICENSE.md's requested credit for critwire's own data.
export const CRITWIRE_CREDIT = "critwire (https://critwire.com), CC BY 4.0";

// ChecklistBank's citation per COL release key (api.checklistbank.org/dataset/<key>, "citation"), HTML as plain text.
export const COL_CITATIONS: Record<number, string> = {
  316595: "Bánki, O., Roskov, Y., Döring, M., Ower, G., Hernández Robles, D. R., Plata Corredor, C. A., Stjernegaard Jeppesen, T., Örn, A., Pape, T., Hobern, D., Garnett, S., Little, H., DeWalt, R. E., Miller, J., Orrell, T., Aalbu, R., Abbott, J., Aedo, C., Aescht, E., et al. (2026). Catalogue of Life (Version 2026-10-14). Catalogue of Life Foundation, Amsterdam, Netherlands. https://doi.org/10.48580/dgzh4",
};

// MDD's zenodo_citation per release (zenodo.org/api/records/21654811/files/release.toml/content), verbatim.
export const MDD_CITATIONS: Record<string, string> = {
  "v2.5": "Mammal Diversity Database. (2026). Mammal Diversity Database (Version 2.5) [Data set]. Zenodo. https://doi.org/10.5281/zenodo.21654811",
};

// GBIF's citation.text per backbone DOI (api.gbif.org/v1/dataset/<checklistKey>), with the access date filled in.
const GBIF_BACKBONE_CITATIONS: Record<string, (retrieved: string) => string> = {
  "10.15468/39omei": (retrieved) => `GBIF Secretariat (2023). GBIF Backbone Taxonomy. Checklist dataset https://doi.org/10.15468/39omei accessed via GBIF.org on ${retrieved}.`,
};

function colCitation({ release, doi }: CitedSource): string {
  if (release?.key === undefined) throw new Error("Catalogue of Life source without a release");
  const citation = COL_CITATIONS[release.key];
  if (!citation) throw new Error(`add the citation for COL release ${release.key} from api.checklistbank.org/dataset/${release.key}`);
  if (!citation.includes(`https://doi.org/${doi}`) || !citation.includes(`(Version ${release.version})`)) {
    throw new Error(`COL_CITATIONS[${release.key}] lacks the release's DOI ${doi} or version ${release.version}`);
  }
  return citation;
}

function mddCitation({ release, doi }: CitedSource): string {
  const version = release?.version ?? "";
  const citation = MDD_CITATIONS[version];
  if (!citation) throw new Error(`add the citation for MDD release ${version} to MDD_CITATIONS from its release.toml`);
  if (!citation.includes(`https://doi.org/${doi}`) || !citation.includes(`(Version ${version.replace(/^v/, "")})`)) {
    throw new Error(`MDD_CITATIONS["${version}"] lacks the release's DOI ${doi} or version ${version}`);
  }
  return citation;
}

function backboneCitation({ doi, retrieved }: CitedSource): string {
  const citation = GBIF_BACKBONE_CITATIONS[doi ?? ""];
  if (!citation || !retrieved) throw new Error(`add the citation for GBIF backbone DOI ${doi} from api.gbif.org/v1/dataset/<checklistKey>`);
  return citation(retrieved);
}

function occurrenceCitation({ doi, retrieved }: CitedSource, registration: Registration | null): string {
  if (registration === null) return `GBIF.org occurrence search, accessed ${retrieved}; per-species query URLs in sources[]`;
  if (doi !== registration.doi) throw new Error(`GBIF.org occurrence search cites DOI ${doi}, not the registration's ${registration.doi}`);
  return registration.citation;
}

export const SOURCES: Record<string, RegisteredSource> = {
  "Catalogue of Life": { url: "https://www.catalogueoflife.org/", citation: colCitation },
  "GBIF Backbone Taxonomy": { url: "https://www.gbif.org/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c", citation: backboneCitation },
  "GBIF.org occurrence search": {
    url: "https://www.gbif.org/occurrence/search",
    citation: occurrenceCitation,
    notes: "Country lists are critwire-derived (CC BY 4.0), counted only from CC0 1.0 and CC BY 4.0 records; each record's query URL is in its sources[]. The contributing datasets are listed under gbifDerivedDataset.",
  },
  [NATURAL_EARTH]: {
    url: "https://www.naturalearthdata.com/",
    // The long text Natural Earth's LICENSE.md suggests (commit f1890d9f…).
    citation: "Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com.",
    notes: "Public domain: no credit required; credited as a courtesy. Used for /v1/countries.{json,csv,parquet}: its fields are those files' columns and its records the number of country rows.",
  },
  "Wikidata": {
    url: "https://www.wikidata.org/",
    citation: "Wikidata, https://www.wikidata.org/ (CC0 1.0)",
    notes: "CC0: no attribution required; credited as a courtesy.",
  },
  [GBIF_CHECKLISTS]: {
    url: "https://www.gbif.org/dataset/search?type=CHECKLIST",
    citation: "Each dataset has its own citation and DOI: see gbifChecklists in https://critwire.com/v1/attribution.json",
    notes: "Used for /v1/range-listings.{json,csv,parquet}. Rows come only from datasets on critwire's allowlist, each under CC0 1.0 or CC BY 4.0; gbifChecklists gives each one's license, DOI, citation and row count. "
      + "Two ties to IUCN, stated plainly. The Global Register of Introduced and Invasive Species lists are published by the Invasive Species Specialist Group, a group of IUCN's Species Survival Commission; national experts write their rows. "
      + "The Checklist of the mammals of Central Asia says it used IUCN, GBIF and Catalogue of Life for cross-checking. These rows aren't Red List data, and critwire keeps no Red List status from any dataset.",
  },
  [MDD_SOURCE]: {
    url: "https://www.mammaldiversity.org/",
    citation: mddCitation,
    notes: "Used for /v1/range-listings.{json,csv,parquet}. Lists the countries where each mammal is native or was introduced before 1500 CE; it doesn't separate the two. "
      + "A tie to IUCN, stated plainly: MDD's paper says its data were \"initially sourced from the IUCN, HMW, and CMW\", and no row says which. critwire keeps only MDD's country lists, none of its IUCN status fields.",
  },
  [CURATED_SOURCE]: {
    url: "https://github.com/kc0588615/critwire/blob/main/data/review/range-curated.json",
    citation: CRITWIRE_CREDIT,
    notes: "Used for /v1/range-listings.{json,csv,parquet}. A curated row is critwire's reading of the reference in its url, in our own words. IUCN pages are never read for these rows.",
  },
  "critwire base": { url: "https://github.com/kc0588615/critwire/blob/main/data/base.json", citation: CRITWIRE_CREDIT },
};

// The deed links live in licenses.ts (import-free, so the browser bundle shares them; plan F5).
export { LICENSE_URLS, licenseUrl } from "./licenses.ts";
