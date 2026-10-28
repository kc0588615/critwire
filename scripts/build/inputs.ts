// The build's inputs (plan §3.2), checked offline before anything is written, in every build (strict and --draft).
import type { CountriesFile } from "../derive/naturalearth.ts";
import { assertDerivedFiles, deriveAll, readDeriveInputs } from "../derive/pipeline.ts";
import type { Registration } from "../gbif/derived-dataset.ts";
import type { Species } from "../species.ts";
import { assertRecordKeys } from "./columns.ts";

// registration: the GBIF derived dataset whose DOI the records cite (current); null only in a --draft build.
// countries: data/countries.json.
export interface BuildInputs { species: Species[]; registration: Registration | null; countries: CountriesFile }

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

  if (result.doi === null && !draft) {
    throw new Error("no current GBIF derived-dataset DOI (registration missing or stale): see AGENTS.md, GBIF DOI refresh; pnpm build --draft for a preview");
  }
  return { species, registration: result.doi === null ? null : inputs.registration, countries: result.countries };
}
