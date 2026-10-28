// pnpm build [--draft] (plan §3, D9.1): checks data/ and site/learn/ offline, rebuilds DATABASE_URL from it, then writes the static
// site to dist/: /v1, the docs page, then /learn/data/, whose lab tables it rebuilds from those bytes and checks, its
// loader, manifest and index page; both 50 MB caps are enforced. A
// plain build refuses without a current GBIF derived-dataset DOI for every target; --draft builds without them
// (previews, E2E).
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { loadDatabase } from "./db.ts";
import { loadEnv, requireEnv } from "./env.ts";
import { formatJson } from "./json.ts";
import { speciesFile } from "./species.ts";
import { buildAttribution } from "./build/attribution.ts";
import { writeCountries } from "./build/countries.ts";
import { docsTemplate, renderDocs } from "./build/docs.ts";
import { styleSheet } from "./build/html.ts";
import { readBuildInputs } from "./build/inputs.ts";
import { assertLabChecks } from "./build/learn/checks.ts";
import { fileSizes, LEARN_CAP, totalBytes } from "./build/learn/cap.ts";
import { writeLabIndex, writeLabLoader, writeLearnData } from "./build/learn/data.ts";
import { projectLearn } from "./build/learn/projection.ts";
import { readLearnInputs } from "./build/learn/site.ts";
import { childFile } from "./build/paths.ts";
import { writeTables } from "./build/tables.ts";

const out = new URL("../dist/", import.meta.url);
const v1 = new URL("v1/", out);

const args = process.argv.slice(2);
for (const arg of args) if (arg !== "--draft") throw new Error(`unknown argument: ${arg}`);
loadEnv();
const url = requireEnv("DATABASE_URL");
const { species, registration, countries, learn, labFiles, labCredits, labBytes } = await readBuildInputs({ draft: args.includes("--draft") });
const { curriculum } = await readLearnInputs();
console.log(`learn curriculum: ${curriculum.tracks.length} tracks, ${curriculum.modules.length} modules (${curriculum.modules.filter((m) => m.state === "built").length} built)`);
const attribution = buildAttribution(species, registration, countries);
const docs = renderDocs(await readFile(docsTemplate, "utf8"), await readFile(styleSheet, "utf8"), attribution, species);
await loadDatabase(url, species);
console.log(`loaded ${species.length} species`);

await rm(out, { recursive: true, force: true });
const speciesDir = new URL("species/", v1);
await mkdir(speciesDir, { recursive: true });
await copyFile(speciesFile, new URL("species.json", v1));
for (const s of species) {
  const json = formatJson(s);
  await writeFile(childFile(speciesDir, `${s.id}.json`), json);
  await writeFile(childFile(speciesDir, `${s.slug}.json`), json);
}
await writeTables(speciesFile, v1);
await writeCountries(countries.rows, v1);
await writeFile(new URL("attribution.json", v1), formatJson(attribution));
await writeFile(new URL("index.html", out), docs);
await writeLearnData(new URL("learn/data/", out), { learn, files: labFiles });
// The lab tables from the published bytes, as a learner builds them; a violation fails before deploy publishes.
const projection = await projectLearn(out);
assertLabChecks(projection.checks, "learn projection (dist/)");
console.log(`learn projection: ${Object.keys(projection.tables).length} tables, ${Object.keys(projection.checks).length} LAB_CHECKS all 0`);
await writeLabLoader(out);
await writeLabIndex(out, { ctx: labCredits, learn, tables: projection.tables });

// Every file with its size in bytes, sorted by path (for the PR body).
const dist = fileURLToPath(out);
const files = (await readdir(dist, { recursive: true, withFileTypes: true }))
  .filter((e) => e.isFile())
  .map((e) => relative(dist, join(e.parentPath, e.name)))
  .sort();
for (const f of files) console.log(`${(await stat(join(dist, f))).size}\t${f}`);
// Both 50 MB caps' totals (plan D9.9; each refused above the cap before this).
const n = (bytes: number) => bytes.toLocaleString("en-US");
console.log(`dist/learn/data/: ${n(totalBytes(await fileSizes(new URL("learn/data/", out))))} bytes; committed lab data: ${n(labBytes)} bytes (cap ${n(LEARN_CAP)} each)`);
