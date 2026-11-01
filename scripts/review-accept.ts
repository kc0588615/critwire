// Usage: pnpm review:accept (--confidence high|medium|low | --ids 25:DE,25:RU) [--confirm-only]. The owner's word only.
// Copies the chosen proposals into data/review/country-overrides.json and runs pnpm derive. Every check runs before any
// write; the exact pre-run bytes stay in the backup until derive has exited 0 (mission plan 2026-11-01-critwire-review-presort, Q5).
// The backup is claimed atomically, so two runs at once can't lose an override (A14-A16).
import { spawnSync } from "node:child_process";
import { readFile, unlink } from "node:fs/promises";
import { parseOverrides } from "./derive/countries.ts";
import { assertDerivedFiles, deriveAll, readDeriveInputs } from "./derive/pipeline.ts";
import { formatJson, readJson, readOptionalText, writeJson } from "./json.ts";
import { backupFile, countryChanges, flagDrift, mergeOverrides, parseAcceptArgs, RECOVERY, selectProposals, UNFINISHED_ACCEPT, UsageError, type AcceptArgs } from "./review/accept.ts";
import { claimBackup } from "./review/io.ts";
import {
  assertEvidence, assertRecommendations, evidenceFile, OUTPUT_CHANGE_FOLLOW_ON, proposalFile, proposalOf, recommendationsFile,
  type Evidence, type Recommendation,
} from "./review/presort.ts";
import { overridesFile, type CountryOverride } from "./species.ts";

let args: AcceptArgs;
try {
  args = parseAcceptArgs(process.argv.slice(2));
} catch (e) {
  if (!(e instanceof UsageError)) throw e;
  console.error(e.message);
  process.exit(2);
}
if ((await readOptionalText(backupFile)) !== null) throw new Error(UNFINISHED_ACCEPT);

const [proposalText, recommendations, evidence, currentText, read] = await Promise.all([
  readFile(proposalFile, "utf8"),
  readJson<Recommendation[]>(recommendationsFile),
  readJson<Evidence>(evidenceFile),
  readFile(overridesFile, "utf8"),
  readDeriveInputs(),
]);
// One read of the overrides: the merge must start from the very bytes claimBackup compares.
const inputs = { ...read, overrides: JSON.parse(currentText) as unknown };
assertEvidence(evidence, inputs.gbif);
assertRecommendations(recommendations, evidence);
if (proposalText !== formatJson(proposalOf(recommendations))) throw new Error("country-overrides.proposed.json isn't recommendations.json's: run pnpm review:presort");
const speciesIds = new Set(inputs.base.map((s) => s.id));
parseOverrides(JSON.parse(proposalText), speciesIds);

const selected = selectProposals(args, recommendations, evidence);
const before = deriveAll(inputs);
await assertDerivedFiles(before);

const { merged, added, skipped } = mergeOverrides(parseOverrides(inputs.overrides, speciesIds), selected);
const keys = (list: readonly CountryOverride[]) => list.map((o) => `${o.speciesId}:${o.country}`).join(",");
if (added.length === 0) {
  console.log(`already accepted: ${keys(skipped)}`);
  process.exit(0);
}
const { moved, totalMoved } = flagDrift(added, evidence, before.entries);
if (moved.length) throw new Error(moved.map((key) => `${key}: the flag moved since the evidence was gathered: re-run pnpm review:evidence`).join("\n"));
for (const key of totalMoved) console.warn(`warning: ${key}: the species' total moved since the evidence was gathered; the flag is the same`);

const after = deriveAll({ ...inputs, overrides: merged });
const changes = countryChanges(before.records, after.records);

await claimBackup(backupFile, overridesFile, currentText);
await writeJson(overridesFile, merged);
const derive = spawnSync("pnpm", ["derive"], { cwd: new URL("..", import.meta.url), stdio: "inherit" });
if (derive.status !== 0) {
  throw new Error(`pnpm derive failed (${derive.error?.message ?? derive.signal ?? `exit ${derive.status}`}): the overrides are written, the derived files may be part-written.\n${RECOVERY}`);
}
await unlink(backupFile);

console.log(`accepted ${added.length}: ${keys(added)}`);
if (skipped.length) console.log(`already settled ${skipped.length}: ${keys(skipped)}`);
for (const { speciesId, added: gained, removed } of changes) {
  console.log(`species ${speciesId}: ${[gained.length ? `added ${gained.join(",")}` : "", removed.length ? `removed ${removed.join(",")}` : ""].filter(Boolean).join("; ")}`);
}
if (changes.length) console.log(`Published countries changed: plain pnpm build, so deploy, refuses ("lab <id> is stale") ${OUTPUT_CHANGE_FOLLOW_ON}.`);
