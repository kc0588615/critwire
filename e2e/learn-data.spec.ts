// /learn/data/ (plan D15, 004 §7.7, L1's part): every file against manifest.json (sha256, size, rows, columns), the
// occurrences and datasets against data/, the loader's tables against counts from data/, the 120 MB cap, sources and
// both DOIs, the /v1 inputs, and the index page, with screenshots at 1280 and 375 px. Expectations come from data/ and
// the manifest, never typed in. The star (/learn/data/star/, plan D9): every served file through the Power BI input
// check (star-check: header, rows, sha256, keys unique and filled, foreign keys found), its unknown members, `NA` read as
// text, and every Power BI block's inputs. The habitat files (L3): served as habitat.json records them, keyed to the
// sample's records and the map's classes, the clips as TIFFs served in byte ranges, credited to Jung v004.
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { LabManifest } from "../scripts/build/learn/data.ts";
import { fileSizes, totalBytes } from "../scripts/build/learn/cap.ts";
import { STAR_FILES } from "../scripts/build/learn/star.ts";
import { readCourse } from "../scripts/learn/course-files.ts";
import { SAMPLE_COLUMNS } from "../scripts/learn/sample-files.ts";
import { checkInput, readCsv, readManifest, unknownMemberErrors, type CsvTable } from "../scripts/learn/star-check.ts";
import { ARTIFACTS, csvRows, distPath, learnManifest, openDuckDB, ORIGIN, records, repoPath, sha256, sqlText, type DuckDB } from "./helpers.ts";

const CAP = 120_000_000; // the owner's cap (004 §4.4; raised from 50 MB in L3, H5)
const PAGES = ["manifest.json", "index.html"];
const LOADER = "postgis/learn_curriculum.sql";
const SAMPLE_FILES = ["occurrences.parquet", "occurrences.csv", "datasets.csv"];
const SAMPLE_CSV = repoPath("data/raw/gbif-sample/sample.csv");
const REGISTRATION = repoPath("data/gbif-learn-sample/registration.json");

const builtSizes = () => fileSizes(pathToFileURL(distPath("learn/data/")));
const readJson = async (path: string) => JSON.parse(await readFile(repoPath(path), "utf8"));
// The reader the manifest's columns and rows come from (scripts/build/learn/data.ts labManifest).
const reader = (name: string) => name.endsWith(".parquet")
  ? `read_parquet(${sqlText(`${ORIGIN}/learn/data/${name}`)})`
  : `read_csv(${sqlText(`${ORIGIN}/learn/data/${name}`)}, header = true, sample_size = -1)`;

let manifest: LabManifest;
let contributions: { records: number; datasets: Record<string, number>; sample: { sha256: string } };
let datasets: { key: string; title: string; publisher: string; doi: string | null; license: string }[];
let db: DuckDB;
test.beforeAll(async () => {
  manifest = await learnManifest();
  contributions = await readJson("data/gbif-learn-sample/contributions.json");
  const all: typeof datasets = (await readJson("data/raw/gbif-sample/datasets.json")).datasets;
  datasets = all.filter((d) => Object.hasOwn(contributions.datasets, d.key)).sort((a, b) => (a.key < b.key ? -1 : 1));
  db = await openDuckDB();
});
test.afterAll(() => db.close());

test("the manifest lists exactly the folder's files; each returns 200 with its sha256 and size", async ({ request }) => {
  const built = Object.keys(await builtSizes()).filter((f) => !PAGES.includes(f));
  expect(Object.keys(manifest.files)).toEqual(built);
  for (const [name, f] of Object.entries(manifest.files)) {
    const res = await request.get(`/learn/data/${name}`);
    expect(res.status(), name).toBe(200);
    const body = await res.body();
    expect({ bytes: body.length, sha256: sha256(body) }, name).toEqual({ bytes: f.bytes, sha256: f.sha256 });
  }
});

