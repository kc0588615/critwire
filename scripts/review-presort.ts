// Usage: pnpm review:presort [--check]. Offline: validates the evidence and the agents' recommendations against the queue,
// then writes plans/005-review-presort.md and data/review/country-overrides.proposed.json. --check writes nothing; it is the
// coverage script: every key has a recommendation, both files are fresh, and each key has one entry heading in 005.
import { fileURLToPath } from "node:url";
import { formatJson, readJson, readOptionalText, writeJson } from "./json.ts";
import { readSnapshot } from "./raw.ts";
import { writeText } from "./review/io.ts";
import {
  assertEvidence, assertQueue, assertRecommendations, CONFIDENCES, evidenceFile, presortPlanFile, proposalFile, proposalOf, recommendationsFile,
  type Evidence, type Recommendation,
} from "./review/presort.ts";
import { headingKeys, presortCounts, renderPresort } from "./review/render.ts";
import { mismatchesFile, speciesFile, type Mismatch, type Species } from "./species.ts";

const args = process.argv.slice(2);
if (args.some((a) => a !== "--check")) throw new Error(`usage: pnpm review:presort [--check]; got ${args.join(" ")}`);
const check = args.length > 0;

const [queue, evidence, recommendations, species, gbif, col, wikidata] = await Promise.all([
  readJson<Mismatch[]>(mismatchesFile),
  readJson<Evidence>(evidenceFile),
  readJson<Recommendation[]>(recommendationsFile),
  readJson<Species[]>(speciesFile),
  readSnapshot("gbif"),
  readSnapshot("col"),
  readSnapshot("wikidata"),
]);
assertQueue(evidence, queue);
assertEvidence(evidence, gbif);
assertRecommendations(recommendations, evidence, { complete: check });

const plan = renderPresort({ evidence, recommendations, species, snapshots: { gbif, col, wikidata } });
const proposal = proposalOf(recommendations);

if (check) {
  for (const [url, text] of [[presortPlanFile, plan], [proposalFile, formatJson(proposal)]] as const) {
    if ((await readOptionalText(url)) !== text) throw new Error(`${fileURLToPath(url)} is stale: run pnpm review:presort`);
  }
  const headings = headingKeys(plan).sort();
  const keys = evidence.entries.map((e) => e.key).sort();
  if (headings.join() !== keys.join()) throw new Error("005: entry headings aren't exactly one per key");
} else {
  await writeText(presortPlanFile, plan);
  await writeJson(proposalFile, proposal);
}

const { rows, pending, total } = presortCounts(evidence, recommendations);
console.log(`review:presort: ${total} entries, ${pending} pending, ${proposal.length} proposals${check ? ", 005 and the proposal are fresh, one heading per key" : ""}`);
console.log(`  ${"".padEnd(10)}${CONFIDENCES.map((c) => c.padStart(7)).join("")}${"total".padStart(7)}${"changes".padStart(9)}`);
for (const r of rows) console.log(`  ${r.name.padEnd(10)}${CONFIDENCES.map((c) => String(r.byConfidence[c]).padStart(7)).join("")}${String(r.total).padStart(7)}${String(r.changes ?? "n/a").padStart(9)}`);
