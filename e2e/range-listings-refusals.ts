// The brief's "plain build refuses" list, each made to happen once, on real files through the real CLI, in both modes:
// pnpm exec tsx e2e/range-listings-refusals.ts   (after pnpm build, on a clean tree; R1–R20 of plan 007's mission's Verification, R21–R29 of the range lessons'.)
// Not a spec, so pnpm e2e doesn't run it: it edits the tree. Interrupted: git checkout -- data contracts site/learn/sql e2e/__snapshots__, then pnpm build.
//
// Two shapes of case. Most refuse before the db load, in both modes. The listing-block guard's (`guard`, below) run on the
// built site, so they refuse after dist/ is written: the last pnpm build rewrites it, and the hash check covers that.
//
// Ways this harness could lie, each closed below:
// 1. A case passes on some other refusal: the message is pinned with the doctored row's own names.
// 2. A doctor changes nothing (a row or name gone), so the case proves nothing: the file must be dirty after it, lookups throw.
// 3. A refusal comes after a write: the db load's line fails the case unless it's a guard case, and dist/'s hashes must end unchanged.
// 4. --draft lifts a refusal: every case runs in both modes; only `draftWarns` may pass there, and it must print the warning.
// 5. A doctored file survives into the next case or the tree: restored in finally, git status checked after each case.
// 6. It overwrites someone's work: refuses a dirty tree before the first case.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { entrySha, type ContractEntry, type V1Contract } from "../scripts/build/contract.ts";
import type { GbifChecklistRow, GbifChecklistsSnapshot, MddSnapshot } from "../scripts/raw.ts";
import type { BaseSpecies } from "../scripts/species.ts";

const root = fileURLToPath(new URL("..", import.meta.url));
const CHECKLISTS = "data/raw/gbif-checklists/snapshot.json";
const MDD = "data/raw/mdd/snapshot.json";
const CURATED = "data/review/range-curated.json";
const CONTRACT = "contracts/v1.json";
const LISTINGS = "data/range-listings.json";
const CONFLICTS = "data/review/range-conflicts.json";
const SQL = "site/learn/sql";
const SNAPSHOTS = "e2e/__snapshots__";
const RESTORED = ["data", "contracts", SQL, SNAPSHOTS];

const readText = (file: string) => readFile(join(root, file), "utf8");
const readData = async <T>(file: string) => JSON.parse(await readText(file)) as T;
const writeData = (file: string, value: unknown) => writeFile(join(root, file), `${JSON.stringify(value, null, 2)}\n`);

// Reads a JSON file, edits it, writes it back.
async function edit<T>(file: string, change: (value: T) => void): Promise<void> {
  const value = await readData<T>(file);
  change(value);
  await writeData(file, value);
}

function git(...args: string[]): string {
  const { status, stdout, stderr } = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (status !== 0) throw new Error(`git ${args.join(" ")}: ${stderr}`);
  return stdout;
}
const treeStatus = () => git("status", "--porcelain").trim();

async function distHash(): Promise<string> {
  const hash = createHash("sha256");
  const dist = join(root, "dist");
  const entries = await readdir(dist, { recursive: true, withFileTypes: true });
  const files = entries.filter((e) => e.isFile()).map((e) => join(e.parentPath, e.name)).sort();
  if (files.length === 0) throw new Error("dist/ is empty: run pnpm build first");
  for (const file of files) hash.update(file).update(await readFile(file));
  return hash.digest("hex");
}

const base = await readData<BaseSpecies[]>("data/base.json");
const checklists = await readData<GbifChecklistsSnapshot>(CHECKLISTS);
const mdd = await readData<MddSnapshot>(MDD);
const curatedCount = (await readData<unknown[]>(CURATED)).length;

// The first INTRODUCED/PRESENT row in the file: one that maps, so only the doctored value can refuse it.
const mapping = Object.entries(checklists.species).flatMap(([name, { rows }]) => rows.map((row, i) => ({ name, row, i })))
  .find(({ row }) => row.establishmentMeans === "INTRODUCED" && row.status === "PRESENT");
if (!mapping) throw new Error(`${CHECKLISTS}: no INTRODUCED/PRESENT row to doctor`);
const { name: rowSpecies, row: mappedRow, i: rowIndex } = mapping;
const editRow = (change: (row: GbifChecklistRow & { threatStatus?: string }) => void) =>
  edit<GbifChecklistsSnapshot>(CHECKLISTS, (s) => change(s.species[rowSpecies].rows[rowIndex]));

