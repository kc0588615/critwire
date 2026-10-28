// The lab sample's derive (plan D7, 004 §4.2), pure: freshness of data/raw/gbif-sample against today's core (MF3),
// sample.csv parsed and typed, the country-key contract over the core's countries, the sample's datasets, its
// per-dataset contributions and the learn-sample DOI. The ingest applied the species, license and cap rules.
import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import { readJson, readOptionalText } from "../json.ts";
import { currentSampleDoi, sampleRegistrationFile, type Registration, type SampleContributions } from "../gbif/derived-dataset.ts";
import { downloadRequest, sameRequest } from "../learn/download.ts";
import { SAMPLE_COLUMNS, sampleDir, sampleSpeciesOf, type SampleDatasets, type SampleDownload, type SampleSpecies } from "../learn/sample-files.ts";
import { countryKeys, OPEN_LICENSES, SAMPLE_RULES, type SampleLicense } from "../learn/sample-rules.ts";
import type { Species } from "../species.ts";
import type { CountriesFile } from "./naturalearth.ts";

// occurrences' columns, in every file and both databases (004 §4.2).
export const OCCURRENCE_COLUMNS = [
  "id", "species_id", "dataset_key", "license", "basis_of_record", "longitude", "latitude", "coordinate_uncertainty_m",
  "country_code_gbif", "country_code", "year", "month",
] as const;
export interface OccurrenceRow {
  id: number;
  species_id: number;
  dataset_key: string;
  license: SampleLicense;
  basis_of_record: string;
  longitude: number;
  latitude: number;
  coordinate_uncertainty_m: number | null;
  country_code_gbif: string | null;
  country_code: string | null;
  year: number | null;
  month: number | null;
}
// datasets' columns: the sample's datasets, with the dataset's declared license.
export interface SampleDatasetRow { dataset_key: string; title: string; publisher: string; doi: string | null; license: SampleLicense }

export interface LearnInputs {
  download: SampleDownload;
  datasets: SampleDatasets;
  sampleCsv: string;
  registration: Registration | null; // data/gbif-learn-sample/registration.json, null until registered
}
export interface LearnResult {
  occurrences: OccurrenceRow[]; // sorted by id
  datasets: SampleDatasetRow[]; // sorted by key
  contributions: SampleContributions;
  doi: string | null; // the learn-sample DOI when current
}

const SAMPLE_FILE = "data/raw/gbif-sample/sample.csv";
const NUMBER = /^-?(\d+(\.\d*)?|\.\d+)([eE][-+]?\d+)?$/;
const INTEGER = /^-?\d+$/;

export async function readLearnInputs(): Promise<LearnInputs> {
  const text = await readOptionalText(sampleRegistrationFile);
  return {
    download: await readJson<SampleDownload>(new URL("download.json", sampleDir)),
    datasets: await readJson<SampleDatasets>(new URL("datasets.json", sampleDir)),
    sampleCsv: await readOptionalText(new URL("sample.csv", sampleDir)) ?? "",
    registration: text === null ? null : JSON.parse(text) as Registration,
  };
}

// Throws unless data/raw/gbif-sample was ingested for today's species and rules: the request GBIF stored equals
// downloadRequest over the core's ids.gbif, each species keeps the ids.gbif it was sampled under (the request is a key
// set: two species swapping keys would send rows to the wrong species), the rules equal SAMPLE_RULES, and datasets.json
// is the same download's.
function assertSampleFresh(records: Species[], { download, datasets }: LearnInputs): void {
  const species = sampleSpeciesOf(records);
  const why = !sameRequest(download.request, downloadRequest(species.map((s) => s.gbif)))
    ? "its request isn't today's downloadRequest: ids.gbif or the filters changed, so run it with --new"
    : !Array.isArray(download.species) ? "download.json has no species list"
    : movedSpecies(species, download.species)
    ?? (!isDeepStrictEqual(download.sampleRules, SAMPLE_RULES) ? "sampleRules differ from scripts/learn/sample-rules.ts"
    : datasets.downloadKey !== download.key ? `datasets.json is for download ${datasets.downloadKey}, download.json for ${download.key}`
    : null);
  if (why !== null) throw new Error(`data/raw/gbif-sample is stale (${why}): run pnpm ingest gbif-sample`);
}

// Each species whose ids.gbif today differs from the sample's (or that the sample lacks, or has and today's core
// doesn't), by id; null when every pair matches.
function movedSpecies(today: SampleSpecies[], sampled: SampleSpecies[]): string | null {
  const was = new Map(sampled.map((s) => [s.id, s.gbif]));
  const now = new Map(today.map((s) => [s.id, s.gbif]));
  const moved = [...new Set([...now.keys(), ...was.keys()])].sort((a, b) => a - b)
    .filter((id) => now.get(id) !== was.get(id))
    .map((id) => `species ${id} is GBIF ${now.get(id) ?? "none"}, the sample's ${was.get(id) ?? "none"}`);
  return moved.length ? moved.join("; ") : null;
}

