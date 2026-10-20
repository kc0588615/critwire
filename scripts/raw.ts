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

export interface Snapshots { wikidata: WikidataSnapshot }
export type Source = keyof Snapshots;

const snapshotFile = (source: Source) => new URL(`../data/raw/${source}/snapshot.json`, import.meta.url);

// UTC YYYY-MM-DD.
export function utcDate(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export async function readSnapshot<S extends Source>(source: S): Promise<Snapshots[S]> {
  return readJson<Snapshots[S]>(snapshotFile(source));
}

export async function writeSnapshot<S extends Source>(source: S, snapshot: Snapshots[S]): Promise<void> {
  const url = snapshotFile(source);
  await mkdir(new URL(".", url), { recursive: true });
  await writeJson(url, snapshot, { canonical: true });
}
