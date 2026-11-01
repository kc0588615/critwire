// data/range-listings.json and data/review/range-conflicts.json (007, Data model), the derive pipeline's third half: what
// named open sources list about where each animal is native or introduced. Pure, like deriveSample. Separate from
// deriveCore so a stale listing snapshot never stops the function that makes species.json, or the ingests that repair it.
// Disagreements are shown, never fixed: both rows ship, and the conflict gets an entry.
import { isDeepStrictEqual } from "node:util";
import { CHECKLIST_ALLOWLIST, type ChecklistRole } from "../ingest/checklist-roles.ts";
import { isMammal, MDD_FILE } from "../ingest/mdd.ts";
import { readJson } from "../json.ts";
import { OPEN_LICENSES, type SampleLicense } from "../learn/sample-rules.ts";
import {
  assertBaseNames, assertNoIucnData, readSnapshot, staleSnapshot,
  type GbifChecklistRow, type GbifChecklistsSnapshot, type MddSnapshot,
} from "../raw.ts";
import type { BaseSpecies, Mismatch, Species } from "../species.ts";
import { MDD_PLACES } from "./mdd-places.ts";
import { parseCurated, rangeCuratedFile } from "./range-curated.ts";

export const rangeListingsFile = new URL("../../data/range-listings.json", import.meta.url);
export const rangeConflictsFile = new URL("../../data/review/range-conflicts.json", import.meta.url);

export const MDD_SOURCE = "Mammal Diversity Database";
export const CURATED_SOURCE = "critwire curated";
export const MDD_KEY = "mdd";
export const CURATED_KEY = "curated";

export type Origin = "native-or-pre-1500" | "native" | "introduced" | "uncertain";
export type Presence = "present" | "uncertain" | "absent" | "unstated";

// One row of /v1/range-listings: one claim a named source makes. Keys in the contract's order.
export interface RangeListing {
  speciesId: number;
  country: string;
  area: string | null;
  origin: Origin;
  presence: Presence;
  source: string;
  sourceKey: string;
  license: string;
  doi: string | null;
  url: string;
  sourceTerm: string;
}

export interface RangeListingsFile {
  sources: {
    gbifChecklists: { retrieved: string; datasets: { key: string; title: string; license: string; doi: string; citation: string; rows: number }[] };
    mdd: { retrieved: string; release: MddSnapshot["release"]; license: string; rows: number };
    curated: { rows: number };
  };
  rows: RangeListing[];
}

export interface ListingInputs { gbifChecklists: GbifChecklistsSnapshot; mdd: MddSnapshot; curated: unknown }

// What deriveListings reads of the core. records feed only the printed agreement, never a row.
export interface ListingCore {
  checklistKeys: Readonly<Record<string, readonly number[]>>;
  countries: { rows: readonly { code: string }[] };
  records: readonly Pick<Species, "id" | "range">[];
}

// What pnpm derive prints. excluded: reason → rows that yielded none; rows in = rows out + collapsed + excluded.
export interface ListingsReport {
  sources: { source: string; sourceKey: string; rows: number; species: number }[];
  collapsed: number;
  excluded: Record<string, number>;
  dropped: GbifChecklistsSnapshot["dropped"];
  agreement: { recordCountries: number; onListing: number; mddPresent: number; mddPresentWithRecords: number };
}

export interface ListingsResult { file: RangeListingsFile; conflicts: Mismatch[]; report: ListingsReport }

export async function readListingInputs(): Promise<ListingInputs> {
  return {
    gbifChecklists: await readSnapshot("gbif-checklists"),
    mdd: await readSnapshot("mdd"),
    curated: await readJson<unknown>(rangeCuratedFile),
  };
}

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const isOpen = (license: string) => (OPEN_LICENSES as readonly string[]).includes(license as SampleLicense);

// Throws unless the snapshot is what today's ingest would write for these keys: names, allowlist, keys, licenses, the
// guard, and every row on a dataset with both a role and metadata. Elapsed time never stales it.
export function assertGbifChecklistsFresh(snapshot: GbifChecklistsSnapshot, base: readonly BaseSpecies[], checklistKeys: ListingCore["checklistKeys"]): void {
  assertBaseNames("gbif-checklists", Object.keys(snapshot.species), base);
  if (!isDeepStrictEqual(snapshot.allowlist, CHECKLIST_ALLOWLIST)) throw staleSnapshot("gbif-checklists", "allowlist");
  for (const { scientificName: name } of base) {
    if (!isDeepStrictEqual(snapshot.species[name].keys, checklistKeys[name])) throw staleSnapshot("gbif-checklists", `${name}: keys`);
  }
  for (const [key, { license }] of Object.entries(snapshot.datasets)) {
    if (!isOpen(license)) throw new Error(`data/raw/gbif-checklists: dataset ${key}: license ${JSON.stringify(license)} isn't CC0 1.0 or CC BY 4.0`);
    if (!Object.hasOwn(snapshot.allowlist, key)) throw new Error(`data/raw/gbif-checklists: dataset ${key} has metadata but no role`);
  }
  for (const [name, { rows }] of Object.entries(snapshot.species)) {
    for (const { datasetKey } of rows) {
      if (!Object.hasOwn(snapshot.allowlist, datasetKey) || !Object.hasOwn(snapshot.datasets, datasetKey)) {
        throw new Error(`data/raw/gbif-checklists: ${name}: a row on dataset ${datasetKey}, which has no role or no metadata`);
      }
    }
  }
  assertNoIucnData(snapshot);
}

