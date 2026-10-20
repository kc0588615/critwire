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

export interface ColSnapshot {
  retrieved: string;
  release: ColRelease;
  matches: Record<string, Fetched>;
}

export interface Snapshots { wikidata: WikidataSnapshot; col: ColSnapshot }
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
