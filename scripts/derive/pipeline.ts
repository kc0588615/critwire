// The derive pipeline (plan §5), shared by pnpm derive, pnpm build and pnpm gbif:register: read the inputs, derive
// every output in memory (pure: no network, clock or species.json read), and prove the committed derived files equal it.
import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { formatJson, readJson } from "../json.ts";
import { readSnapshot, type ColSnapshot, type GbifSnapshot, type WikidataSnapshot } from "../raw.ts";
import { baseFile, mismatchesFile, overridesFile, speciesFile, validateBase, type BaseSpecies, type Mismatch, type Species } from "../species.ts";
import { deriveCol } from "./col.ts";
import { deriveCountries, parseOverrides } from "./countries.ts";
import { deriveGbif } from "./gbif.ts";
import { buildRecord } from "./record.ts";
import { assertWikidataFresh, bindingsByName, deriveWikidata } from "./wikidata.ts";

export interface DeriveInputs {
  base: BaseSpecies[];
  wikidata: WikidataSnapshot;
  col: ColSnapshot;
  gbif: GbifSnapshot;
  overrides: unknown;
}

export interface DeriveResult { records: Species[]; entries: Mismatch[] }

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const root = fileURLToPath(new URL("../../", import.meta.url));

export async function readDeriveInputs(): Promise<DeriveInputs> {
  return {
    base: await readJson<BaseSpecies[]>(baseFile),
    wikidata: await readSnapshot("wikidata"),
    col: await readSnapshot("col"),
    gbif: await readSnapshot("gbif"),
    overrides: await readJson<unknown>(overridesFile),
  };
}

// Throws unless a snapshot keyed by scientificName covers exactly the base names.
function assertNames(source: string, keys: string[], base: BaseSpecies[]): void {
  const want = base.map((s) => s.scientificName).sort(byText).join("\n");
  if ([...keys].sort(byText).join("\n") !== want) throw new Error(`data/raw/${source} is stale: run pnpm ingest ${source}`);
}

// Validates every input and derives the records (sorted by id) and the review entries. Pure.
export function deriveAll({ base: unsorted, wikidata, col, gbif, overrides: rawOverrides }: DeriveInputs): DeriveResult {
  validateBase(unsorted);
  const base = [...unsorted].sort((a, b) => a.id - b.id);
  assertWikidataFresh(wikidata, base);
  assertNames("col", Object.keys(col.matches), base);
  assertNames("gbif", Object.keys(gbif.species), base);
  const overrides = parseOverrides(rawOverrides, new Set(base.map((s) => s.id)));

  const bindings = bindingsByName(wikidata);
  const records: Species[] = [];
  const entries: Mismatch[] = [];
  for (const s of base) {
    const N = s.scientificName;
    const w = deriveWikidata(s, bindings.get(N) ?? []);
    const c = deriveCol(s, col.matches[N].response, w.p10585);
    const g = deriveGbif(s, gbif.species[N].match.response, w.p846);
    const occurrences = g.taxonKey === null ? null : gbif.species[N].occurrences;
    if (g.taxonKey !== null && new URL(occurrences?.url ?? "x:").searchParams.get("taxonKey") !== String(g.taxonKey)) {
      throw new Error(`data/raw/gbif has no occurrences for taxon ${g.taxonKey} (${N}): run pnpm ingest gbif`);
    }
    const k = deriveCountries({ species: s, occurrences: occurrences?.response ?? null, regions: gbif.countries, overrides });
    records.push(buildRecord({
      base: s,
      wikidata: { retrieved: wikidata.retrieved, ids: w.ids },
      col: { retrieved: col.retrieved, release: col.release, url: col.matches[N].url, id: c.id, taxonomy: c.taxonomy, taxonomySource: c.taxonomySource },
      gbif: { retrieved: gbif.retrieved, checklist: gbif.checklist, url: gbif.species[N].match.url, id: g.id, occurrencesUrl: occurrences?.url ?? null, countries: k.value, rangeStatus: k.status },
    }));
    entries.push(...w.entries, ...c.entries, ...g.entries, ...k.entries);
  }
  entries.sort((a, b) => a.speciesId - b.speciesId || byText(a.field, b.field) || byText(a.kind, b.kind) || byText(a.country ?? "", b.country ?? ""));
  return { records, entries };
}

// Every file pnpm derive writes, with its content.
export function derivedFiles({ records, entries }: DeriveResult): { file: URL; value: unknown }[] {
  return [
    { file: speciesFile, value: records },
    { file: mismatchesFile, value: entries },
  ];
}

// Throws unless every committed derived file equals derive's output byte for byte.
export async function assertDerivedFiles(result: DeriveResult): Promise<void> {
  for (const { file, value } of derivedFiles(result)) {
    if (await readFile(file, "utf8") !== formatJson(value)) {
      throw new Error(`${relative(root, fileURLToPath(file))} is stale: run pnpm derive`);
    }
  }
}
