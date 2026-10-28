// Derives data/species.json, data/review/mismatches.json, data/gbif-derived-dataset/contributions.json,
// data/countries.json and data/gbif-learn-sample/contributions.json from data/base.json, data/raw/ (gbif-sample
// included), data/review/country-overrides.json and both targets' registration.json (plan §5, D7; derive/pipeline.ts). Validates every input and computes everything before writing any file.
// Usage: pnpm derive
import { mkdir } from "node:fs/promises";
import { formatJson, writeJson } from "./json.ts";
import { deriveAll, derivedFiles, readDeriveInputs } from "./derive/pipeline.ts";
import { contributionsSha256, depositTag } from "./gbif/derived-dataset.ts";
import { TARGETS } from "./gbif/targets.ts";

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

const inputs = await readDeriveInputs();
const result = deriveAll(inputs);
for (const { file, value, canonical } of derivedFiles(result)) {
  await mkdir(new URL(".", file), { recursive: true });
  await writeJson(file, value, { canonical });
}
const { records, entries, contributions, doi, countries: { rows: countryRows }, countriesReport: cr, learn } = result;

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
const list = (codes: string[]) => (codes.length ? codes.join(", ") : "none");
console.log(`countries.json rows ${countryRows.length} (map_units: ${list(cr.fromMapUnits)})`);
console.log(`  folded ${cr.folded.map((f) => `${f.code} kept ${f.kept}, dropped ${f.dropped.join(", ")}`).join("; ") || "none"}`);
console.log(`  vs GBIF enumeration: not in GBIF ${list(cr.notInGbif)}; GBIF not in rows ${list(cr.gbifNotInRows)}`);
console.log(`gbif contributions: taxa ${contributions.taxa.length}, datasets ${Object.keys(contributions.datasets).length}, records ${contributions.records}`);
if (doi !== null) {
  console.log(`DOI current ${doi}`);
} else {
  const tag = depositTag(TARGETS.countries.tagPrefix, contributionsSha256(formatJson(contributions, { canonical: true })));
  console.log(`DOI ${inputs.registration === null ? "missing" : "stale"}: commit, push, push tag ${tag}, then pnpm gbif:register`);
}
const lc = learn.contributions;
console.log(`learn-sample: download ${lc.downloadKey} (${lc.originalDownloadDoi}), records ${lc.records}, datasets ${learn.datasets.length}, ` +
  `country_code NULL ${learn.occurrences.filter((o) => o.country_code === null).length}`);
if (learn.doi !== null) {
  console.log(`learn-sample DOI current ${learn.doi}`);
} else {
  const tag = depositTag(TARGETS["learn-sample"].tagPrefix, contributionsSha256(formatJson(lc, { canonical: true })));
  console.log(`learn-sample DOI ${inputs.learn.registration === null ? "missing" : "stale"}: commit, push, push tag ${tag}, ` +
    "then pnpm gbif:register --target learn-sample");
}