test("Parquet and CSV: rows and columns as the manifest says, CSV headers its column names", async ({ request }) => {
  const tabular = Object.entries(manifest.files).filter(([name]) => /\.(parquet|csv)$/.test(name));
  expect(tabular.length).toBeGreaterThan(0);
  // The manifest's types are the build's reader's: GeoParquet's geom as plain WKB (BLOB), never converted (plan D9.2).
  await db.rows("SET enable_geoparquet_conversion = false");
  for (const [name, f] of tabular) {
    const columns = await db.rows(`SELECT column_name AS name, column_type AS type FROM (DESCRIBE SELECT * FROM ${reader(name)})`);
    expect(columns, name).toEqual(f.columns);
    const [{ n }] = await db.rows(`SELECT count(*)::INTEGER AS n FROM ${reader(name)}`);
    expect(n, name).toBe(f.rows);
    if (name.endsWith(".csv")) {
      const header = (await (await request.get(`/learn/data/${name}`)).text()).split("\n")[0];
      expect(header, name).toBe(f.columns!.map((c) => c.name).join(","));
    }
  }
  await db.rows("RESET enable_geoparquet_conversion");
});

test("occurrences hold data/'s sample.csv records; datasets.csv its datasets.json entries", async () => {
  const columns = SAMPLE_COLUMNS.join(", ");
  const committed = `SELECT ${columns} FROM read_csv(${sqlText(SAMPLE_CSV)}, header = true, sample_size = -1)`;
  for (const name of ["occurrences.parquet", "occurrences.csv"]) {
    const served = `SELECT ${columns} FROM ${reader(name)}`;
    const [diff] = await db.rows(`SELECT
      (SELECT count(*) FROM (${served} EXCEPT ALL ${committed}))::INTEGER AS extra,
      (SELECT count(*) FROM (${committed} EXCEPT ALL ${served}))::INTEGER AS missing,
      (SELECT count(*) FROM (${served}))::INTEGER AS n`);
    expect(diff, name).toEqual({ extra: 0, missing: 0, n: contributions.records });
  }

  expect(datasets.length).toBe(Object.keys(contributions.datasets).length);
  expect(await csvRows(db, `${ORIGIN}/learn/data/datasets.csv`)).toEqual(datasets.map((d) => ({
    dataset_key: d.key, title: d.title, publisher: d.publisher, doi: d.doi, license: d.license,
  })));
});

test("the loader's tables equal counts from data/", async () => {
  const species = await records();
  const ranks = ["class", "order", "family", "genus"] as const;
  const provenance = { ...(await readJson("data/learn/shapes.json")).files, ...(await readJson("data/learn/habitat.json")).files };
  const expected: Record<string, number> = {
    taxa: new Set(species.flatMap((s) => ranks.map((r) => s.taxonomy[r]))).size,
    species: species.length,
    sources: new Set(species.flatMap((s) => s.sources.map((x) => x.source))).size,
    species_sources: species.reduce((n, s) => n + s.sources.reduce((m, x) => m + x.fields.length, 0), 0),
    countries: (await readJson("data/countries.json")).rows.length,
    species_countries: species.reduce((n, s) => n + (s.range.countriesWithOpenRecords?.length ?? 0), 0),
    datasets: Object.keys(contributions.datasets).length,
    occurrences: contributions.records,
    // Every provenance entry with rows is a lab table (the clips' .tif files have none: they're in habitat_clips).
    ...Object.fromEntries(Object.entries<{ rows?: number }>(provenance).filter(([, f]) => f.rows !== undefined)
      .map(([file, { rows }]) => [file.replace(/\.\w+$/, ""), rows])),
  };
  expect(Object.keys(expected)).toHaveLength(16);
  expect(manifest.files[LOADER]?.tables).toEqual(expected);
});

test("the folder is at most 120,000,000 bytes; the manifest's total is its files'", async () => {
  const sizes = await builtSizes();
  expect(totalBytes(sizes)).toBeLessThanOrEqual(CAP);
  expect(manifest.cap).toBe(CAP);
  expect(manifest.bytes).toBe(totalBytes(Object.fromEntries(Object.entries(sizes).filter(([f]) => !PAGES.includes(f)))));
  console.log(`dist/learn/data/: ${totalBytes(sizes)} bytes (cap ${CAP})`);
});

test("every file has sources, each CC BY source a citation", () => {
  for (const [name, f] of Object.entries(manifest.files)) {
    expect(f.sources.length, name).toBeGreaterThan(0);
    for (const s of f.sources) if (s.license.startsWith("CC BY")) expect(s.citation.trim(), `${name}: ${s.name}`).not.toBe("");
  }
});

