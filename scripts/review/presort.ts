// Review presort core (mission plan 2026-11-01-critwire-review-presort, Q1–Q4): the presort files, entry keys, and the
// checks review:presort and review:accept run on the evidence and the agents' recommendations. Pure: no fs, no network.
// Derive and build never read any of this (P9 in presort.test.ts).
import { isDeepStrictEqual } from "node:util";
import { assertNoIucnData, gbifTaxonKey, type GbifSnapshot, type Snapshots, type SparqlBinding } from "../raw.ts";
import type { CountryOverride, Mismatch } from "../species.ts";

export const evidenceFile = new URL("../../data/review/presort/evidence.json", import.meta.url);
export const recommendationsFile = new URL("../../data/review/presort/recommendations.json", import.meta.url);
export const proposalFile = new URL("../../data/review/country-overrides.proposed.json", import.meta.url);
export const presortPlanFile = new URL("../../plans/005-review-presort.md", import.meta.url);

export interface FacetEvidence { counts: { name: string; count: number }[]; truncated: boolean }
// One occurrence, cut to the allowlist (Q1): GBIF's IUCN category and recordedBy never enter.
export interface GbifRecord {
  key: number;
  datasetKey: string;
  license: string;
  basisOfRecord: string;
  institutionCode?: string | null;
  year?: number | null;
  month?: number | null;
  decimalLatitude?: number | null;
  decimalLongitude?: number | null;
  coordinateUncertaintyInMeters?: number | null;
  stateProvince?: string | null;
  locality?: string | null;
  establishmentMeans?: string | null;
  degreeOfEstablishment?: string | null;
  issues?: string[];
  occurrenceRemarks?: string | null;
}
// One country entry's query: derive's taxon and filters plus country; facets by query parameter name (datasetKey, …).
export interface GbifEvidence { taxonKey: number; url: string; count: number; facets: Record<string, FacetEvidence>; records: GbifRecord[] }
export interface EvidenceItem { key: string; entry: Mismatch; gbif: GbifEvidence | null }
export interface DatasetEvidence { title: string | null; type: string | null; license: string | null; doi: string | null; publishingOrganizationKey: string | null }
export interface ColDistribution { area: string | null; globalId: string | null; gazetteer: string | null; establishmentMeans: string | null }
export interface ColEvidence {
  name?: string | null;
  rank?: string | null;
  status?: string | null;
  accepted?: { id: string; name: string } | null;
  distributions?: ColDistribution[];
}
export interface GbifSpeciesEvidence { key: number; scientificName: string; rank: string; taxonomicStatus: string; acceptedKey?: number; accepted?: string }
// Label-free (Q1): items, values and references stay Q-ids or literals.
export interface WikidataStatement {
  item: string;
  property: string;
  value: string;
  rank: string;
  country?: string | null;
  references: { statedIn?: string | null; retrieved?: string | null }[];
}
export interface Evidence {
  retrieved: string;
  sources: ({ source: string; license: string; url: string } & Record<string, unknown>)[];
  entries: EvidenceItem[];
  datasets: Record<string, DatasetEvidence>;
  organizations: Record<string, { title: string | null }>;
  col: Record<string, ColEvidence>;
  gbifSpecies: Record<string, GbifSpeciesEvidence>;
  wikidata: { query: string; statements: WikidataStatement[] };
}

export type Confidence = "high" | "medium" | "low";
export const CONFIDENCES: readonly Confidence[] = ["high", "medium", "low"];
// A country entry's recommendation is keep or remove; any other kind's is its fix text, or NO_ACTION.
export interface Recommendation { key: string; recommendation: string; confidence: Confidence; reason: string; cite: string[] }
export const NO_ACTION = "no action";

const EVIDENCE_KEYS = ["col", "datasets", "entries", "gbifSpecies", "organizations", "retrieved", "sources", "wikidata"];
const ITEM_KEYS = ["entry", "gbif", "key"];
const RECOMMENDATION_KEYS = ["cite", "confidence", "key", "reason", "recommendation"];
// The fetched sections the IUCN gate covers; entries[].key and entries[].entry are our own queue's words (Q1).
const FETCHED_SECTIONS = ["sources", "datasets", "organizations", "col", "gbifSpecies", "wikidata"] as const;
const DATASET_FACET = "datasetKey";
const REASON_MAX = 300;