// sample.csv's rows, typed: no quoting (the ingest refuses a value that would need it), empty = NULL, sorted by id.
function parseSample(text: string): (Omit<OccurrenceRow, "country_code" | "license"> & { license: string; line: number })[] {
  if (!text.endsWith("\n")) throw new Error(`sample.csv doesn't end with a newline (truncated?)`);
  const [header, ...lines] = text.slice(0, -1).split("\n");
  if (header !== SAMPLE_COLUMNS.join(",")) throw new Error(`sample.csv: header ${JSON.stringify(header)}, expected ${SAMPLE_COLUMNS.join(",")}`);
  let last = 0;
  return lines.map((text, i) => {
    const line = i + 2;
    const f = text.split(",");
    if (f.length !== SAMPLE_COLUMNS.length) throw new Error(`sample.csv line ${line}: ${f.length} fields, expected ${SAMPLE_COLUMNS.length}`);
    const v = Object.fromEntries(SAMPLE_COLUMNS.map((c, j) => [c, f[j]])) as Record<(typeof SAMPLE_COLUMNS)[number], string>;
    const bad = (c: string): never => { throw new Error(`sample.csv line ${line}: ${c} ${JSON.stringify(v[c as keyof typeof v])}`); };
    const num = (c: keyof typeof v, optional: boolean, pattern = NUMBER): number | null => {
      if (v[c] === "") return optional ? null : bad(c);
      const n = Number(v[c]);
      return pattern.test(v[c]) && Number.isFinite(n) && (pattern !== INTEGER || Number.isSafeInteger(n)) ? n : bad(c);
    };
    const text_ = (c: keyof typeof v, optional: boolean): string | null => (v[c] === "" ? (optional ? null : bad(c)) : v[c]);
    const id = num("id", false, INTEGER)!;
    if (id <= last) throw new Error(`sample.csv line ${line}: id ${id} after ${last} (duplicate or out of order)`);
    last = id;
    return {
      line, id, species_id: num("species_id", false, INTEGER)!, dataset_key: text_("dataset_key", false)!, license: text_("license", false)!,
      basis_of_record: text_("basis_of_record", false)!, longitude: num("longitude", false)!, latitude: num("latitude", false)!,
      coordinate_uncertainty_m: num("coordinate_uncertainty_m", true), country_code_gbif: text_("country_code_gbif", true),
      year: num("year", true, INTEGER), month: num("month", true, INTEGER),
    };
  });
}

// The sample's occurrence and dataset rows, contributions and DOI, from today's core (records, countries).
export function deriveSample({ records, countries }: { records: Species[]; countries: CountriesFile }, inputs: LearnInputs): LearnResult {
  assertSampleFresh(records, inputs);
  const { download, datasets: { datasets: meta }, sampleCsv, registration } = inputs;
  const speciesIds = new Set(records.filter((r) => r.ids.gbif !== null).map((r) => r.id));
  const byKey = new Map(meta.map((d) => [d.key, d]));
  const parsed = parseSample(sampleCsv);
  const codes = new Map<string | null, number>();
  const counts: Record<string, number> = {};
  for (const r of parsed) {
    if (!speciesIds.has(r.species_id)) throw new Error(`sample.csv line ${r.line}: species_id ${r.species_id} isn't a species with an ids.gbif`);
    if (!byKey.has(r.dataset_key)) throw new Error(`sample.csv line ${r.line}: dataset ${r.dataset_key} isn't in datasets.json`);
    if (!(OPEN_LICENSES as readonly string[]).includes(r.license)) throw new Error(`sample.csv line ${r.line}: license ${JSON.stringify(r.license)} isn't open`);
    codes.set(r.country_code_gbif, (codes.get(r.country_code_gbif) ?? 0) + 1);
    counts[r.dataset_key] = (counts[r.dataset_key] ?? 0) + 1;
  }
  const keys = countryKeys(codes, new Set(countries.rows.map((c) => c.code)));
  const occurrences = parsed.map(({ line: _line, ...r }): OccurrenceRow => {
    const { gbif, code } = keys.get(r.country_code_gbif)!;
    return {
      id: r.id, species_id: r.species_id, dataset_key: r.dataset_key, license: r.license as SampleLicense, basis_of_record: r.basis_of_record,
      longitude: r.longitude, latitude: r.latitude, coordinate_uncertainty_m: r.coordinate_uncertainty_m, country_code_gbif: gbif,
      country_code: code, year: r.year, month: r.month,
    };
  });
  const sorted = Object.keys(counts).sort();
  const contributions: SampleContributions = {
    downloadKey: download.key,
    originalDownloadDoi: download.doi,
    records: occurrences.length,
    datasets: Object.fromEntries(sorted.map((k) => [k, counts[k]])),
    sample: { file: SAMPLE_FILE, sha256: createHash("sha256").update(sampleCsv).digest("hex") },
  };
  const datasets = sorted.map((k): SampleDatasetRow => {
    const d = byKey.get(k)!;
    return { dataset_key: k, title: d.title, publisher: d.publisher, doi: d.doi, license: d.license };
  });
  return { occurrences, datasets, contributions, doi: currentSampleDoi(contributions, registration) };
}