test("the sample files carry both DOIs, as registration.json records them", async () => {
  test.skip(!existsSync(REGISTRATION), "no learn-sample GBIF registration yet");
  const registration = await readJson("data/gbif-learn-sample/registration.json");
  expect(manifest.dois).toEqual({ download: registration.originalDownloadDOI, sample: registration.doi });
  for (const name of SAMPLE_FILES) {
    const gbif = manifest.files[name]!.sources.find((s) => s.datasets);
    expect(gbif, name).toMatchObject({ doi: registration.originalDownloadDOI, derivedDataset: { doi: registration.doi, citation: registration.citation } });
  }
});

test("inputs: the served /v1 files' sha256 and the committed sample's", async ({ request }) => {
  for (const [file, want] of Object.entries(manifest.inputs.v1)) {
    const body = await (await request.get(`/v1/${file}`)).body();
    expect({ bytes: body.length, sha256: sha256(body) }, file).toEqual(want);
  }
  expect(manifest.inputs.sample).toEqual({
    file: "data/raw/gbif-sample/sample.csv", sha256: sha256(await readFile(SAMPLE_CSV)), rows: contributions.records,
  });
  expect(manifest.inputs.sample.sha256).toBe(contributions.sample.sha256);
});

test("the star: the manifest lists star/; each served file passes the input check; unknown members; NA is text", async ({ request }) => {
  expect(Object.keys(manifest.files).filter((f) => f.startsWith("star/")).sort()).toEqual([...STAR_FILES, "star/manifest.json"].sort());
  const dir = await mkdtemp(join(tmpdir(), "critwire-e2e-star-"));
  try {
    const fetchTo = async (name: string) => {
      const res = await request.get(`/learn/data/star/${name}`);
      expect(res.status(), name).toBe(200);
      await writeFile(join(dir, name), await res.body());
    };
    await fetchTo("manifest.json");
    const star = readManifest(dir);
    expect(Object.keys(star.files).map((f) => `star/${f}`).sort()).toEqual([...STAR_FILES].sort());
    for (const f of Object.keys(star.files)) await fetchTo(f);
    const tables = new Map<string, CsvTable>();
    for (const f of Object.keys(star.files)) {
      const r = await checkInput(dir, `star/${f}`);
      expect(r.errors, f).toEqual([]);
      console.log(r.line!("learn-data"));
      tables.set(f, await readCsv(join(dir, f)));
    }
    expect(unknownMemberErrors(tables)).toEqual([]);
    expect(tables.get("dim_country.csv")!.rows.find((r) => r[0] === "NA")?.[1]).toBe("Namibia");
    // Every Power BI block's inputs (p1's later), against the served files.
    const inputs = (await readCourse()).pages.flatMap((p) => p.blocks).filter((b) => b.engine === "powerbi").flatMap((b) => b.inputs);
    expect(inputs.length).toBeGreaterThan(0);
    for (const input of inputs) expect((await checkInput(dir, input)).errors, input).toEqual([]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the habitat files: served as habitat.json records them, credited to Jung v004 with no stand-in", async ({ request }) => {
  const habitat = await readJson("data/learn/habitat.json");
  expect(habitat.standIn).toBeUndefined();
  const names = ["clips/cr.tif", "clips/tas.tif", "country_habitats.parquet", "habitat_classes.parquet", "habitat_clips.parquet", "occurrence_habitats.parquet"];
  expect(Object.keys(habitat.files).sort()).toEqual(names);
  for (const [name, want] of Object.entries<{ bytes: number; sha256: string }>(habitat.files)) {
    const body = await (await request.get(`/learn/data/${name}`)).body();
    expect({ bytes: body.length, sha256: sha256(body) }, name).toEqual({ bytes: want.bytes, sha256: want.sha256 });
    for (const s of manifest.files[name]!.sources.filter((x) => x.name.startsWith("Jung"))) {
      expect(s.name, name).toBe("Jung et al. 2020, habitat map v004");
      expect(s.doi, name).toBe("10.5281/zenodo.4058819");
    }
    expect(manifest.files[name]!.sources.some((x) => x.name.startsWith("Jung")), name).toBe(true);
  }
  expect(JSON.stringify(manifest)).not.toContain("stand-in");
});

test("occurrence_habitats: one row per sample record; every class code, there and in country_habitats, is a habitat_classes row", async () => {
  const committed = `read_csv(${sqlText(SAMPLE_CSV)}, header = true, sample_size = -1)`;
  const [r] = await db.rows(`SELECT
    (SELECT count(*) FROM ${reader("occurrence_habitats.parquet")})::INTEGER AS n,
    (SELECT count(DISTINCT occurrence_id) FROM ${reader("occurrence_habitats.parquet")})::INTEGER AS ids,
    (SELECT count(*) FROM (SELECT occurrence_id FROM ${reader("occurrence_habitats.parquet")} EXCEPT SELECT id FROM ${committed}))::INTEGER AS extra,
    (SELECT count(*) FROM (SELECT id FROM ${committed} EXCEPT SELECT occurrence_id FROM ${reader("occurrence_habitats.parquet")}))::INTEGER AS missing,
    (SELECT count(*) FROM ${reader("occurrence_habitats.parquet")} WHERE habitat_code IS NOT NULL
       AND habitat_code NOT IN (SELECT code FROM ${reader("habitat_classes.parquet")}))::INTEGER AS unknown_record_codes,
    (SELECT count(*) FROM ${reader("country_habitats.parquet")}
       WHERE habitat_code NOT IN (SELECT code FROM ${reader("habitat_classes.parquet")}))::INTEGER AS unknown_country_codes`);
  expect(r).toEqual({ n: contributions.records, ids: contributions.records, extra: 0, missing: 0, unknown_record_codes: 0, unknown_country_codes: 0 });
});

test("clips/*.tif start with TIFF's magic and are served in byte ranges (206, the same bytes)", async ({ request }) => {
  for (const name of ["clips/cr.tif", "clips/tas.tif"]) {
    const whole = await (await request.get(`/learn/data/${name}`)).body();
    expect([...whole.subarray(0, 4)], name).toEqual([0x49, 0x49, 0x2a, 0x00]); // "II*\0": little-endian TIFF
    const part = await request.get(`/learn/data/${name}`, { headers: { Range: "bytes=0-1023" } });
    expect(part.status(), name).toBe(206);
    expect(Buffer.compare(await part.body(), whole.subarray(0, 1024)), name).toBe(0);
  }
});

const cellTexts = (page: Page, rows: string) =>
  page.locator(rows).evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent!.trim())));

