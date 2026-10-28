// Raw snapshots in data/raw/<source>/snapshot.json: one file per source, normalized (keys sorted), one UTC `retrieved` date.
import { mkdir } from "node:fs/promises";
import { readJson, writeJson } from "./json.ts";

export interface SparqlTerm { type: string; value: string; datatype?: string; "xml:lang"?: string }
export type SparqlBinding = Record<string, SparqlTerm>;

export interface WikidataSnapshot {
  retrieved: string;
  endpoint: string;
  query: string;
  response: { head: { vars: string[] }; results: { bindings: SparqlBinding[] } };
}

// A fetched response kept with the URL that produced it (copied into sources[].url by derive).
export interface Fetched<T = unknown> { url: string; response: T }

export interface ColRelease { key: number; alias: string; title: string; version: string; issued: string; doi: string; license: string; url: string }

// ChecklistBank name match (only the fields the COL rule reads). For an accepted usage the classification starts at
// its parent; for a synonym it starts at the accepted name (id == usage.parentId).
export interface ColTaxon { id: string; name: string; rank: string; status?: string }
export interface ColUsage extends ColTaxon { parentId?: string; classification?: ColTaxon[] }
export interface ColMatchResponse { match: boolean; type?: string; usage?: ColUsage }

export interface ColSnapshot {
  retrieved: string;
  release: ColRelease;
  matches: Record<string, Fetched<ColMatchResponse>>;
}

export interface GbifUsage {
  key: string; name: string; canonicalName: string; rank: string; status?: string; genericName?: string; specificEpithet?: string;
}
export interface GbifMatchResponse {
  usage?: GbifUsage;
  acceptedUsage?: GbifUsage;
  classification?: { key: string; name: string; rank: string }[];
  diagnostics: { matchType: string; confidence?: number };
  synonym?: boolean;
}
export interface GbifFacet { field: string; counts: { name: string; count: number }[] }
export interface GbifOccurrenceResponse { count: number; facets: GbifFacet[] }
// The datasetKey facet of the countries query, all pages merged: dataset UUID → record count. `url` is page 0.
export interface GbifDatasets { url: string; counts: Record<string, number> }
export interface GbifChecklist { key: string; title: string; doi: string; license: string; pubDate: string }

export interface GbifSnapshot {
  retrieved: string;
  checklist: GbifChecklist;
  countries: Record<string, { gbifRegion: string; title: string }>;
  // datasets is null exactly when occurrences is.
  species: Record<string, { match: Fetched<GbifMatchResponse>; occurrences: Fetched<GbifOccurrenceResponse> | null; datasets: GbifDatasets | null }>;
}

// Natural Earth admin-0 attributes (002 §6): each layer's units in file order, cut to `fields[layer]`; no geometry.
// release, commit and fields are the extraction fingerprint derive checks; files are the pinned URLs and sha256s.
export type NeLayer = "countries" | "map_units";
export interface NaturalEarthSnapshot {
  retrieved: string;
  release: { version: string; issued: string };
  commit: string;
  fields: Record<NeLayer, string[]>;
  files: Record<NeLayer, { url: string; sha256: string }>;
  layers: Record<NeLayer, Record<string, string>[]>;
}

export interface Snapshots { wikidata: WikidataSnapshot; col: ColSnapshot; gbif: GbifSnapshot; naturalearth: NaturalEarthSnapshot }
export type Source = keyof Snapshots;

const snapshotFile = (source: Source) => new URL(`../data/raw/${source}/snapshot.json`, import.meta.url);

// UTC YYYY-MM-DD.
export function utcDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

// Recursively drops the given keys from objects (volatile or forbidden fields); arrays keep their order.
export function omitKeys(value: unknown, keys: ReadonlySet<string>): unknown {
  if (Array.isArray(value)) return value.map((v) => omitKeys(v, keys));
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value).filter(([k]) => !keys.has(k)).map(([k, v]) => [k, omitKeys(v, keys)]));
}

// A snapshot today's ingest wouldn't produce (MF3): says why and which ingest to re-run.
export const staleSnapshot = (source: Source, why: string) => new Error(`data/raw/${source} is stale (${why}): run pnpm ingest ${source}`);

// Throws unless a snapshot keyed by scientificName covers exactly the base names.
export function assertBaseNames(source: Source, keys: string[], base: readonly { scientificName: string }[]): void {
  const want = base.map((s) => s.scientificName).sort().join("\n");
  if ([...keys].sort().join("\n") !== want) throw staleSnapshot(source, "names: not the base's");
}

// Data rule: never store IUCN data. Throws on any additionalStatus key, or any key or string mentioning IUCN.
export function assertNoIucnData(value: unknown, path = "$"): void {
  if (typeof value === "string") {
    if (/iucn/i.test(value)) throw new Error(`IUCN data at ${path}: ${JSON.stringify(value.slice(0, 100))}`);
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [k, v] of Object.entries(value)) {
    if (k === "additionalStatus" || /iucn/i.test(k)) throw new Error(`IUCN data at ${path}.${k}`);
    assertNoIucnData(v, `${path}.${k}`);
  }
}

export async function readSnapshot<S extends Source>(source: S): Promise<Snapshots[S]> {
  return readJson<Snapshots[S]>(snapshotFile(source));
}

export async function writeSnapshot<S extends Source>(source: S, snapshot: Snapshots[S]): Promise<void> {
  const url = snapshotFile(source);
  await mkdir(new URL(".", url), { recursive: true });
  await writeJson(url, snapshot, { canonical: true });
}

// GBIF occurrence counts may come only from CC0 1.0 and CC BY 4.0 records (D7). Throws unless the LICENSE facet
// holds only those and its counts sum to `count`. Called by ingest and derive.
export const OPEN_GBIF_LICENSES: ReadonlySet<string> = new Set(["CC0_1_0", "CC_BY_4_0"]);
export function assertOpenLicenses(response: GbifOccurrenceResponse): void {
  const facet = response.facets.find((f) => f.field === "LICENSE");
  if (!facet && response.count > 0) throw new Error(`gbif: no LICENSE facet for ${response.count} records`);
  let sum = 0;
  for (const { name, count } of facet?.counts ?? []) {
    if (!OPEN_GBIF_LICENSES.has(name)) throw new Error(`gbif: non-open license ${name} (${count} records)`);
    sum += count;
  }
  if (sum !== response.count) throw new Error(`gbif: LICENSE counts sum to ${sum}, count is ${response.count}`);
}

// The GBIF taxon whose occurrences are counted: the accepted key (covers its synonyms), else the usage key.
export function gbifTaxonKey(match: GbifMatchResponse): number {
  const raw = match.acceptedUsage?.key ?? match.usage?.key;
  const key = Number(raw);
  if (typeof raw !== "string" || !/^\d+$/.test(raw) || !Number.isSafeInteger(key)) throw new Error(`gbif: taxon key ${JSON.stringify(raw)} is not an integer`);
  return key;
}
