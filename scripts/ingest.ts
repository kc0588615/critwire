// Usage: pnpm ingest <source>. Each source fetches everything first and writes only after every request succeeded
// (the old files stay on failure). Request log goes to stderr.
// Snapshot sources write data/raw/<source>/snapshot.json; wikidata, col and gbif read base.json for the species.
// shapes writes data/learn/'s shape files and shapes.json (scripts/ingest/shapes.ts; needs pnpm learn:venv).
import { fetchCol } from "./ingest/col.ts";
import { fetchGbif } from "./ingest/gbif.ts";
import { fetchNaturalEarth } from "./ingest/naturalearth.ts";
import { ingestShapes } from "./ingest/shapes.ts";
import { fetchWikidata } from "./ingest/wikidata.ts";
import { readJson } from "./json.ts";
import { utcDate, writeSnapshot, type Snapshots, type Source } from "./raw.ts";
import { baseFile, validateBase, type BaseSpecies } from "./species.ts";

type Fetch<S extends Source> = () => Promise<Omit<Snapshots[S], "retrieved">>;

function snapshot<S extends Source>(source: S, fetch: Fetch<S>): () => Promise<void> {
  return async () => {
    const retrieved = utcDate();
    await writeSnapshot(source, { retrieved, ...(await fetch()) } as Snapshots[S]);
    console.log(`ingest ${source}: wrote data/raw/${source}/snapshot.json (${retrieved})`);
  };
}

function withBase<T>(fetch: (base: BaseSpecies[]) => Promise<T>): () => Promise<T> {
  return async () => {
    const base = await readJson<BaseSpecies[]>(baseFile);
    validateBase(base);
    return fetch(base);
  };
}

const sources: Record<string, () => Promise<void>> = {
  wikidata: snapshot("wikidata", withBase(fetchWikidata)),
  col: snapshot("col", withBase(fetchCol)),
  gbif: snapshot("gbif", withBase(fetchGbif)),
  naturalearth: snapshot("naturalearth", fetchNaturalEarth),
  shapes: ingestShapes,
};

const source = process.argv[2];
if (!source || !Object.hasOwn(sources, source)) {
  console.error(`usage: pnpm ingest <${Object.keys(sources).join("|")}>`);
  process.exit(2);
}
await sources[source]();