const datasetKey = Object.keys(checklists.datasets).sort()[0];
const mammal = base.find((s) => s.taxonomy.class === "Mammalia" && mdd.species[s.scientificName] !== null);
if (!mammal) throw new Error("data/base.json: no mammal with an MDD row");
const mammalName = mammal.scientificName;
const nonMammal = base.find((s) => s.taxonomy.class !== "Mammalia");
if (!nonMammal) throw new Error("data/base.json: no non-mammal");

// A curated row valid in every way, appended to whatever the file holds, so a case's own change is the only fault.
const curatedRow = (over: Record<string, unknown> = {}) => ({
  speciesId: nonMammal.id, country: "IS", area: null, presence: "present", url: "https://example.org/reference", sourceTerm: "doctored by the refusals harness", ...over,
});
const addCurated = (...rows: unknown[]) => edit<unknown[]>(CURATED, (file) => { file.push(...rows); });
const appendByte = async (file: string) => writeFile(join(root, file), `${await readText(file)}\n`);
// A block file's or a snapshot's text, changed in one place; lookups throw, so a case can't doctor a line that's gone.
async function replaceOnce(file: string, from: string, to: string): Promise<void> {
  const text = await readText(file);
  if (text.split(from).length !== 2) throw new Error(`${file}: wanted exactly one ${JSON.stringify(from)}`);
  await writeFile(join(root, file), text.replace(from, () => to));
}
const LISTINGS_READER = "read_parquet('range-listings.parquet')";
const ANOTHER_FORM = (id: string) => `q ${id}: names another form of range-listings`;

interface Case {
  id: string;
  file: string;
  doctor: () => Promise<void>;
  // pnpm derive runs on the doctored file first (R8: the snapshot passes derive; only the citation's check is left).
  derive?: boolean;
  // The listing-block guard refuses it, on the built site: after the db load, which the case then allows.
  guard?: boolean;
  // --draft passes and prints `want`; a plain build refuses with it.
  draftWarns?: boolean;
  want: string[];
}

const stale = (source: string, why: string) => `data/raw/${source} is stale (${why}): run pnpm ingest ${source}`;

