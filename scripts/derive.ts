// Derives data/species.json and data/review/mismatches.json from data/base.json, data/raw/ and
// data/review/country-overrides.json (plan §5). Offline and deterministic: never reads species.json, the clock or the
// network. Validates every input and computes everything before writing either file.
// Usage: pnpm derive
import { readJson, writeJson } from "./json.ts";
import { readSnapshot } from "./raw.ts";
import { baseFile, mismatchesFile, overridesFile, speciesFile, validateBase, type BaseSpecies, type Mismatch, type Species } from "./species.ts";
import { deriveCol } from "./derive/col.ts";
import { deriveCountries, parseOverrides } from "./derive/countries.ts";
import { deriveGbif } from "./derive/gbif.ts";
import { buildRecord } from "./derive/record.ts";
import { assertWikidataFresh, bindingsByName, deriveWikidata } from "./derive/wikidata.ts";

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// Throws unless a snapshot keyed by scientificName covers exactly the base names.
function assertNames(source: string, keys: string[], base: BaseSpecies[]): void {
  const want = base.map((s) => s.scientificName).sort(byText).join("\n");
  if ([...keys].sort(byText).join("\n") !== want) throw new Error(`data/raw/${source} is stale: run pnpm ingest ${source}`);
}

const base = await readJson<BaseSpecies[]>(baseFile);
validateBase(base);
base.sort((a, b) => a.id - b.id);
const [wikidata, col, gbif] = [await readSnapshot("wikidata"), await readSnapshot("col"), await readSnapshot("gbif")];
assertWikidataFresh(wikidata, base);
assertNames("col", Object.keys(col.matches), base);
assertNames("gbif", Object.keys(gbif.species), base);
const overrides = parseOverrides(await readJson<unknown>(overridesFile), new Set(base.map((s) => s.id)));

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
    gbif: { retrieved: gbif.retrieved, checklist: gbif.checklist, url: gbif.species[N].match.url, id: g.id, occurrencesUrl: occurrences?.url ?? null, countries: k.value },
  }));
  entries.push(...w.entries, ...c.entries, ...g.entries, ...k.entries);
}
entries.sort((a, b) => a.speciesId - b.speciesId || byText(a.field, b.field) || byText(a.kind, b.kind) || byText(a.country ?? "", b.country ?? ""));

await writeJson(speciesFile, records);
await writeJson(mismatchesFile, entries);

// Summary for the PR body.
const n = records.length;
console.log(`species ${n}`);
for (const f of ["gbif", "col", "wikidata", "inaturalist", "ncbi"] as const) {
  console.log(`ids.${f} ${records.filter((r) => r.ids[f] !== null).length}/${n}`);
}
console.log(`taxonomy from COL ${records.filter((r) => r.sources.some((s) => s.source === "Catalogue of Life" && s.fields.includes("taxonomy"))).length}/${n}`);
const countries = records.map((r) => r.range.countriesWithRecords);
console.log(`countries: listed ${countries.filter((c) => c?.length).length}, empty ${countries.filter((c) => c?.length === 0).length}, null ${countries.filter((c) => c === null).length}, codes ${countries.reduce((a, c) => a + (c?.length ?? 0), 0)}`);
for (const [label, c] of [["empty", (c: string[] | null) => c?.length === 0], ["null", (c: string[] | null) => c === null]] as const) {
  const names = records.filter((r) => c(r.range.countriesWithRecords)).map((r) => `${r.id} ${r.scientificName}`);
  if (names.length) console.log(`countries ${label}: ${names.join("; ")}`);
}
const tally = new Map<string, number>();
for (const e of entries) tally.set(`${e.kind} ${e.severity}`, (tally.get(`${e.kind} ${e.severity}`) ?? 0) + 1);
console.log(`entries ${entries.length}`);
for (const key of [...tally.keys()].sort(byText)) console.log(`  ${key} ${tally.get(key)}`);