export function isCountryEntry(entry: Mismatch): boolean {
  return entry.kind === "country-captive-suspect" || entry.kind === "country-borderline";
}

// <speciesId>:<CC> for a country entry (the pair parseOverrides keeps unique), else <speciesId>:<field>:<kind>.
export function entryKey(entry: Mismatch): string {
  if (!isCountryEntry(entry)) return `${entry.speciesId}:${entry.field}:${entry.kind}`;
  if (typeof entry.country !== "string") throw new Error(`species ${entry.speciesId}: ${entry.kind} entry without a country`);
  return `${entry.speciesId}:${entry.country}`;
}

const values = (entry: Mismatch, source: string) => entry.values[source] as Record<string, unknown> | string | string[] | number[] | undefined;

// The COL ids a non-country ids.col entry is about: derive's, its accepted name, Wikidata's, or the name match's usage.
export function colIdsOf(entry: Mismatch, snapshots: Pick<Snapshots, "col">): string[] {
  if (entry.field !== "ids.col") return [];
  if (entry.kind === "not-found") {
    const id = snapshots.col.matches[entry.scientificName]?.response.usage?.id;
    if (!id) throw new Error(`col: ${entryKey(entry)}: no usage in the snapshot's match`);
    return [id];
  }
  if (entry.kind !== "identity") return [];
  const col = values(entry, "col") as string | { id: string; accepted?: { id: string } };
  const wikidata = (values(entry, "wikidata") ?? []) as string[];
  return typeof col === "string" ? [col, ...wikidata] : [col.id, ...(col.accepted ? [col.accepted.id] : []), ...wikidata];
}

// The GBIF keys a non-country ids.gbif entry is about: both sides of an identity conflict, or a variant match's usage.
export function gbifKeysOf(entry: Mismatch, snapshots: Pick<Snapshots, "gbif">): number[] {
  if (entry.field !== "ids.gbif") return [];
  if (entry.kind === "identity") return [(values(entry, "gbif") as { usageKey: number }).usageKey, ...(values(entry, "wikidata") as number[])];
  if (entry.kind !== "not-found") return [];
  const key = snapshots.gbif.species[entry.scientificName]?.match.response.usage?.key;
  if (!key) throw new Error(`gbif: ${entryKey(entry)}: no usage in the snapshot's match`);
  return [Number(key)];
}

export const qid = (iri: string) => iri.slice(iri.lastIndexOf("/") + 1);

// The Wikidata items an entry is about: the species' in the snapshot, plus any other taxon holding its base id.
export function wikidataItemsOf(entry: Mismatch, byName: ReadonlyMap<string, readonly SparqlBinding[]>): string[] {
  const items = (byName.get(entry.scientificName) ?? []).flatMap((b) => (b.item ? [qid(b.item.value)] : []));
  return [...new Set([...items, ...Object.keys((entry.values["wikidataItemsWithBaseId"] ?? {}) as object)])];
}

// Entries by key; throws on a repeated key.
export function indexEntries(entries: readonly Mismatch[]): Map<string, Mismatch> {
  const index = new Map<string, Mismatch>();
  for (const e of entries) {
    const key = entryKey(e);
    if (index.has(key)) throw new Error(`review: repeated key ${key}`);
    index.set(key, e);
  }
  return index;
}

// What derive publishes with no override: an excluded stray (blocking captive-suspect) is removed, the rest kept.
export function statusQuo(entry: Mismatch): "keep" | "remove" {
  if (!isCountryEntry(entry)) throw new Error(`${entryKey(entry)}: not a country entry`);
  return entry.kind === "country-captive-suspect" && entry.severity === "blocking" ? "remove" : "keep";
}

// What an output-changing override costs (Q6): plain pnpm build, so deploy, refuses "lab <id> is stale" <this>.
export const OUTPUT_CHANGE_FOLLOW_ON = "until `pnpm build --draft && pnpm learn:check --update`. Changed results then need 004, `checked/`, `e2e/__snapshots__/` and the prose numbers changed in one commit, then `pnpm build`, `pnpm e2e` and the deploy: a separate unit of about 1–2 h";

export function changesOutput(entry: Mismatch, action: "keep" | "remove"): boolean {
  return action !== statusQuo(entry);
}

// A country entry without what may move while its flag stands (A8): the reason's words and the species' total.
function flagOf({ reason, values, ...flag }: Mismatch): unknown {
  const { speciesRecords, ...gbif } = values["gbif"] as Record<string, unknown>;
  return { ...flag, values: { ...values, gbif } };
}

