// The lab files' credits (plan D9.7, 004 §4.5; ported from the spike's scripts/credits.ts): LAB_FILES maps each
// /learn/data/ file to its sources, labSources defines them, and credits(file) gives a file's entries for manifest.json,
// refusing (ST4) a file with no sources, an unknown source, a license missing from LICENSE_URLS, a CC BY source with no
// citation, and, for a source that credits the sample's datasets, none or one with no title or publisher.
// /v1/attribution.json stays about the species and countries files.
import { readJson } from "../../json.ts";
import type { Registration } from "../../gbif/derived-dataset.ts";
import { labDataDir } from "../../learn/lab-files.ts";
import type { SampleDownload } from "../../learn/sample-files.ts";
import { CRITWIRE_CREDIT, licenseUrl, NATURAL_EARTH, SOURCES } from "../sources.ts";

export interface LabSource {
  name: string;
  license: string;
  citation: string;
  url: string;
  doi?: string;
  // The file that credits each contributing dataset (title, publisher, DOI, license): the sample's datasets.csv.
  datasets?: string;
  // The sample's own GBIF derived dataset (004 §4.2); absent until registered (a --draft build).
  derivedDataset?: { doi: string; citation: string; url: string };
}
export interface Credit extends LabSource { licenseUrl: string | null }
export interface CreditDataset { dataset_key: string; title: string | null; publisher: string | null }
export interface CreditContext {
  sources: Record<string, LabSource>;
  files: Record<string, readonly string[]>; // file (its path under /learn/data/) → source ids
  datasets: readonly CreditDataset[]; // the sample's datasets, checked whenever a file's source credits them
}

// Every file under /learn/data/ but manifest.json and index.html, and its sources. A file not listed here fails the build.
export const LAB_FILES: Record<string, readonly string[]> = {
  "occurrences.parquet": ["gbif-sample"],
  "occurrences.csv": ["gbif-sample"],
  "datasets.csv": ["gbif-sample"],
  "country_shapes.parquet": ["natural-earth"],
  "admin1_shapes.parquet": ["natural-earth"],
  "ecoregions.parquet": ["resolve"],
  "biomes.csv": ["resolve"],
  "habitat_classes.parquet": ["jung-habitat"],
  "country_habitats.parquet": ["jung-habitat", "natural-earth"],
  "occurrence_habitats.parquet": ["jung-habitat", "gbif-sample"],
  "habitat_clips.parquet": ["jung-habitat"],
  "clips/cr.tif": ["jung-habitat"],
  "clips/tas.tif": ["jung-habitat"],
  "postgis/learn_curriculum.sql": ["critwire", "natural-earth", "gbif-sample", "resolve", "jung-habitat"],
  // The star (build/learn/star.ts STAR_FILES): each table from the lab tables it is built from.
  "star/dim_country.csv": ["natural-earth"],
  "star/dim_dataset.csv": ["gbif-sample"],
  "star/dim_species.csv": ["critwire"],
  "star/dim_year.csv": ["gbif-sample"],
  "star/fact_records.csv": ["gbif-sample"],
  "star/fact_species_country.csv": ["critwire"],
  "star/dim_habitat_class.csv": ["jung-habitat"],
  "star/fact_country_habitat.csv": ["jung-habitat", "natural-earth"],
  "star/manifest.json": ["critwire"],
};

const blank = (s: string | null | undefined) => !s?.trim();

// A file's sources, each with its license URL, keys in a fixed order (query; throws per ST4).
export function credits(file: string, ctx: CreditContext): Credit[] {
  const ids = ctx.files[file];
  if (!ids?.length) throw new Error(`${file}: no sources: add it to LAB_FILES in scripts/build/learn/credits.ts`);
  return ids.map((id) => {
    const s = ctx.sources[id];
    if (!s) throw new Error(`${file}: unknown source ${id}`);
    const url = licenseUrl(s.license);
    if (s.license.startsWith("CC BY") && blank(s.citation)) throw new Error(`${file}: ${s.name} is ${s.license} with no citation`);
    if (s.datasets) {
      if (!ctx.datasets.length) throw new Error(`${file}: no datasets to credit (${s.datasets})`);
      for (const d of ctx.datasets) {
        if (blank(d.title)) throw new Error(`${file}: dataset ${d.dataset_key} has no title`);
        if (blank(d.publisher)) throw new Error(`${file}: dataset ${d.dataset_key} has no publisher`);
      }
    }
    return {
      name: s.name, license: s.license, licenseUrl: url, citation: s.citation, url: s.url,
      ...(s.doi && { doi: s.doi }), ...(s.datasets && { datasets: s.datasets }), ...(s.derivedDataset && { derivedDataset: s.derivedDataset }),
    };
  });
}

// GBIF's download license (a legal-code URL) as critwire's license string.
const GBIF_LICENSES: Record<string, string> = {
  "http://creativecommons.org/licenses/by/4.0/legalcode": "CC BY 4.0",
  "http://creativecommons.org/publicdomain/zero/1.0/legalcode": "CC0 1.0",
};

// GBIF's own citation form for a download: "GBIF.org (23 October 2026) GBIF Occurrence Download https://doi.org/…".
const downloadCitation = ({ doi, created }: SampleDownload) =>
  `GBIF.org (${new Date(created).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" })}) GBIF Occurrence Download https://doi.org/${doi}`;

// The lab's sources. registration: the sample's current derived dataset, null in a --draft build. habitat: data/learn/
// habitat.json's source (pnpm ingest habitat's).
export function labSources({ download, registration, habitat }: { download: SampleDownload; registration: Registration | null; habitat: LabSource }): Record<string, LabSource> {
  const license = GBIF_LICENSES[download.license];
  if (!license) throw new Error(`GBIF download license ${download.license} isn't one critwire publishes (${Object.keys(GBIF_LICENSES).join(", ")})`);
  const ne = SOURCES[NATURAL_EARTH]!;
  return {
    "critwire": { name: "critwire", license: "CC BY 4.0", citation: CRITWIRE_CREDIT, url: "https://critwire.com/v1/attribution.json" },
    "natural-earth": { name: NATURAL_EARTH, license: "Public domain", citation: ne.citation as string, url: ne.url },
    "gbif-sample": {
      name: "GBIF occurrence download", license, citation: downloadCitation(download), url: `https://doi.org/${download.doi}`, doi: download.doi,
      datasets: "datasets.csv",
      ...(registration && { derivedDataset: { doi: registration.doi, citation: registration.citation, url: `https://doi.org/${registration.doi}` } }),
    },
    "resolve": {
      name: "RESOLVE Ecoregions 2017",
      license: "CC BY 4.0",
      citation: "Dinerstein, E., Olson, D., Joshi, A., et al. (2017). An Ecoregion-Based Approach to Protecting Half the Terrestrial Realm. BioScience 67(6), 534–545. https://doi.org/10.1093/biosci/bix014",
      url: "https://ecoregions.appspot.com/",
      doi: "10.1093/biosci/bix014",
    },
    "jung-habitat": habitat,
  };
}

// The real context: labSources over habitat.json's source, LAB_FILES and the sample's datasets.
export async function labCreditContext({ download, registration, datasets }: { download: SampleDownload; registration: Registration | null; datasets: readonly CreditDataset[] }): Promise<CreditContext> {
  const { source } = await readJson<{ source: LabSource }>(new URL("habitat.json", labDataDir));
  const { name, license, citation, url, doi } = source;
  return { sources: labSources({ download, registration, habitat: { name, license, citation, url, doi } }), files: LAB_FILES, datasets };
}
