// The derive pipeline (plan §5, D7), shared by pnpm derive, pnpm build and pnpm gbif:register: read the inputs, derive
// every output in memory (pure: no network, clock or species.json read), and prove the committed derived files equal it.
// deriveAll = deriveCore (species, review entries, countries contributions, countries) + the lab sample's half
// (derive/sample.ts). pnpm ingest gbif-sample runs deriveCore alone, so a stale sample never blocks its re-ingest.
import { relative } from "node:path";
import { fileURLToPath } from "node:url";
import { formatJson, readJson, readOptionalText } from "../json.ts";
import { readSnapshot, type ColSnapshot, type GbifSnapshot, type NaturalEarthSnapshot, type WikidataSnapshot } from "../raw.ts";
import { baseFile, mismatchesFile, overridesFile, speciesFile, validateBase, validateRecords, type BaseSpecies, type Mismatch, type Species } from "../species.ts";
import {
  contributionsFile, currentDoi, registrationFile, sampleContributionsFile, type Contributions, type Registration,
} from "../gbif/derived-dataset.ts";
import { deriveCol } from "./col.ts";
import { gbifContributions } from "./contributions.ts";
import { deriveCountries, parseOverrides } from "./countries.ts";
import { deriveGbif } from "./gbif.ts";
import { assertNaturalEarthFresh, countriesFile, matchCountries, type CountriesFile, type CountriesResult } from "./naturalearth.ts";
import { buildRecord } from "./record.ts";
import { deriveSample, readLearnInputs, type LearnInputs, type LearnResult } from "./sample.ts";
import { assertWikidataFresh, bindingsByName, deriveWikidata } from "./wikidata.ts";

export interface CoreInputs {
  base: BaseSpecies[];
  wikidata: WikidataSnapshot;
  col: ColSnapshot;
  gbif: GbifSnapshot;
  naturalearth: NaturalEarthSnapshot;
  overrides: unknown;
  // data/gbif-derived-dataset/registration.json, null until pnpm gbif:register writes it.
  registration: Registration | null;
}

// doi: the registration's DOI when it matches the contributions, else null (gbif/derived-dataset.ts currentDoi).
// countries: data/countries.json; countriesReport: how each code matched (derive prints it).
export interface CoreResult {
  records: Species[];
  entries: Mismatch[];
  contributions: Contributions;
  doi: string | null;
  countries: CountriesFile;
  countriesReport: CountriesResult["report"];
}

export interface DeriveInputs extends CoreInputs { learn: LearnInputs }
export interface DeriveResult extends CoreResult { learn: LearnResult }

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const root = fileURLToPath(new URL("../../", import.meta.url));

export async function readDeriveInputs(): Promise<DeriveInputs> {
  return { ...await readCoreInputs(), learn: await readLearnInputs() };
}

export async function readCoreInputs(): Promise<CoreInputs> {
  return {
    base: await readJson<BaseSpecies[]>(baseFile),
    wikidata: await readSnapshot("wikidata"),
    col: await readSnapshot("col"),
    gbif: await readSnapshot("gbif"),
    naturalearth: await readSnapshot("naturalearth"),
    overrides: await readJson<unknown>(overridesFile),
    registration: await readOptionalText(registrationFile).then((text) => (text === null ? null : JSON.parse(text) as Registration)),
  };
}

// Throws unless a snapshot keyed by scientificName covers exactly the base names.
function assertNames(source: string, keys: string[], base: BaseSpecies[]): void {
  const want = base.map((s) => s.scientificName).sort(byText).join("\n");
  if ([...keys].sort(byText).join("\n") !== want) throw new Error(`data/raw/${source} is stale: run pnpm ingest ${source}`);
}

// Everything derive writes or checks: the core, then the lab sample from it. Pure; throws on a stale sample.
export function deriveAll(inputs: DeriveInputs): DeriveResult {
  const core = deriveCore(inputs);
  return { ...core, learn: deriveSample(core, inputs.learn) };
}

