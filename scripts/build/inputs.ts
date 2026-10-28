// The build's inputs (plan §3.2), checked offline before anything is written, in every build (strict and --draft).
import type { CountriesFile } from "../derive/naturalearth.ts";
import { assertDerivedFiles, deriveAll, readDeriveInputs } from "../derive/pipeline.ts";
import type { LearnResult } from "../derive/sample.ts";
import type { Registration } from "../gbif/derived-dataset.ts";
import { readLabFiles, type LabFile } from "../learn/lab-files.ts";
import type { Species } from "../species.ts";
import { assertRecordKeys } from "./columns.ts";

// registration: the GBIF derived dataset whose DOI the records cite (current); null only in a --draft build.
// countries: data/countries.json. learn: the lab sample (derive/sample.ts), its DOI null only in a --draft build.
// labFiles: data/learn/'s data files, each equal to its provenance file's record (learn/lab-files.ts).
export interface BuildInputs {
  species: Species[];
  registration: Registration | null;
  countries: CountriesFile;
  learn: LearnResult;
  labFiles: LabFile[];
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

  assertRecordKeys(species);
  for (const s of species) {
    if (/^\d+$/.test(s.slug)) throw new Error(`species ${s.id}: slug "${s.slug}" is all digits (it would collide with an {id}.json file)`);
    if (s.photo && !(s.photo.url && s.photo.credit && s.photo.license && s.photo.page)) {
      throw new Error(`species ${s.id}: photo needs a url, credit, license and page`);
    }
  }

  const labFiles = await readLabFiles();
  assertDois({ countries: result.doi, "learn-sample": result.learn.doi }, { draft });
  return { species, registration: result.doi === null ? null : inputs.registration, countries: result.countries, learn: result.learn, labFiles };
}
