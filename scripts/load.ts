// pnpm db:load: loads data/species.json into DATABASE_URL (environment, or .env when present). See db.ts.
import { loadDatabase } from "./db.ts";
import { loadEnv, requireEnv } from "./env.ts";
import { readJson } from "./json.ts";
import { speciesFile, type Species } from "./species.ts";

loadEnv();
const url = requireEnv("DATABASE_URL");
const species = await readJson<Species[]>(speciesFile);
await loadDatabase(url, species);
console.log(`loaded ${species.length} species`);