// Throws unless the snapshot is the pinned file's, on the base's mammals, with an open license, and passes the guard.
// A new release's version fails later, at mddCitation, which names MDD_CITATIONS.
export function assertMddFresh(snapshot: MddSnapshot, base: readonly BaseSpecies[]): void {
  assertBaseNames("mdd", Object.keys(snapshot.species), base.filter(isMammal));
  if (!isDeepStrictEqual(snapshot.file, MDD_FILE)) throw staleSnapshot("mdd", "pin");
  if (!isOpen(snapshot.license)) throw new Error(`data/raw/mdd: license ${JSON.stringify(snapshot.license)} isn't CC0 1.0 or CC BY 4.0`);
  assertNoIucnData(snapshot);
}

// 007's * line: a status → presence. Blank is the empty key.
const STATUS_PRESENCE: Readonly<Record<string, Presence>> = {
  PRESENT: "present", COMMON: "present", RARE: "present", IRREGULAR: "present", DETECTED: "present",
  DOUBTFUL: "uncertain", ABSENT: "absent", "": "unstated",
};
const NO_ROW_STATUSES: ReadonlySet<string> = new Set(["EXCLUDED", "NOT_DETECTED"]);
const INTRODUCED_MEANS: ReadonlySet<string> = new Set(["INTRODUCED", "NATURALISED", "INVASIVE"]);
const ALL_MEANS: ReadonlySet<string> = new Set([...INTRODUCED_MEANS, "UNCERTAIN", "NATIVE", "MANAGED", ""]);

export type ChecklistMapped = { origin: Origin; presence: Presence; sourceTerm: string } | { excluded: string };

// 007's mapping, first match wins. Any other value refuses, naming the row, whatever its other fields say.
export function mapChecklistRow({ datasetKey, country, establishmentMeans, status }: GbifChecklistRow, role: ChecklistRole, name: string): ChecklistMapped {
  const means = establishmentMeans ?? "";
  const state = status ?? "";
  if (!ALL_MEANS.has(means) || !(Object.hasOwn(STATUS_PRESENCE, state) || NO_ROW_STATUSES.has(state))) {
    throw new Error(`range listings: ${name}: dataset ${datasetKey}, country ${country}: means ${JSON.stringify(establishmentMeans)}, status ${JSON.stringify(status)} are off 007's mapping`);
  }
  if (country === null) return { excluded: "no country" };
  if (NO_ROW_STATUSES.has(state)) return { excluded: "status EXCLUDED or NOT_DETECTED" };
  if (means === "MANAGED") return { excluded: "means MANAGED" };
  const presence = STATUS_PRESENCE[state];
  const claim = (origin: Origin, p = presence) => ({ origin, presence: p, sourceTerm: `${means || "-"}/${state || "-"}` });
  if (INTRODUCED_MEANS.has(means)) return claim("introduced");
  if (means === "UNCERTAIN") return claim("uncertain");
  if (role === "register") return means === "" ? claim("introduced") : { excluded: "register says NATIVE" };
  if (means === "") return { excluded: "checklist says no origin" };
  return presence === "absent" ? claim("native") : { excluded: "checklist says NATIVE, not absent: one native authority" };
}

export type MddMapped = { code: string; area: string | null; origin: Origin; presence: Presence; sourceTerm: string } | { excluded: string };

// One token of MDD's country cell. A trailing ? is MDD's "uncertainly present or possibly extinct".
export function mapMddPlace(token: string, name: string): MddMapped {
  const uncertain = token.endsWith("?");
  const place = uncertain ? token.slice(0, -1) : token;
  if (!Object.hasOwn(MDD_PLACES, place)) throw new Error(`range listings: ${name}: MDD place ${JSON.stringify(token)} isn't in MDD_PLACES`);
  const mapped = MDD_PLACES[place];
  if (mapped.code === null) return { excluded: "MDD token that isn't a place" };
  return { code: mapped.code, area: mapped.area, origin: "native-or-pre-1500", presence: uncertain ? "uncertain" : "present", sourceTerm: token };
}

