// data/raw/gbif-sample/ (plan D3), written by pnpm ingest gbif-sample and read by derive: the file names and formats.
import type { SAMPLE_RULES, SampleLicense } from "./sample-rules.ts";

export const sampleDir = new URL("../../data/raw/gbif-sample/", import.meta.url);
export const SAMPLE_FILES = ["download.json", "datasets.json", "sample.csv"] as const;

// sample.csv's columns. Country keys are derive's (D7), so the file keeps GBIF's raw countryCode.
export const SAMPLE_COLUMNS = [
  "id", "species_id", "dataset_key", "license", "basis_of_record", "longitude", "latitude", "coordinate_uncertainty_m",
  "country_code_gbif", "year", "month",
] as const;
export type SampleRow = Record<(typeof SAMPLE_COLUMNS)[number], string | number | null> & { id: number; species_id: number };

// A species of the sample: its id and ids.gbif.
export interface SampleSpecies { id: number; gbif: number }
// The species with an ids.gbif, sorted by gbif: download.json's species, which derive compares pair by pair (the
// request alone is a key set, blind to two species swapping keys).
export const sampleSpeciesOf = (records: readonly { id: number; ids: { gbif: number | null } }[]): SampleSpecies[] =>
  sortByGbif(records.flatMap((r) => (r.ids.gbif === null ? [] : [{ id: r.id, gbif: r.ids.gbif }])));
export const sortByGbif = (species: readonly SampleSpecies[]): SampleSpecies[] => [...species].sort((a, b) => a.gbif - b.gbif);

// download.json: the download, GBIF's stored request (creator removed), the species it was sampled for, the zip and
// the rules.
export interface SampleDownload {
  key: string;
  doi: string;
  license: string;
  created: string;
  eraseAfter: string;
  totalRecords: number;
  numberDatasets: number;
  request: Record<string, unknown>;
  downloadLink: string;
  zip: { bytes: number; sha256: string };
  datasetCounts: Record<string, number>;
  sampleRules: typeof SAMPLE_RULES;
  species: SampleSpecies[];
}

// datasets.json: every dataset of the download.
export interface SampleDataset {
  key: string;
  title: string;
  publisher: string;
  publishingOrganizationKey: string;
  doi: string | null;
  license: SampleLicense;
  licenseUrl: string;
  records: number;
  recordLicenses: Record<string, number>;
  deleted?: string;
}
export interface SampleDatasets { retrieved: string; downloadKey: string; datasets: SampleDataset[] }
