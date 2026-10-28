// Species records. data/base.json (BaseSpecies, written by seed-cc) is the input; data/species.json (Species) the published output.
export interface Photo { url: string; credit: string; license: string; page: string }

export interface Taxonomy { class: string; order: string; family: string; genus: string }

export interface BaseSpecies {
  id: number;
  slug: string;
  scientificName: string;
  commonName: string;
  taxonomy: Taxonomy;
  ids: { iucn: number };
  photo: Photo | null;
  replacedBy: number[] | null;
}

// One citation in a record's sources[] (plan §4): the published fields one source filled. A type, not an interface,
// so it is assignable to postgres.js's JSON parameter types in db.ts.
export type Source = {
  source: string;
  fields: string[];
  license: string;
  retrieved?: string;
  url: string;
  doi?: string;
  release?: { key: number; alias: string; version: string; issued: string };
  checklistKey?: string;
};

// Built by scripts/derive/record.ts in this key order.
export interface Species {
  id: number;
  slug: string;
  scientificName: string;
  commonName: string;
  taxonomy: Taxonomy;
  ids: {
    iucn: number;
    gbif: number | null;
    col: string | null;
    wikidata: string | null;
    inaturalist: number | null;
    ncbi: number | null;
  };
  // ISO alpha-2 codes of countries with CC0/CC BY records (never native range). Never []: null unless status is ok.
  range: { countriesWithOpenRecords: string[] | null; status: RangeStatus };
  photo: Photo | null;
  sources: Source[];
  replacedBy: number[] | null;
}

// ok: at least one country; no-open-records: GBIF identity settled, no country left; identity-unsettled: not settled.
export type RangeStatus = "ok" | "no-open-records" | "identity-unsettled";

// One review entry in data/review/mismatches.json (plan §5.6). Built with the keys in this order.
export type Severity = "blocking" | "review" | "info";
export type MismatchKind =
  | "not-found" | "multi-value" | "identity" | "iucn-id" | "synonym-info" | "status-info" | "taxonomy-info"
  | "country-captive-suspect" | "country-borderline" | "no-records";
export interface Mismatch {
  speciesId: number;
  scientificName: string;
  field: string;
  kind: MismatchKind;
  severity: Severity;
  country?: string;
  values: Record<string, unknown>;
  reason: string;
}

// One element of data/issued-ids.json: an id and the slug it was published with (plan D12, MF2).
export interface IssuedId { id: number; slug: string }

// One element of data/review/country-overrides.json (owner-owned, plan §5.5).
export interface CountryOverride { speciesId: number; country: string; action: "keep" | "remove"; reason: string }

export const baseFile = new URL("../data/base.json", import.meta.url);
export const speciesFile = new URL("../data/species.json", import.meta.url);
export const mismatchesFile = new URL("../data/review/mismatches.json", import.meta.url);
export const overridesFile = new URL("../data/review/country-overrides.json", import.meta.url);
export const issuedIdsFile = new URL("../data/issued-ids.json", import.meta.url);

// Throws unless ids, slugs, scientific names and IUCN ids are unique and ids and IUCN ids are positive integers.
// Step 2 keys all raw data by scientificName, so a duplicate name would silently merge two species.
export function validateBase(base: BaseSpecies[]): void {
  const seen = { id: new Set<unknown>(), slug: new Set<unknown>(), scientificName: new Set<unknown>(), iucn: new Set<unknown>() };
  for (const s of base) {
    const name = s.scientificName;
    if (!Number.isInteger(s.id) || s.id < 1) throw new Error(`base: bad id ${s.id} (${name})`);
    if (!Number.isInteger(s.ids?.iucn) || s.ids.iucn < 1) throw new Error(`base: bad ids.iucn ${s.ids?.iucn} (${name})`);
    const keys = { id: s.id, slug: s.slug, scientificName: name, iucn: s.ids.iucn };
    for (const [field, value] of Object.entries(keys) as [keyof typeof seen, unknown][]) {
      if (seen[field].has(value)) throw new Error(`base: duplicate ${field} ${value} (${name})`);
      seen[field].add(value);
    }
  }
}

const INT32_MAX = 2 ** 31 - 1;
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const COUNTRY = /^[A-Z]{2}$/;
const RANGE_STATUSES: readonly RangeStatus[] = ["ok", "no-open-records", "identity-unsettled"];