// Whether two country entries are the same flag: everything but the reason and speciesRecords.
export function sameFlag(a: Mismatch, b: Mismatch): boolean {
  return isDeepStrictEqual(flagOf(a), flagOf(b));
}

// The entry's counted records in its country (derive's values.gbif.records).
function entryRecords(entry: Mismatch): number | undefined {
  return (entry.values["gbif"] as { records?: number } | undefined)?.records;
}

const fail = (what: string, problems: string[]): void => {
  if (problems.length) throw new Error(`${what}: ${problems.length} problem(s):\n- ${problems.join("\n- ")}`);
};

const sameKeys = (value: object, keys: readonly string[]) => Object.keys(value).sort().join() === keys.join();

// Throws unless the evidence was gathered for exactly this queue (entries deep-equal, same order).
export function assertQueue(evidence: Evidence, queue: readonly Mismatch[]): void {
  if (!isDeepStrictEqual(evidence.entries.map((e) => e.entry), queue)) throw new Error("queue changed: re-run pnpm review:evidence");
}

// Throws, listing every problem, unless the evidence is well-formed: exact keys, each item keyed by entryKey (unique),
// a gbif section exactly on country entries with the snapshot's taxon key, and no IUCN data in the fetched sections.
export function assertEvidence(evidence: Evidence, gbif: GbifSnapshot): void {
  const problems: string[] = [];
  if (!sameKeys(evidence, EVIDENCE_KEYS)) problems.push(`evidence keys must be exactly ${EVIDENCE_KEYS.join(", ")}`);
  try {
    indexEntries(evidence.entries.map((e) => e.entry));
  } catch (e) {
    problems.push((e as Error).message);
  }
  evidence.entries.forEach((item, i) => {
    if (!sameKeys(item, ITEM_KEYS)) problems.push(`entries[${i}] keys must be exactly ${ITEM_KEYS.join(", ")}`);
    const key = entryKey(item.entry);
    if (item.key !== key) problems.push(`evidence key ${item.key} isn't ${key}`);
    if (!isCountryEntry(item.entry)) {
      if (item.gbif !== null) problems.push(`${key}: only country entries have a gbif section`);
      return;
    }
    if (item.gbif === null) return void problems.push(`${key}: a country entry needs a gbif section`);
    const match = gbif.species[item.entry.scientificName]?.match.response;
    if (!match) return void problems.push(`${key}: ${item.entry.scientificName} isn't in the GBIF snapshot: re-run pnpm review:evidence`);
    const snapshotKey = gbifTaxonKey(match);
    if (item.gbif.taxonKey !== snapshotKey) problems.push(`${key}: taxon changed (${item.gbif.taxonKey}, snapshot ${snapshotKey}): re-run pnpm review:evidence`);
  });
  const gate = (value: unknown, path: string) => {
    try {
      assertNoIucnData(value, path);
    } catch (e) {
      problems.push((e as Error).message);
    }
  };
  gate(evidence.retrieved, "$.retrieved");
  evidence.entries.forEach((item, i) => gate(item.gbif, `$.entries[${i}].gbif`));
  for (const section of FETCHED_SECTIONS) gate(evidence[section], `$.${section}`);
  fail("evidence", problems);
}

// Whether a cite names something in the evidence for this item (Q2): occurrences and datasets of the entry's own query;
// GBIF species, COL ids and Wikidata Q-ids anywhere in their sections; "entry" is the flag's own values.
function resolves(cite: string, item: EvidenceItem, evidence: Evidence, wikidataIds: ReadonlySet<string>): boolean {
  if (cite === "entry") return true;
  const [, kind, id] = /^(gbif:occurrence|gbif:dataset|gbif:species|col|wikidata):(.+)$/.exec(cite) ?? [];
  switch (kind) {
    case "gbif:occurrence": return item.gbif?.records.some((r) => String(r.key) === id) ?? false;
    case "gbif:dataset":
      return (item.gbif?.facets[DATASET_FACET]?.counts.some((c) => c.name === id) || item.gbif?.records.some((r) => r.datasetKey === id)) ?? false;
    case "gbif:species": return Object.hasOwn(evidence.gbifSpecies, id!);
    case "col": return Object.hasOwn(evidence.col, id!);
    case "wikidata": return wikidataIds.has(id!);
    default: return false;
  }
}