const CASES: Case[] = [
  { id: "R1", file: LISTINGS, doctor: () => appendByte(LISTINGS), want: ["data/range-listings.json is stale: run pnpm derive"] },
  { id: "R2", file: CONFLICTS, doctor: () => appendByte(CONFLICTS), want: ["data/review/range-conflicts.json is stale: run pnpm derive"] },
  { id: "R3", file: CHECKLISTS, doctor: () => edit<GbifChecklistsSnapshot>(CHECKLISTS, (s) => { delete s.species[rowSpecies]; }), want: [stale("gbif-checklists", "names: not the base's")] },
  { id: "R4", file: MDD, doctor: () => edit<MddSnapshot>(MDD, (s) => { delete s.species[mammalName]; }), want: [stale("mdd", "names: not the base's")] },
  { id: "R5", file: CHECKLISTS, doctor: () => edit<GbifChecklistsSnapshot>(CHECKLISTS, (s) => { s.species["Emydoidea blandingii"].keys.push(1); }), want: [stale("gbif-checklists", "Emydoidea blandingii: keys")] },
  {
    id: "R6", file: CHECKLISTS,
    doctor: () => edit<GbifChecklistsSnapshot>(CHECKLISTS, (s) => { const a = s.allowlist[datasetKey]; a.role = a.role === "register" ? "checklist" : "register"; }),
    want: [stale("gbif-checklists", "allowlist")],
  },
  { id: "R7", file: MDD, doctor: () => edit<MddSnapshot>(MDD, (s) => { s.file.md5 = "0".repeat(32); }), want: [stale("mdd", "pin")] },
  { id: "R8", file: MDD, derive: true, doctor: () => edit<MddSnapshot>(MDD, (s) => { s.release.version = "v0.0"; }), want: ["MDD release v0.0", "MDD_CITATIONS"] },
  {
    id: "R9", file: CHECKLISTS,
    doctor: () => edit<{ datasets: Record<string, { license: string }> }>(CHECKLISTS, (s) => { s.datasets[datasetKey].license = "CC BY-NC 4.0"; }),
    want: [`data/raw/gbif-checklists: dataset ${datasetKey}: license "CC BY-NC 4.0"`],
  },
  { id: "R10", file: MDD, doctor: () => edit<{ license: string }>(MDD, (s) => { s.license = "CC BY-SA 4.0"; }), want: [`data/raw/mdd: license "CC BY-SA 4.0"`] },
  {
    id: "R11", file: CHECKLISTS,
    doctor: () => edit<GbifChecklistsSnapshot>(CHECKLISTS, (s) => { s.datasets[datasetKey].title += " iucn"; }),
    want: [`IUCN data at $.datasets.${datasetKey}.title`],
  },
  { id: "R12", file: CHECKLISTS, doctor: () => editRow((row) => { row.threatStatus = "VU"; }), want: [`IUCN data at $.species.${rowSpecies}.rows.${rowIndex}.threatStatus`] },
  {
    id: "R13", file: MDD,
    doctor: () => edit<{ species: Record<string, Record<string, unknown>> }>(MDD, (s) => { s.species[mammalName].iucnStatus = "VU"; }),
    want: [`IUCN data at $.species.${mammalName}.iucnStatus`],
  },
  {
    id: "R14", file: CHECKLISTS, doctor: () => editRow((row) => { row.establishmentMeans = "ESCAPED"; }),
    want: [`range listings: ${rowSpecies}: dataset ${mappedRow.datasetKey}, country ${mappedRow.country}: means "ESCAPED", status "PRESENT"`],
  },
  {
    id: "R15", file: CHECKLISTS, doctor: () => editRow((row) => { row.status = "EXTINCT"; }),
    want: [`range listings: ${rowSpecies}: dataset ${mappedRow.datasetKey}, country ${mappedRow.country}: means "INTRODUCED", status "EXTINCT"`],
  },
  {
    id: "R16", file: MDD,
    doctor: () => edit<MddSnapshot>(MDD, (s) => { s.species[mammalName]!.places += "|Atlantis"; }),
    want: [`range listings: ${mammalName}: MDD place "Atlantis" isn't in MDD_PLACES`],
  },
  {
    id: "R17", file: CHECKLISTS, doctor: () => editRow((row) => { row.country = "QQ"; }),
    want: [`range listings: ${rowSpecies}: source ${mappedRow.datasetKey}: country QQ has no row`],
  },
  { id: "R18a", file: CURATED, doctor: () => addCurated(curatedRow({ speciesId: mammal.id })), want: [`range-curated[${curatedCount}]: species ${mammal.id} is a mammal`] },
  { id: "R18b", file: CURATED, doctor: () => addCurated(curatedRow({ url: "http://example.org/reference" })), want: [`range-curated[${curatedCount}]: url must be https`] },
  { id: "R18c", file: CURATED, doctor: () => addCurated(curatedRow(), curatedRow()), want: [`range-curated[${curatedCount + 1}]: duplicate of an earlier row`, `species ${nonMammal.id}, country IS`] },
  { id: "R19", file: CURATED, doctor: () => addCurated(curatedRow({ url: "https://www.iucnredlist.org/species/1" })), want: [`IUCN data at range-curated[${curatedCount}].url`] },
  {
    id: "R20a", file: CONTRACT,
    doctor: () => edit<V1Contract>(CONTRACT, (c) => { const [a, b, ...rest] = c.rangeListingsCsv; c.rangeListingsCsv = [b, a, ...rest]; }),
    want: ["/v1/range-listings.csv: columns", "needs /v2"],
  },
  {
    id: "R20b", file: CONTRACT,
    doctor: () => edit<V1Contract>(CONTRACT, (c) => { c.rangeListings.origin.means += " (edited)"; }),
    want: ["/v1/range-listings origin: definition changed", "needs /v2"],
  },
  {
    id: "R20c", file: CONTRACT,
    doctor: () => edit<V1Contract>(CONTRACT, (c) => {
      const entry: Omit<ContractEntry, "sha"> = { type: "VARCHAR", null: true, means: "a column the writer doesn't have" };
      c.rangeListings.notWritten = { ...entry, sha: entrySha(entry) };
    }),
    want: ["/v1/range-listings notWritten: removed from the writer", "needs /v2"],
  },
  {
    id: "R21", file: `${SQL}/f3-listed-no-records.sql`,
    doctor: () => replaceOnce(`${SQL}/f3-listed-no-records.sql`, LISTINGS_READER, "'range-listings.parquet'"),
    want: [ANOTHER_FORM("f3-listed-no-records")],
  },
  {
    id: "R22", file: `${SQL}/e4-checks.sql`,
    doctor: () => replaceOnce(`${SQL}/e4-checks.sql`, "-- engine: postgis\n", "-- engine: postgis\n-- see range-listings.parquet\n"),
    want: [ANOTHER_FORM("e4-checks")],
  },
  {
    id: "R23", file: `${SQL}/e1-checksum.py`,
    doctor: () => replaceOnce(`${SQL}/e1-checksum.py`, "import json\n", "# see range-listings.parquet\nimport json\n"),
    want: [ANOTHER_FORM("e1-checksum")],
  },
  {
    id: "R24", file: `${SQL}/d2-list.sql`,
    doctor: () => replaceOnce(`${SQL}/d2-list.sql`, "read_parquet('species.parquet')", "read_parquet('spec*.parquet')"),
    want: ["q d2-list: can reach a file without its name"],
  },
  {
    id: "R25", file: `${SQL}/s1-ex.sql`,
    doctor: () => replaceOnce(`${SQL}/s1-ex.sql`, "-- status: ran\n", "-- status: ran\n-- after: s1-listed\n"),
    want: ["q s1-ex: runs after s1-listed, a listing block"],
  },
  {
    id: "R26", file: `${SQL}/f3-listed-no-records.sql`, guard: true,
    doctor: () => replaceOnce(`${SQL}/f3-listed-no-records.sql`, "\nORDER BY s.common_name, s.id, c.name, l.origin;", ";"),
    want: ["q f3-listed-no-records: returns 89 rows and has no ORDER BY of its own"],
  },
  {
    id: "R27", file: `${SQL}/d2-listing-facts.sql`, guard: true,
    doctor: () => replaceOnce(`${SQL}/d2-listing-facts.sql`, "WHERE t.class = 'Mammalia'\n", ""),
    want: ["q d2-listing-facts: reads non-mammal rows; a curated correction would move it"],
  },
  {
    id: "R28", file: `${SQL}/s1-listed.sql`, guard: true,
    doctor: () => replaceOnce(`${SQL}/s1-listed.sql`, "SELECT source,\n", "SELECT source, [1] AS a_list,\n"),
    want: ["q s1-listed: cell type of a_list is INTEGER[]"],
  },
  {
    id: "R29", file: `${SNAPSHOTS}/s1-listed.txt`, guard: true, draftWarns: true,
    doctor: () => replaceOnce(`${SNAPSHOTS}/s1-listed.txt`, "| 364 |", "| 365 |"),
    want: ["q s1-listed: result differs from its snapshot", "- Mammal Diversity Database | 365 |", "+ Mammal Diversity Database | 364 |"],
  },
];