// The docs page's conflict query, in code: on area-null rows of one species and country, a native claim against an
// introduced one, or present against absent. uncertain and unstated contradict nothing. Rows in the file's key order,
// so each cell's claims are too. The E2E proves this and the served SQL return the same set.
export type ConflictRow = Pick<RangeListing, "speciesId" | "country" | "area" | "origin" | "presence" | "sourceKey">;
export interface RangeConflict { speciesId: number; country: string; claims: Pick<RangeListing, "sourceKey" | "origin" | "presence">[] }
export function rangeConflicts(rows: readonly ConflictRow[]): RangeConflict[] {
  const cells = new Map<string, RangeConflict>();
  for (const { speciesId, country, area, origin, presence, sourceKey } of rows) {
    if (area !== null) continue;
    const key = `${speciesId} ${country}`;
    if (!cells.has(key)) cells.set(key, { speciesId, country, claims: [] });
    cells.get(key)!.claims.push({ sourceKey, origin, presence });
  }
  return [...cells.values()].filter(({ claims }) => {
    const has = (test: (c: RangeConflict["claims"][number]) => boolean) => claims.some(test);
    return (has((c) => c.origin.startsWith("native")) && has((c) => c.origin === "introduced"))
      || (has((c) => c.presence === "present") && has((c) => c.presence === "absent"));
  });
}

function byListing(a: RangeListing, b: RangeListing): number {
  return a.speciesId - b.speciesId || byText(a.country, b.country)
    || (a.area === b.area ? 0 : a.area === null ? -1 : b.area === null ? 1 : byText(a.area, b.area))
    || byText(a.origin, b.origin) || byText(a.presence, b.presence) || byText(a.sourceKey, b.sourceKey);
}

// A row before collapse. rank: the lowest gives url and sourceTerm when rows share a key (a source's taxon key; 0 elsewhere).
interface Candidate { name: string; row: RangeListing; rank: number }

// Same key, one row: the lowest rank, then the lowest sourceTerm, so the input's order doesn't matter.
function collapse(candidates: Candidate[]): RangeListing[] {
  const sorted = [...candidates].sort((a, b) => byListing(a.row, b.row) || a.rank - b.rank || byText(a.row.sourceTerm, b.row.sourceTerm));
  return sorted.filter(({ row }, i) => i === 0 || byListing(sorted[i - 1].row, row) !== 0).map(({ row }) => row);
}

const ofSource = (rows: readonly RangeListing[], key: string) => rows.filter((r) => r.sourceKey === key);
function sourceCount(source: string, sourceKey: string, rows: readonly RangeListing[]): ListingsReport["sources"][number] {
  const own = ofSource(rows, sourceKey);
  return { source, sourceKey, rows: own.length, species: new Set(own.map((r) => r.speciesId)).size };
}

function agreement(records: ListingCore["records"], rows: readonly RangeListing[]): ListingsReport["agreement"] {
  const pair = (id: number, code: string) => `${id} ${code}`;
  const recordPairs = records.flatMap((r) => (r.range.countriesWithOpenRecords ?? []).map((code) => pair(r.id, code)));
  const listed = new Set(rows.map((r) => pair(r.speciesId, r.country)));
  const recorded = new Set(recordPairs);
  const mddPresent = rows.filter((r) => r.sourceKey === MDD_KEY && r.presence === "present");
  return {
    recordCountries: recordPairs.length,
    onListing: recordPairs.filter((p) => listed.has(p)).length,
    mddPresent: mddPresent.length,
    mddPresentWithRecords: mddPresent.filter((r) => recorded.has(pair(r.speciesId, r.country))).length,
  };
}

