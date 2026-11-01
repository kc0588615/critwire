// Accept core (mission plan 2026-11-01-critwire-review-presort, Q5): what pnpm review:accept selects and merges. Pure: no
// fs, no network. Only review:accept writes country-overrides.json, on the owner's word.
import { isDeepStrictEqual, parseArgs } from "node:util";
import type { CountryOverride, Mismatch, Species } from "../species.ts";
import { byOverride, changesOutput, CONFIDENCES, indexEntries, isCountryEntry, proposalOf, sameFlag, type Confidence, type Evidence, type Recommendation } from "./presort.ts";

// Untracked and not ignored, so git status shows an unfinished accept; exists only while an accept is writing.
export const backupFile = new URL("../../data/review/country-overrides.json.pre-accept", import.meta.url);

// The two ways out of an accept that didn't finish; both re-run derive from inputs, which is idempotent (docs/recovery.md).
export const RECOVERY = [
  "Undo: mv data/review/country-overrides.json.pre-accept data/review/country-overrides.json && pnpm derive",
  "Finish: pnpm derive && rm data/review/country-overrides.json.pre-accept",
].join("\n");

export const ACCEPT_USAGE = "usage: pnpm review:accept (--confidence high|medium|low | --ids 25:DE,25:RU) [--confirm-only]";

// A malformed command line (A1): the CLI prints it and exits 2.
export class UsageError extends Error {}

export type AcceptArgs = ({ confidence: Confidence } | { ids: string[] }) & { confirmOnly: boolean };

const usage = (problem: string) => new UsageError(`${problem}\n${ACCEPT_USAGE}`);

export function parseAcceptArgs(args: string[]): AcceptArgs {
  let values;
  try {
    ({ values } = parseArgs({
      args,
      options: { confidence: { type: "string", multiple: true }, ids: { type: "string", multiple: true }, "confirm-only": { type: "boolean" } },
      strict: true,
    }));
  } catch (e) {
    throw usage((e as Error).message);
  }
  const { confidence = [], ids = [] } = values;
  if (confidence.length + ids.length !== 1) throw usage("give exactly one of --confidence and --ids, once");
  const confirmOnly = values["confirm-only"] ?? false;
  if (ids[0] === undefined) {
    const level = CONFIDENCES.find((c) => c === confidence[0]);
    if (!level) throw usage(`--confidence must be high, medium or low, got ${JSON.stringify(confidence[0])}`);
    return { confidence: level, confirmOnly };
  }
  const keys = ids[0].split(",");
  if (keys.some((k) => !/^\S+$/.test(k))) throw usage(`--ids must be comma-separated keys, got ${JSON.stringify(ids[0])}`);
  return { ids: [...new Set(keys)], confirmOnly };
}

// The overrides the arguments choose. Each selector selects only what it says (Q5): no union, no intersection.
export function selectProposals(args: AcceptArgs, recs: readonly Recommendation[], evidence: Pick<Evidence, "entries">): CountryOverride[] {
  const entries = new Map(evidence.entries.map((e) => [e.key, e.entry]));
  const entryOf = (key: string) => {
    const entry = entries.get(key);
    if (!entry) throw new Error(`${key} is not in the evidence`);
    return entry;
  };
  let chosen: readonly Recommendation[];
  if ("ids" in args) {
    const byKey = new Map(recs.map((r) => [r.key, r]));
    chosen = args.ids.map((key) => {
      if (!isCountryEntry(entryOf(key))) throw new Error(`${key} is not an override; its fix is in 005`);
      const rec = byKey.get(key);
      if (!rec) throw new Error(`${key} has no recommendation`);
      return rec;
    });
  } else {
    const floor = CONFIDENCES.indexOf(args.confidence);
    chosen = recs.filter((r) => isCountryEntry(entryOf(r.key)) && CONFIDENCES.indexOf(r.confidence) <= floor);
  }
  if (args.confirmOnly) chosen = chosen.filter((r) => !changesOutput(entryOf(r.key), r.recommendation as CountryOverride["action"]));
  if (chosen.length === 0) throw new Error("nothing selected: no proposal matches those arguments");
  return proposalOf(chosen);
}

export interface MergedOverrides { merged: CountryOverride[]; added: CountryOverride[]; skipped: CountryOverride[] }

// The owner's entries keep their order and text; new ones are appended sorted. A pair already held with the same action
// is skipped (already settled, A11); with the other action it's a conflict (A7).
export function mergeOverrides(current: readonly CountryOverride[], selected: readonly CountryOverride[]): MergedOverrides {
  const held = new Map(current.map((o) => [`${o.speciesId}:${o.country}`, o]));
  const added: CountryOverride[] = [];
  const skipped: CountryOverride[] = [];
  for (const s of selected) {
    const key = `${s.speciesId}:${s.country}`;
    const have = held.get(key);
    if (!have) added.push(s);
    else if (have.action === s.action) skipped.push(s);
    else throw new Error(`${key}: conflict: country-overrides.json says ${have.action}, the proposal says ${s.action}`);
  }
  added.sort(byOverride);
  return { merged: [...current, ...added], added, skipped };
}

export interface FlagDrift { moved: string[]; totalMoved: string[] }

// How each override about to be added compares with what derive flags today: moved = the flag itself changed or is gone
// (A8, the presort is stale for it); totalMoved = only the species' total or the reason's words did.
export function flagDrift(added: readonly CountryOverride[], evidence: Pick<Evidence, "entries">, current: readonly Mismatch[]): FlagDrift {
  const gathered = new Map(evidence.entries.map((e) => [e.key, e.entry]));
  const today = indexEntries(current);
  const drift: FlagDrift = { moved: [], totalMoved: [] };
  for (const { speciesId, country } of added) {
    const key = `${speciesId}:${country}`;
    const was = gathered.get(key);
    const now = today.get(key);
    if (!was || !now || !sameFlag(was, now)) drift.moved.push(key);
    else if (!isDeepStrictEqual(was, now)) drift.totalMoved.push(key);
  }
  return drift;
}

export interface CountryChange { speciesId: number; added: string[]; removed: string[] }

// Per species, the published countries a merge adds and removes; a species with none is left out. Same species both sides.
export function countryChanges(before: readonly Species[], after: readonly Species[]): CountryChange[] {
  const afterById = new Map(after.map((s) => [s.id, s]));
  if (before.length !== after.length) {
    const missing = before.find((s) => !afterById.has(s.id));
    throw new Error(`countryChanges: species ${missing?.id ?? "set"} differs between before and after`);
  }
  return before.flatMap((s) => {
    const next = afterById.get(s.id);
    if (!next) throw new Error(`countryChanges: species ${s.id} differs between before and after`);
    const was = s.range.countriesWithOpenRecords ?? [];
    const now = next.range.countriesWithOpenRecords ?? [];
    const added = now.filter((c) => !was.includes(c));
    const removed = was.filter((c) => !now.includes(c));
    return added.length + removed.length > 0 ? [{ speciesId: s.id, added, removed }] : [];
  });
}
