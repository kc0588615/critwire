// The source registry (plan §7, A9): per source name in sources[], its homepage, the citation it asks for and notes.
// Citations are each source's own wording, verbatim; a template only where the source's own format has an access date.
import type { Registration } from "../gbif/derived-dataset.ts";
import type { Source } from "../species.ts";

export interface RegisteredSource {
  url: string;
  // registration: the current GBIF derived dataset; null only in a --draft build.
  citation: (source: Source, registration: Registration | null) => string;
  notes?: string;
}

// DATA-LICENSE.md's requested credit for critwire's own data.
export const CRITWIRE_CREDIT = "critwire (https://critwire.com), CC BY 4.0";

// ChecklistBank's citation per COL release key (api.checklistbank.org/dataset/<key>, "citation"), HTML as plain text.
export const COL_CITATIONS: Record<number, string> = {
  316595: "Bánki, O., Roskov, Y., Döring, M., Ower, G., Hernández Robles, D. R., Plata Corredor, C. A., Stjernegaard Jeppesen, T., Örn, A., Pape, T., Hobern, D., Garnett, S., Little, H., DeWalt, R. E., Miller, J., Orrell, T., Aalbu, R., Abbott, J., Aedo, C., Aescht, E., et al. (2026). Catalogue of Life (Version 2026-10-14). Catalogue of Life Foundation, Amsterdam, Netherlands. https://doi.org/10.48580/dgzh4",
};

// GBIF's citation.text per backbone DOI (api.gbif.org/v1/dataset/<checklistKey>), with the access date filled in.
const GBIF_BACKBONE_CITATIONS: Record<string, (retrieved: string) => string> = {
  "10.15468/39omei": (retrieved) => `GBIF Secretariat (2023). GBIF Backbone Taxonomy. Checklist dataset https://doi.org/10.15468/39omei accessed via GBIF.org on ${retrieved}.`,
};

function colCitation({ release, doi }: Source): string {
  if (!release) throw new Error("Catalogue of Life source without a release");
  const citation = COL_CITATIONS[release.key];
  if (!citation) throw new Error(`add the citation for COL release ${release.key} from api.checklistbank.org/dataset/${release.key}`);
  if (!citation.includes(`https://doi.org/${doi}`) || !citation.includes(`(Version ${release.version})`)) {
    throw new Error(`COL_CITATIONS[${release.key}] lacks the release's DOI ${doi} or version ${release.version}`);
  }
  return citation;
}

function backboneCitation({ doi, retrieved }: Source): string {
  const citation = GBIF_BACKBONE_CITATIONS[doi ?? ""];
  if (!citation || !retrieved) throw new Error(`add the citation for GBIF backbone DOI ${doi} from api.gbif.org/v1/dataset/<checklistKey>`);
  return citation(retrieved);
}

function occurrenceCitation({ doi, retrieved }: Source, registration: Registration | null): string {
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
  "Wikidata": {
    url: "https://www.wikidata.org/",
    citation: () => "Wikidata, https://www.wikidata.org/ (CC0 1.0)",
    notes: "CC0: no attribution required; credited as a courtesy.",
  },
  "critwire base": { url: "https://github.com/kc0588615/critwire/blob/main/data/base.json", citation: () => CRITWIRE_CREDIT },
};

// Deed URL per license string in the data (sources and photos); null where there is no license (public domain).
export const LICENSE_URLS: Record<string, string | null> = {
  "Public domain": null,
  "CC0": "https://creativecommons.org/publicdomain/zero/1.0/",
  "CC0 1.0": "https://creativecommons.org/publicdomain/zero/1.0/",
  "CC BY 2.0": "https://creativecommons.org/licenses/by/2.0/",
  "CC BY 2.5": "https://creativecommons.org/licenses/by/2.5/",
  "CC BY 4.0": "https://creativecommons.org/licenses/by/4.0/",
  "CC BY-SA 2.0": "https://creativecommons.org/licenses/by-sa/2.0/",
  "CC BY-SA 2.0 de": "https://creativecommons.org/licenses/by-sa/2.0/de/",
  "CC BY-SA 2.5": "https://creativecommons.org/licenses/by-sa/2.5/",
  "CC BY-SA 3.0": "https://creativecommons.org/licenses/by-sa/3.0/",
  "CC BY-SA 4.0": "https://creativecommons.org/licenses/by-sa/4.0/",
};

export function licenseUrl(license: string): string | null {
  if (!Object.hasOwn(LICENSE_URLS, license)) throw new Error(`unknown license "${license}": add it to LICENSE_URLS in scripts/build/sources.ts`);
  return LICENSE_URLS[license];
}