// Throws, listing every problem, unless the recommendations follow R2–R7 (and R1, every key once, when complete).
export function assertRecommendations(recs: readonly Recommendation[], evidence: Evidence, { complete = false } = {}): void {
  const problems: string[] = [];
  const items = new Map(evidence.entries.map((e) => [e.key, e]));
  const wikidataIds = new Set(evidence.wikidata.statements.flatMap((s) => [s.item, s.value, ...s.references.map((r) => r.statedIn ?? "")]).filter((v) => /^Q\d+$/.test(v)));
  const seen = new Set<string>();
  recs.forEach((rec, i) => {
    if (rec === null || typeof rec !== "object" || !sameKeys(rec, RECOMMENDATION_KEYS)) {
      return void problems.push(`recommendations[${i}]: keys must be exactly ${RECOMMENDATION_KEYS.join(", ")}`);
    }
    const { key } = rec;
    if (seen.has(key)) return void problems.push(`${key} is repeated`);
    seen.add(key);
    const item = items.get(key);
    if (!item) return void problems.push(`${key} is not in the evidence`);
    const country = isCountryEntry(item.entry);
    const action = rec.recommendation;
    const isAction = action === "keep" || action === "remove";
    // R3
    if (country && !isAction) problems.push(`${key}: recommendation must be keep or remove, got ${JSON.stringify(action)}`);
    if (!country && isAction) problems.push(`${key}: keep/remove is for country entries; give the fix`);
    if (!country && (typeof action !== "string" || action.trim() === "")) problems.push(`${key}: the fix must be a non-empty string`);
    if (!CONFIDENCES.includes(rec.confidence)) problems.push(`${key}: confidence must be high, medium or low, got ${JSON.stringify(rec.confidence)}`);
    // R4
    const quo = country ? statusQuo(item.entry) : NO_ACTION;
    if (rec.confidence === "low" && action !== quo) problems.push(`${key}: low must be the status quo (${quo})`);
    // R6
    if (typeof rec.reason !== "string" || rec.reason.trim() === "" || rec.reason.length > REASON_MAX) problems.push(`${key}: reason must be 1–${REASON_MAX} characters`);
    // R2, R5
    if (!Array.isArray(rec.cite) || rec.cite.length === 0) problems.push(`${key}: needs at least one cite`);
    else {
      for (const c of rec.cite) if (typeof c !== "string" || !resolves(c, item, evidence, wikidataIds)) problems.push(`${key}: cite ${c} doesn't resolve`);
      if (country && rec.confidence !== "low" && !rec.cite.some((c) => /^gbif:(occurrence|dataset):/.test(c))) {
        problems.push(`${key}: ${rec.confidence} needs a gbif:occurrence or gbif:dataset cite`);
      }
    }
    // R7
    if (country && action === "remove" && rec.confidence === "high") {
      const g = item.gbif;
      const records = entryRecords(item.entry);
      if (!g) problems.push(`${key}: high remove needs complete coverage: no gbif section`);
      else {
        if (g.count !== records) problems.push(`${key}: high remove needs complete coverage: live count ${g.count} ≠ ${records} records`);
        const facet = g.facets[DATASET_FACET];
        if (!facet || facet.truncated) problems.push(`${key}: high remove needs complete coverage: ${DATASET_FACET} facet ${facet ? "truncated" : "missing"}`);
      }
    }
  });
  // R1
  if (complete) for (const key of items.keys()) if (!seen.has(key)) problems.push(`${key} has no recommendation`);
  fail("recommendations", problems);
}

// Sorts overrides by speciesId, then country.
export function byOverride(a: CountryOverride, b: CountryOverride): number {
  return a.speciesId - b.speciesId || (a.country < b.country ? -1 : a.country > b.country ? 1 : 0);
}

// The proposal (country-overrides.proposed.json): one override per country recommendation, in country-overrides.json's
// key order, sorted by speciesId, then country.
export function proposalOf(recs: readonly Recommendation[]): CountryOverride[] {
  return recs
    .filter((r) => r.recommendation === "keep" || r.recommendation === "remove")
    .map((r) => {
      const m = /^(\d+):([A-Z]{2})$/.exec(r.key);
      if (!m) throw new Error(`${r.key}: keep/remove on a non-country key`);
      return { speciesId: Number(m[1]), country: m[2]!, action: r.recommendation as CountryOverride["action"], reason: r.reason };
    })
    .sort(byOverride);
}