const MODES = [{ mode: "plain", args: [] as string[] }, { mode: "draft", args: ["--draft"] }];
// The line that says why: a contract refusal's first line is only the file's name, so its problem line follows it.
function errorLine(output: string): string {
  const lines = output.split("\n");
  const i = lines.findIndex((l) => /^\s*\w*Error\b/.test(l));
  if (i < 0) return "(no error line)";
  return lines[i].trim().endsWith(":") ? `${lines[i].trim()} ${lines[i + 1].trim()}` : lines[i].trim();
}

if (treeStatus() !== "") throw new Error(`refusing a dirty tree:\n${treeStatus()}`);
const distBefore = await distHash();
let failed = 0;
const report = (ok: boolean, id: string, mode: string, line: string) => {
  if (!ok) failed += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${id} ${mode} ${line}`);
};

for (const { id, file, doctor, derive, guard, draftWarns, want } of CASES) {
  try {
    await doctor();
    if (!treeStatus().includes(file)) throw new Error(`${id}: the doctor changed nothing in ${file}`);
    if (derive) {
      const { status, stdout, stderr } = spawnSync("pnpm", ["-s", "derive"], { cwd: root, encoding: "utf8" });
      if (status !== 0) throw new Error(`${id}: pnpm derive failed on the doctored file:\n${stdout}${stderr}`);
    }
    for (const { mode, args } of MODES) {
      const { status, stdout, stderr } = spawnSync("pnpm", ["-s", "build", ...args], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
      const output = `${stdout}${stderr}`;
      const missing = want.filter((w) => !output.includes(w));
      const line = errorLine(output);
      if (draftWarns && mode === "draft") report(status === 0 && !missing.length, id, mode, status !== 0 ? `refused: ${line}` : missing.length ? `passed, wanted ${JSON.stringify(missing)}` : "warned, passed");
      else if (status === 0) report(false, id, mode, "the build passed");
      else if (!guard && /^loaded \d+ species$/m.test(output)) report(false, id, mode, `refused after the db load: ${line}`);
      else if (missing.length) report(false, id, mode, `wanted ${JSON.stringify(missing)}, got: ${line}`);
      else report(true, id, mode, line);
    }
  } finally {
    git("checkout", "--", ...RESTORED);
  }
  if (treeStatus() !== "") throw new Error(`${id} left the tree dirty:\n${treeStatus()}`);
}

const rebuilt = spawnSync("pnpm", ["-s", "build"], { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
if (rebuilt.status !== 0) throw new Error(`the last pnpm build failed on the restored tree:\n${rebuilt.stdout}${rebuilt.stderr}`);
if (await distHash() !== distBefore) { failed += 1; console.log("FAIL dist/ hashes changed"); }
console.log(`${CASES.length} cases, ${failed} failed; tree clean, dist/ ${failed ? "see above" : "unchanged"}`);
process.exit(failed ? 1 : 0);
