// Derives data/species.json and data/review/mismatches.json from data/base.json, data/raw/ and
// data/review/country-overrides.json (plan §5; derive/pipeline.ts). Validates every input and computes everything
// before writing either file.
// Usage: pnpm derive
import { writeJson } from "./json.ts";
import { deriveAll, derivedFiles, readDeriveInputs } from "./derive/pipeline.ts";

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const result = deriveAll(await readDeriveInputs());
for (const { file, value } of derivedFiles(result)) await writeJson(file, value);
const { records, entries } = result;

// Summary for the PR body.
const n = records.length;
console.log(`species ${n}`);
for (const f of ["gbif", "col", "wikidata", "inaturalist", "ncbi"] as const) {
  console.log(`ids.${f} ${records.filter((r) => r.ids[f] !== null).length}/${n}`);
}
console.log(`taxonomy from COL ${records.filter((r) => r.sources.some((s) => s.source === "Catalogue of Life" && s.fields.includes("taxonomy"))).length}/${n}`);
const countries = records.map((r) => r.range.countriesWithOpenRecords);
console.log(`countries: listed ${countries.filter((c) => c !== null).length}, codes ${countries.reduce((a, c) => a + (c?.length ?? 0), 0)}`);
for (const status of ["no-open-records", "identity-unsettled"] as const) {
  const names = records.filter((r) => r.range.status === status).map((r) => `${r.id} ${r.scientificName}`);
  console.log(`countries ${status} ${names.length}${names.length ? `: ${names.join("; ")}` : ""}`);
}
const tally = new Map<string, number>();
for (const e of entries) tally.set(`${e.kind} ${e.severity}`, (tally.get(`${e.kind} ${e.severity}`) ?? 0) + 1);
console.log(`entries ${entries.length}`);
for (const key of [...tally.keys()].sort(byText)) console.log(`  ${key} ${tally.get(key)}`);
