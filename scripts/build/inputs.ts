// The build's inputs (plan §3.2), checked offline before anything is written, in every build (strict and --draft).
import { assertDerivedFiles, deriveAll, readDeriveInputs } from "../derive/pipeline.ts";
import type { Species } from "../species.ts";
import { assertRecordKeys } from "./columns.ts";

// doi: the current GBIF derived-dataset DOI; null only in a --draft build.
export interface BuildInputs { species: Species[]; doi: string | null }

export async function readBuildInputs({ draft }: { draft: boolean }): Promise<BuildInputs> {
  // Freshness: the committed derived files must equal derive's output byte for byte.
  const result = deriveAll(await readDeriveInputs());
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
  return { species, doi: result.doi };
}
