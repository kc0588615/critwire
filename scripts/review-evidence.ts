// Usage: pnpm review:evidence 2>> <log>. Read-only GBIF, COL and Wikidata lookups for the review queue, written all at once
// to data/review/presort/evidence.json after every request succeeded and the IUCN gate passed. Request log goes to stderr.
import { mkdir } from "node:fs/promises";
import { readJson, writeJson } from "./json.ts";
import { readSnapshot, utcDate } from "./raw.ts";
import { assertEvidence, evidenceFile } from "./review/presort.ts";
import { fetchEvidence } from "./review/evidence.ts";
import { mismatchesFile, speciesFile, type Mismatch, type Species } from "./species.ts";

if (process.argv.length > 2) throw new Error(`unexpected arguments: ${process.argv.slice(2).join(" ")}`);

const [queue, species, gbif, col, wikidata] = await Promise.all([
  readJson<Mismatch[]>(mismatchesFile),
  readJson<Species[]>(speciesFile),
  readSnapshot("gbif"),
  readSnapshot("col"),
  readSnapshot("wikidata"),
]);
const evidence = await fetchEvidence(queue, { gbif, col, wikidata }, species, utcDate());
assertEvidence(evidence, gbif);
await mkdir(new URL(".", evidenceFile), { recursive: true });
await writeJson(evidenceFile, evidence, { canonical: true });
const moved = evidence.entries.filter((e) => e.gbif && e.gbif.count !== (e.entry.values["gbif"] as { records?: number }).records).length;
console.log(`review:evidence: ${evidence.entries.length} entries, ${evidence.entries.filter((e) => e.gbif).length} with GBIF queries, ` +
  `${moved} live counts differ from the queue, ${Object.keys(evidence.datasets).length} datasets, ${Object.keys(evidence.organizations).length} publishers, ` +
  `${Object.keys(evidence.col).length} COL ids, ${Object.keys(evidence.gbifSpecies).length} GBIF species, ${evidence.wikidata.statements.length} Wikidata statements`);