test("the index lists every file, every sample dataset and both DOIs", async ({ page }) => {
  await page.goto("/learn/data/");
  const files = await page.locator("#files tbody tr td:first-child a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  expect(files).toEqual(Object.keys(manifest.files).map((name) => `/learn/data/${name}`));

  const rows = await cellTexts(page, "#datasets tbody tr");
  expect(rows.map(([title, publisher, doi, license, n]) => ({ title, publisher, doi, license, records: Number(n!.replaceAll(",", "")) })))
    .toEqual(datasets.map((d) => ({ title: d.title, publisher: d.publisher, doi: d.doi ?? "none", license: d.license, records: contributions.datasets[d.key] })));

  for (const doi of [manifest.dois.download, manifest.dois.sample]) {
    expect(doi).toBeTruthy();
    await expect(page.locator(`#sample a[href="https://doi.org/${doi}"]`)).toBeVisible();
  }

  // The habitat summaries are estimates from a map, and say so; nothing is a stand-in any more.
  for (const name of ["country_habitats.parquet", "occurrence_habitats.parquet"]) {
    await expect(page.locator(`#files tbody tr:has(a[href="/learn/data/${name}"]) .note`), name).toContainText(/estimated/i);
  }
  await expect(page.locator("main")).not.toContainText("stand-in");
});

async function screenshot(page: Page, info: TestInfo, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto("/learn/data/");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  const path = `${ARTIFACTS}/learn-data-${width}.png`;
  await page.screenshot({ path, fullPage: true });
  await info.attach(`learn-data-${width}`, { path, contentType: "image/png" });
}
test("screenshot at 1280 px", ({ page }, info) => screenshot(page, info, 1280));
test("fits a 375 px phone screen; screenshot", ({ page }, info) => screenshot(page, info, 375));
