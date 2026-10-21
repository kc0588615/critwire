// Usage: pnpm ingest <source>. Fetches one source for every base species and writes data/raw/<source>/snapshot.json,
// only after every request succeeded (the old snapshot stays on failure). Request log goes to stderr.
import { fetchCol } from "./ingest/col.ts";
import { fetchGbif } from "./ingest/gbif.ts";
import { fetchWikidata } from "./ingest/wikidata.ts";
import { readJson } from "./json.ts";
import { utcDate, writeSnapshot, type Snapshots, type Source } from "./raw.ts";
import { baseFile, validateBase, type BaseSpecies } from "./species.ts";

type Fetcher<S extends Source> = (base: BaseSpecies[]) => Promise<Omit<Snapshots[S], "retrieved">>;
const fetchers: { [S in Source]: Fetcher<S> } = { wikidata: fetchWikidata, col: fetchCol, gbif: fetchGbif };

const source = process.argv[2];
if (!source || !Object.hasOwn(fetchers, source)) {
  console.error(`usage: pnpm ingest <${Object.keys(fetchers).join("|")}>`);
  process.exit(2);
}

const s = source as Source;
const retrieved = utcDate();
const base = await readJson<BaseSpecies[]>(baseFile);
validateBase(base);
const snapshot = { retrieved, ...(await fetchers[s](base)) } as Snapshots[typeof s];
await writeSnapshot(s, snapshot);
console.log(`ingest ${s}: wrote data/raw/${s}/snapshot.json (${retrieved})`);