// Throws unless every record's values are publishable (plan D12, MF2): every string non-blank; slug grammar, not all
// digits; id, ids.{iucn,inaturalist,ncbi} and a COL release key in 1..2^31-1 (DuckDB INTEGER), ids.gbif a positive
// safe integer (BIGINT); countries null unless status is ok, else non-empty, sorted, unique ISO alpha-2; photo null or
// complete; ids and slugs unique; replacedBy null or existing, distinct, non-self ids with no cycle; every issued
// {id, slug} still present with that slug (retired records included), and no record on a slug issued to another id.
// Values only: the key shape is build/columns.ts assertRecordKeys. Run by derive (deriveCore) and db:load.
export function validateRecords(records: readonly Species[], issuedIds: readonly IssuedId[]): void {
  const fail = (s: Species, path: string, why: string): never => { throw new Error(`species ${s.id}: ${path} ${why}`); };
  const int = (s: Species, path: string, v: unknown, max: number, nullable: boolean) => {
    if (v === null && nullable) return;
    if (!Number.isInteger(v) || (v as number) < 1 || (v as number) > max) fail(s, path, `${JSON.stringify(v)} isn't an integer in 1..${max}`);
  };
  const strings = (s: Species, path: string, v: unknown): void => {
    if (typeof v === "string") { if (v.trim() === "") fail(s, path, "is blank"); }
    else if (Array.isArray(v)) v.forEach((e, i) => strings(s, `${path}[${i}]`, e));
    else if (v !== null && typeof v === "object") for (const [k, e] of Object.entries(v)) strings(s, path ? `${path}.${k}` : k, e);
  };
  const byId = new Map<number, Species>();
  const slugs = new Set<string>();
  for (const s of records) {
    int(s, "id", s.id, INT32_MAX, false);
    if (byId.has(s.id)) fail(s, "id", `repeats id ${s.id}`);
    byId.set(s.id, s);
    for (const path of ["slug", "scientificName", "commonName", "taxonomy.class", "taxonomy.order", "taxonomy.family", "taxonomy.genus"]) {
      const v = path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], s);
      if (typeof v !== "string") fail(s, path, `${JSON.stringify(v)} isn't a string`);
    }
    strings(s, "", s);
    if (!SLUG.test(s.slug) || /^\d+$/.test(s.slug)) fail(s, "slug", `"${s.slug}" isn't lowercase-hyphenated, or is all digits (an {id}.json collision)`);
    if (slugs.has(s.slug)) fail(s, "slug", `repeats slug ${s.slug}`);
    slugs.add(s.slug);
    int(s, "ids.iucn", s.ids.iucn, INT32_MAX, false);
    int(s, "ids.inaturalist", s.ids.inaturalist, INT32_MAX, true);
    int(s, "ids.ncbi", s.ids.ncbi, INT32_MAX, true);
    int(s, "ids.gbif", s.ids.gbif, Number.MAX_SAFE_INTEGER, true);
    s.sources.forEach((src, i) => { if (src.release) int(s, `sources[${i}].release.key`, src.release.key, INT32_MAX, false); });
    const { countriesWithOpenRecords: list, status } = s.range;
    if (!RANGE_STATUSES.includes(status)) fail(s, "range.status", `${JSON.stringify(status)} is unknown`);
    if ((list === null) !== (status !== "ok")) fail(s, "range", `countriesWithOpenRecords must be null exactly when status isn't ok (status ${status})`);
    if (list !== null && (list.length === 0 || list.some((c, i) => !COUNTRY.test(c) || (i > 0 && c <= list[i - 1]!)))) {
      fail(s, "range.countriesWithOpenRecords", `${JSON.stringify(list)} isn't a non-empty, sorted, unique list of ISO alpha-2 codes`);
    }
    if (s.photo !== null && !(["url", "credit", "license", "page"] as const).every((k) => typeof s.photo![k] === "string")) {
      fail(s, "photo", "needs a url, credit, license and page");
    }
  }
  for (const s of records) {
    const to = s.replacedBy;
    if (to === null) continue;
    if (to.length === 0) fail(s, "replacedBy", "is [] (null when the record isn't retired)");
    if (new Set(to).size !== to.length) fail(s, "replacedBy", `${JSON.stringify(to)} repeats an id`);
    for (const t of to) {
      if (t === s.id) fail(s, "replacedBy", "points to itself");
      if (!byId.has(t)) fail(s, "replacedBy", `points to ${t}, which no record has`);
    }
  }
  // A cycle leaves no live record to follow: depth-first over replacedBy, 1 = on the current path, 2 = done.
  const state = new Map<number, 1 | 2>();
  const visit = (s: Species): void => {
    if (state.get(s.id) === 2) return;
    if (state.get(s.id) === 1) fail(s, "replacedBy", "is part of a cycle");
    state.set(s.id, 1);
    for (const t of s.replacedBy ?? []) visit(byId.get(t)!);
    state.set(s.id, 2);
  };
  records.forEach(visit);
  // Published URLs never change meaning: an issued id keeps its slug, a slug its id, and no issued id is removed.
  const slugOf = new Map(issuedIds.map((p) => [p.id, p.slug]));
  const idOf = new Map(issuedIds.map((p) => [p.slug, p.id]));
  for (const s of records) {
    const slug = slugOf.get(s.id);
    if (slug !== undefined && slug !== s.slug) fail(s, "slug", `${s.slug}, but id ${s.id} was issued as ${slug}`);
    const id = idOf.get(s.slug);
    if (id !== undefined && id !== s.id) fail(s, "slug", `${s.slug} was issued to id ${id}`);
  }
  for (const p of issuedIds) {
    if (!byId.has(p.id)) throw new Error(`issued id ${p.id} (${p.slug}) is gone: ids are never removed or reused; retire it with replacedBy`);
  }
}