// Validates every core input and derives the records (sorted by id, values checked by validateRecords), the review entries, the GBIF contributions, the
// DOI the countries entries cite and the countries rows. Pure.
export function deriveCore({ base: unsorted, wikidata, col, gbif, naturalearth, overrides: rawOverrides, registration }: CoreInputs): CoreResult {
  validateBase(unsorted);
  const base = [...unsorted].sort((a, b) => a.id - b.id);
  assertWikidataFresh(wikidata, base);
  assertNaturalEarthFresh(naturalearth);
  assertNames("col", Object.keys(col.matches), base);
  assertNames("gbif", Object.keys(gbif.species), base);
  const overrides = parseOverrides(rawOverrides, new Set(base.map((s) => s.id)));

  const bindings = bindingsByName(wikidata);
  const entries: Mismatch[] = [];
  // Pass 1: the rules per species. The DOI depends on every species' contributions, so records are built after.
  const rules = base.map((s) => {
    const N = s.scientificName;
    const w = deriveWikidata(s, bindings.get(N) ?? []);
    const c = deriveCol(s, col.matches[N].response, w.p10585);
    const g = deriveGbif(s, gbif.species[N].match.response, w.p846);
    const occurrences = g.taxonKey === null ? null : gbif.species[N].occurrences;
    if (g.taxonKey !== null && new URL(occurrences?.url ?? "x:").searchParams.get("taxonKey") !== String(g.taxonKey)) {
      throw new Error(`data/raw/gbif has no occurrences for taxon ${g.taxonKey} (${N}): run pnpm ingest gbif`);
    }
    const k = deriveCountries({ species: s, occurrences: occurrences?.response ?? null, regions: gbif.countries, overrides });
    entries.push(...w.entries, ...c.entries, ...g.entries, ...k.entries);
    return { s, w, c, g, k, occurrences };
  });

  const contributions = gbifContributions(gbif.retrieved, rules.map(({ s, g, occurrences }) => (
    { speciesId: s.id, taxonKey: g.taxonKey, occurrences, datasets: gbif.species[s.scientificName].datasets })));
  const doi = currentDoi(contributions, registration);
  const records = rules.map(({ s, w, c, g, k, occurrences }) => buildRecord({
    base: s,
    wikidata: { retrieved: wikidata.retrieved, ids: w.ids },
    col: { retrieved: col.retrieved, release: col.release, url: col.matches[s.scientificName].url, id: c.id, taxonomy: c.taxonomy, taxonomySource: c.taxonomySource },
    gbif: { retrieved: gbif.retrieved, checklist: gbif.checklist, url: gbif.species[s.scientificName].match.url, id: g.id, occurrencesUrl: occurrences?.url ?? null, countries: k.value, rangeStatus: k.status, doi },
  }));
  validateRecords(records);
  entries.sort((a, b) => a.speciesId - b.speciesId || byText(a.field, b.field) || byText(a.kind, b.kind) || byText(a.country ?? "", b.country ?? ""));
  const { rows, report: countriesReport } = matchCountries(naturalearth.layers, {
    speciesCodes: records.flatMap((r) => r.range.countriesWithOpenRecords ?? []),
    gbifCodes: Object.keys(gbif.countries),
  });
  const { release, commit, retrieved } = naturalearth;
  return { records, entries, contributions, doi, countries: { source: { release, commit, retrieved }, rows }, countriesReport };
}

// Every file pnpm derive writes, with its content and format (canonical: keys sorted, json.ts formatJson).
export function derivedFiles({ records, entries, contributions, countries, learn }: DeriveResult): { file: URL; value: unknown; canonical: boolean }[] {
  return [
    { file: speciesFile, value: records, canonical: false },
    { file: mismatchesFile, value: entries, canonical: false },
    { file: contributionsFile, value: contributions, canonical: true },
    { file: countriesFile, value: countries, canonical: false },
    { file: sampleContributionsFile, value: learn.contributions, canonical: true },
  ];
}

// Throws unless every committed derived file equals derive's output byte for byte.
export async function assertDerivedFiles(result: DeriveResult): Promise<void> {
  for (const { file, value, canonical } of derivedFiles(result)) {
    if (await readOptionalText(file) !== formatJson(value, { canonical })) {
      throw new Error(`${relative(root, fileURLToPath(file))} is stale: run pnpm derive`);
    }
  }
}
