// pnpm db:load: checks data/species.json (key shape and values, plan D12) and loads it into DATABASE_URL (environment,
// or .env when present). See db.ts.
import { assertRecordKeys } from "./build/columns.ts";
import { loadDatabase } from "./db.ts";
import { loadEnv, requireEnv } from "./env.ts";
import { readJson } from "./json.ts";
import { speciesFile, validateRecords, type Species } from "./species.ts";

loadEnv();
const url = requireEnv("DATABASE_URL");
const species = await readJson<Species[]>(speciesFile);
assertRecordKeys(species);
validateRecords(species);
await loadDatabase(url, species);
console.log(`loaded ${species.length} species`);