// Freshness and guard on both snapshots → curated → map every source → every code against countries → collapse, sort →
// conflicts, not-found → guard on the rows. Each thing that yields no row is counted by its reason.
export function deriveListings({ base, core, listings }: { base: readonly BaseSpecies[]; core: ListingCore; listings: ListingInputs }): ListingsResult {
  const { gbifChecklists: checklists, mdd } = listings;
  assertGbifChecklistsFresh(checklists, base, core.checklistKeys);
  assertMddFresh(mdd, base);
  const curated = parseCurated(listings.curated, base);

  const excluded: Record<string, number> = {};
  const exclude = (reason: string) => { excluded[reason] = (excluded[reason] ?? 0) + 1; };
  const candidates: Candidate[] = [];

  for (const s of base) {
    for (const row of checklists.species[s.scientificName].rows) {
      const { role, area } = checklists.allowlist[row.datasetKey];
      const mapped = mapChecklistRow(row, role, s.scientificName);
      if ("excluded" in mapped) { exclude(mapped.excluded); continue; }
      const { title, license, doi } = checklists.datasets[row.datasetKey];
      candidates.push({ name: s.scientificName, rank: row.sourceTaxonKey, row: {
        speciesId: s.id, country: row.country!, area, origin: mapped.origin, presence: mapped.presence, source: title, sourceKey: row.datasetKey,
        license, doi, url: `https://www.gbif.org/species/${row.sourceTaxonKey}`, sourceTerm: mapped.sourceTerm,
      } });
    }
    const cell = isMammal(s) ? mdd.species[s.scientificName] : null;
    for (const token of cell?.places ? cell.places.split("|") : []) {
      const mapped = mapMddPlace(token, s.scientificName);
      if ("excluded" in mapped) { exclude(mapped.excluded); continue; }
      candidates.push({ name: s.scientificName, rank: 0, row: {
        speciesId: s.id, country: mapped.code, area: mapped.area, origin: mapped.origin, presence: mapped.presence, source: MDD_SOURCE, sourceKey: MDD_KEY,
        license: mdd.license, doi: mdd.release.doi, url: `https://www.mammaldiversity.org/taxon/${cell!.id}`, sourceTerm: mapped.sourceTerm,
      } });
    }
  }
  const names = new Map(base.map((s) => [s.id, s.scientificName]));
  for (const { speciesId, country, area, presence, url, sourceTerm } of curated) {
    candidates.push({ name: names.get(speciesId)!, rank: 0, row: {
      speciesId, country, area, origin: "native", presence, source: CURATED_SOURCE, sourceKey: CURATED_KEY, license: "CC BY 4.0", doi: null, url, sourceTerm,
    } });
  }

  const codes = new Set(core.countries.rows.map((c) => c.code));
  for (const { name, row } of candidates) {
    if (!codes.has(row.country)) throw new Error(`range listings: ${name}: source ${row.sourceKey}: country ${row.country} has no row in data/countries.json`);
  }
  const rows = collapse(candidates);
  assertNoIucnData(rows);

  const usedDatasets = Object.entries(checklists.datasets).filter(([key]) => rows.some((r) => r.sourceKey === key)).sort(([a], [b]) => byText(a, b));
  const file: RangeListingsFile = {
    sources: {
      gbifChecklists: { retrieved: checklists.retrieved, datasets: usedDatasets.map(([key, { title, license, doi, citation }]) => ({ key, title, license, doi, citation, rows: ofSource(rows, key).length })) },
      mdd: { retrieved: mdd.retrieved, release: mdd.release, license: mdd.license, rows: ofSource(rows, MDD_KEY).length },
      curated: { rows: ofSource(rows, CURATED_KEY).length },
    },
    rows,
  };

  const entry = (speciesId: number, kind: "range-conflict" | "range-not-found", severity: "review" | "info", rest: Pick<Mismatch, "values" | "reason"> & { country?: string }): Mismatch => {
    const { country, values, reason } = rest;
    return { speciesId, scientificName: names.get(speciesId)!, field: "range-listings", kind, severity, ...(country === undefined ? {} : { country }), values, reason };
  };
  const conflicts = [
    ...rangeConflicts(rows).map(({ speciesId, country, claims }) => entry(speciesId, "range-conflict", "review", {
      country, values: { claims },
      reason: `Sources disagree on ${names.get(speciesId)} in ${country}; every row ships, none is fixed.`,
    })),
    ...base.filter((s) => !rows.some((r) => r.speciesId === s.id && r.sourceKey === (isMammal(s) ? MDD_KEY : CURATED_KEY))).map((s) => {
      const authority = isMammal(s) ? MDD_KEY : CURATED_KEY;
      return entry(s.id, "range-not-found", "info", { values: { sourceKey: authority }, reason: `${s.scientificName} has no ${authority} row, so critwire holds no native listing for it.` });
    }),
  ];

  const report: ListingsReport = {
    sources: [
      ...usedDatasets.map(([key, { title }]) => sourceCount(title, key, rows)),
      sourceCount(MDD_SOURCE, MDD_KEY, rows),
      sourceCount(CURATED_SOURCE, CURATED_KEY, rows),
    ],
    collapsed: candidates.length - rows.length,
    excluded: Object.fromEntries(Object.entries(excluded).sort(([a], [b]) => byText(a, b))),
    dropped: checklists.dropped,
    agreement: agreement(core.records, rows),
  };
  return { file, conflicts, report };
}
