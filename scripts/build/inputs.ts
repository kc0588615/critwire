// The build's inputs (plan §3.2), checked offline before anything is written, in every build (strict and --draft).
import type { CountriesFile } from "../derive/naturalearth.ts";
import { assertDerivedFiles, deriveAll, readDeriveInputs } from "../derive/pipeline.ts";
import type { LearnResult } from "../derive/sample.ts";
import type { Registration } from "../gbif/derived-dataset.ts";
import { assertHabitatFresh, type HabitatFreshness } from "../ingest/habitat.ts";
import { readJson } from "../json.ts";
import { labDataDir, readLabFiles, type LabFile } from "../learn/lab-files.ts";
import type { Species } from "../species.ts";
import { assertRecordKeys, csvColumns, RECORD_COLUMNS } from "./columns.ts";
import { checkV1Contract, contractFile, type V1Contract } from "./contract.ts";
import { COUNTRY_TYPES } from "./countries.ts";
import { assertCap, fileSizes, totalBytes } from "./learn/cap.ts";
import { credits, labCreditContext, LAB_FILES, type CreditContext } from "./learn/credits.ts";
import { assertLearnProjection } from "./learn/projection.ts";

// registration: the GBIF derived dataset whose DOI the records cite (current); null only in a --draft build.
// countries: data/countries.json. learn: the lab sample (derive/sample.ts), its DOI null only in a --draft build.
// labFiles: data/learn/'s data files, each equal to its provenance file's record (learn/lab-files.ts). labCredits:
// /learn/data/'s sources, every LAB_FILES entry checked (ST4). labBytes: the committed lab data's total (under the cap).
export interface BuildInputs {
  species: Species[];
  registration: Registration | null;
  countries: CountriesFile;
  learn: LearnResult;
  labFiles: LabFile[];
  labCredits: CreditContext;
  labBytes: number;
}

// The committed lab data (plan D3, 004 §4.4), under the 120 MB cap together.
const COMMITTED_LAB_DIRS = ["raw/gbif-sample/", "learn/", "gbif-learn-sample/"] as const;
const dataDir = new URL("../../data/", import.meta.url);

// Every committed lab file (data/<dir><file>) and its size.
async function committedLabSizes(): Promise<Record<string, number>> {
  const sizes: Record<string, number> = {};
  for (const dir of COMMITTED_LAB_DIRS) {
    for (const [name, bytes] of Object.entries(await fileSizes(new URL(dir, dataDir)))) sizes[`data/${dir}${name}`] = bytes;
  }
  return sizes;
}

// The GBIF derived-dataset targets and how each DOI is refreshed (AGENTS.md, GBIF DOI refresh).
const DOI_REFRESH = {
  countries: "pnpm gbif:register",
  "learn-sample": "pnpm gbif:register --target learn-sample",
} as const;

// Throws unless every target's DOI is current, naming each missing or stale one; --draft lifts this check only
// (freshness is checked before, by derive).
export function assertDois(dois: Record<keyof typeof DOI_REFRESH, string | null>, { draft }: { draft: boolean }): void {
  if (draft) return;
  const missing = (Object.keys(DOI_REFRESH) as (keyof typeof DOI_REFRESH)[]).filter((t) => dois[t] === null);
  if (missing.length === 0) return;
  throw new Error(`no current GBIF derived-dataset DOI (registration missing or stale) for ${missing.map((t) => `${t} (${DOI_REFRESH[t]})`).join(", ")}: ` +
    "see AGENTS.md, GBIF DOI refresh; pnpm build --draft for a preview");
}

export async function readBuildInputs({ draft }: { draft: boolean }): Promise<BuildInputs> {
  // Freshness: the committed derived files must equal derive's output byte for byte.
  const inputs = await readDeriveInputs();
  const result = deriveAll(inputs);
  await assertDerivedFiles(result);
  const species = result.records;

  // Values were checked by derive (validateRecords); the key shape here, next to the DuckDB columns.
  assertRecordKeys(species);

  assertLearnProjection(species);

  // The /v1 contract (L3 plan §7.1): writers and data against contracts/v1.json, before any load or write.
  const contract = checkV1Contract(await readJson<V1Contract>(contractFile), {
    recordColumns: RECORD_COLUMNS, csvColumns: csvColumns(), countryColumns: COUNTRY_TYPES, species, countries: result.countries.rows,
  });
  if (contract.problems.length) throw new Error(`contracts/v1.json:\n${contract.problems.join("\n")}`);
  for (const a of contract.additions) console.log(a);

  const labFiles = await readLabFiles();
  // The habitat files were computed from these outlines and records (L3 plan §2): in --draft too, since a stale
  // occurrence_habitats would break the loader's foreign key.
  const { inputs: habitatInputs } = await readJson<{ inputs: HabitatFreshness }>(new URL("habitat.json", labDataDir));
  const shapes = labFiles.find((f) => f.name === "country_shapes.parquet");
  if (!shapes) throw new Error("data/learn/country_shapes.parquet missing");
  assertHabitatFresh(habitatInputs, { countryShapesSha256: shapes.sha256, occurrences: result.learn.occurrences });
  const labSizes = await committedLabSizes();
  assertCap(`committed lab data (data/{${COMMITTED_LAB_DIRS.join(",")}})`, labSizes);
  assertDois({ countries: result.doi, "learn-sample": result.learn.doi }, { draft });
  const labCredits = await labCreditContext({
    download: inputs.learn.download,
    registration: result.learn.doi === null ? null : inputs.learn.registration,
    datasets: result.learn.datasets,
  });
  for (const file of Object.keys(LAB_FILES)) credits(file, labCredits);
  return {
    species, registration: result.doi === null ? null : inputs.registration, countries: result.countries, learn: result.learn, labFiles,
    labCredits, labBytes: totalBytes(labSizes),
  };
}
