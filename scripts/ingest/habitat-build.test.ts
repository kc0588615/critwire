// HR1–HR6 (L3 §1.2, §1.3, §1.6; §1.7 #3, 4, 5, 8): buildHabitat checks habitat.py's report and outputs before anything
// reaches data/learn/, and the run's work folder and --downloads rule. Written before the code, seen failing first.
// Offline, no venv: a fake habitat.py (a node script) per case, the real country_shapes.parquet, habitat_classes.parquet
// and habitat.json copied into a temp data/learn/. Failure modes:
// HR1: a clean run writes other files than the four outputs + clips/ + habitat.json, or rows that aren't the rules'
//      (a record outside every layer must be a NULL row), or habitat.json with a date, a lost habitat_classes entry,
//      sha256s that aren't the files', or the run isn't byte-identical when repeated.
// HR2: a non-zero layer or a clip value whose code isn't in habitat_classes passes (an all-zero one must pass).
// HR3: a layer set other than LAYER_CODES, a grid other than EPSG:4326, or a clip whose counts disagree with its cells passes.
// HR4: a record outside the 1 km grid passes, or Σ estimate ÷ Σ outline outside ±2 % passes.
// HR5: a broken report (exit, not JSON, a missing or an extra output) leaves anything in data/learn/ changed.
// HR6: --downloads inside the repository is accepted, or the work folder survives a failed run.
// HR7 (H5 design 2): habitat_clips isn't one row per kept tile (clip, tile, rast) in (clip, tile) order, an all-nodata
//      tile is kept, habitat.json lacks a clip's kept tiles and tile size, clips.json lacks the tile size or a clip's
//      country, or a tile habitat.py reports masked still holds cells, or its tile count isn't the clip's tile grid.
import { test } from "node:test";
import assert from "node:assert/strict";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { withOfflineDuckDb, sqlText } from "../build/duckdb.ts";
import { buildHabitat, HABITAT_INPUTS, LAYER_CODES, parseHabitatArgs, rasterWkb, withWorkDir, type ZenodoFile } from "./habitat.ts";

const LEARN = new URL("../../data/learn/", import.meta.url);
const REPO = fileURLToPath(new URL("../../", import.meta.url));
const COPIED = ["country_shapes.parquet", "habitat_classes.parquet", "habitat.json", "country_habitats.parquet"];
const RECORDS = [{ id: 3, longitude: 0.5, latitude: 0.5 }, { id: 1, longitude: -84, latitude: 10 }, { id: 2, longitude: 147.3, latitude: -42.9 }];
const tmp = (prefix: string) => mkdtempSync(join(tmpdir(), `critwire-${prefix}-`));
const zenodo = (dir: string) => Object.fromEntries(Object.entries(HABITAT_INPUTS).map(([name, pin]) => {
  writeFileSync(join(dir, name), `${name}\n`);
  return [name, { path: join(dir, name), url: pin.url, bytes: pin.bytes, md5: pin.md5, sha256: "f".repeat(64) }];
})) as Record<keyof typeof HABITAT_INPUTS, ZenodoFile>;

// A fake habitat.py: writes its outputs into --out and prints a report, broken as `mode` says.
const FAKE = `
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const [mode, codes, ...rest] = process.argv.slice(2);
const arg = (name) => rest[rest.indexOf(name) + 1];
const out = arg("--out");
for (const a of ["--fractions", "--composite", "--shapes", "--records", "--clips"]) readFileSync(arg(a));
const { tileSize, clips } = JSON.parse(readFileSync(arg("--clips"), "utf8"));
if (Object.keys(clips).join() !== "cr,tas" || tileSize !== 2 || clips.cr.country !== "CR" || clips.tas.country !== "AU") { console.error("clips.json", tileSize, clips); process.exit(3); }
if (readFileSync(arg("--records"), "utf8") !== "id,longitude,latitude\\n1,-84,10\\n2,147.3,-42.9\\n3,0.5,0.5\\n") process.exit(4);
if (mode === "exit") { console.error("boom"); process.exit(1); }
const write = (name, body) => { if (!(mode === "missing" && name === "clip_tas.tif")) writeFileSync(join(out, name), body); };
write("country_layer_km2.csv", "country,code,km2\\nCR,104,30000.123\\nCR,105,21000.5\\nCR,1000,500\\nTT,1405,0.004\\n");
write("outline_km2.csv", "country,km2,cells\\nCR," + (mode === "ratio" ? 55500 : 51000) + ",60000\\nTT,0.005,1\\nVA,0.44,0\\n");
write("record_fractions.csv", "id,code,fraction\\n1,104,600\\n1,105,400\\n2,1000,900\\n2,600,100\\n");
const u16 = (xs) => Buffer.from(new Uint16Array(xs).buffer);
// cr: 3 × 2 cells, tiles 0 (2 × 2) and 1 (1 × 2); tas: 4 × 2 cells, tile 1 masked (all nodata).
const cells = { cr: [104, 104, 105, 0, mode === "clip-class" ? 1500 : 600, 104], tas: [1405, 1405, 0, 0, 1401, 0, 0, 0] };
const sizes = { cr: [3, 2], tas: [4, 2] };
const tiles = { cr: mode === "tile-count" ? 3 : 2, tas: 2 };
const masked = { cr: [], tas: mode === "masked-cells" ? [0, 1] : [1] };
for (const id of ["cr", "tas"]) { write("clip_" + id + ".bin", u16(cells[id])); write("clip_" + id + ".tif", "II*\\0 " + id); }
if (mode === "extra") writeFileSync(join(out, "stray.txt"), "x");
const counts = (xs) => { const c = {}; for (const x of xs) if (x !== 0) c[x] = (c[x] ?? 0) + 1; return c; };
const clip = (id) => ({ crs: "EPSG:4326", dtype: "uint16", layout: "COG", width: sizes[id][0], height: sizes[id][1],
  ulx: clips[id].west, uly: clips[id].north, scale: 0.25, nodata: 0,
  values: mode === "clip-count" && id === "cr" ? { ...counts(cells[id]), 104: 2 } : counts(cells[id]),
  nodataCells: cells[id].filter((x) => x === 0).length, tiles: tiles[id], maskedTiles: masked[id] });
let layers = JSON.parse(codes).map((code) => ({ member: "lvl2_frac_1km_ver004/x__" + code + "_n__ver004.tif", code, nonZero: [104, 105, 600, 1000, 1405].includes(code) ? 9 : 0, max: 1000 }));
if (mode === "layer-class") layers = layers.map((l) => (l.code === 509 ? { ...l, nonZero: 5 } : l));
if (mode === "layers") layers = layers.filter((l) => l.code !== 1405);
const report = { tools: { python: "3.12.3", rasterio: "1.5.2" }, grid: { crs: mode === "crs" ? "EPSG:3857" : "EPSG:4326", width: 4, height: 2, transform: [90, 0, -180, 0, -90, 90], bandRows: 2 },
  layers, outlines: 3, recordsOutside: mode === "outside" ? [2] : [], clips: { cr: clip("cr"), tas: clip("tas") }, timings: { fractions: 1, clips: 1 } };
console.log(mode === "json" ? "not json" : JSON.stringify(report));
`;

async function run(mode: string): Promise<{ dir: string; dest: string; error?: Error }> {
  const dir = tmp("hr");
  const dest = join(dir, "data-learn");
  const work = join(dir, "work");
  for (const d of [dest, work]) mkdirSync(d);
  for (const f of COPIED) copyFileSync(new URL(f, LEARN), join(dest, f));
  const fake = join(dir, "fake-habitat.mjs");
  writeFileSync(fake, FAKE);
  try {
    await buildHabitat({ work, dest: pathToFileURL(dest + "/"), records: RECORDS, zenodo: zenodo(dir), tileSize: 2, python: [process.execPath, fake, mode, JSON.stringify(LAYER_CODES)] });
    return { dir, dest };
  } catch (error) {
    return { dir, dest, error: error as Error };
  }
}

function assertUntouched(dest: string): void {
  assert.deepEqual(readdirSync(dest).sort(), [...COPIED].sort());
  for (const f of COPIED) assert.deepEqual(readFileSync(join(dest, f)), readFileSync(new URL(f, LEARN)), f);
}

const rows = (path: string, sql: string) => withOfflineDuckDb(async (con) =>
  (await con.runAndReadAll(sql.replace("$f", `read_parquet(${sqlText(path)})`))).getRowsJson());

test("HR1 a clean run writes the outputs and habitat.json (rules applied, classes entry kept, no date), byte-identical twice", async () => {
  const first = await run("ok");
  const second = await run("ok");
  try {
    assert.equal(first.error, undefined);
    const outputs = ["country_habitats.parquet", "occurrence_habitats.parquet", "habitat_clips.parquet", "clips/cr.tif", "clips/tas.tif"];
    assert.deepEqual(readdirSync(first.dest).sort(), [...COPIED, "clips", "occurrence_habitats.parquet", "habitat_clips.parquet"].sort());
    assert.deepEqual(readdirSync(join(first.dest, "clips")).sort(), ["cr.tif", "tas.tif"]);
    const prov = JSON.parse(readFileSync(join(first.dest, "habitat.json"), "utf8"));
    const old = JSON.parse(readFileSync(new URL("habitat.json", LEARN), "utf8"));
    assert.deepEqual(prov.files["habitat_classes.parquet"], old.files["habitat_classes.parquet"]);
    assert.deepEqual(Object.keys(prov.files).sort(), [...outputs, "habitat_classes.parquet"].sort());
    for (const f of outputs) {
      const bytes = readFileSync(join(first.dest, f));
      assert.equal(prov.files[f].bytes, bytes.length, f);
      assert.equal(prov.files[f].sha256, (await import("node:crypto")).createHash("sha256").update(bytes).digest("hex"), f);
      assert.equal(prov.files[f].rows === undefined, f.endsWith(".tif"), `${f}: rows for Parquet only`);
      assert.deepEqual(bytes, readFileSync(join(second.dest, f)), `${f} byte-identical on a re-run`);
    }
    assert.deepEqual(readFileSync(join(first.dest, "habitat.json")), readFileSync(join(second.dest, "habitat.json")));
    assert.equal(prov.standIn, undefined);
    assert.equal(prov.source.version, "004");
    assert.deepEqual(prov.inputs.records, { sha256: prov.inputs.records.sha256, count: 3 });
    assert.match(prov.inputs.countryShapes.sha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(Object.keys(prov.inputs.zenodo).sort(), Object.keys(HABITAT_INPUTS).sort());
    assert.deepEqual(prov.layers.allZero.includes(509), true, "an all-zero layer whose code isn't a class passes");
    assert.deepEqual(prov.measured.outlinesWithNoCell, ["VA"]);
    assert.equal(prov.measured.nullClassRecords, 1);
    assert.equal(JSON.stringify(prov).match(/20\d\d-\d\d-\d\d/), null, "no date");

    assert.deepEqual(await rows(join(first.dest, "country_habitats.parquet"), "SELECT country_code, habitat_code, est_area_km2::VARCHAR FROM $f"),
      [["CR", 104, "30000.12"], ["CR", 105, "21000.50"]]);
    assert.deepEqual(await rows(join(first.dest, "country_habitats.parquet"), "SELECT list(column_type) FROM (DESCRIBE SELECT * FROM $f)"),
      [[["VARCHAR", "INTEGER", "DECIMAL(12,2)"]]]);
    assert.deepEqual(await rows(join(first.dest, "occurrence_habitats.parquet"), "SELECT occurrence_id::INTEGER, habitat_code FROM $f"),
      [[1, 104], [2, 600], [3, null]]);
    const tile = (width: number, ulx: number, uly: number, xs: number[]) => Buffer.from(rasterWkb({ width, height: xs.length / width, ulx, uly,
      scale: 0.25, srid: 4326, nodata: 0, pixels: new Uint8Array(new Uint16Array(xs).buffer) })).toString("hex").toUpperCase();
    assert.deepEqual(await rows(join(first.dest, "habitat_clips.parquet"), "SELECT clip, tile, hex(rast) FROM $f"), [
      ["cr", 0, tile(2, -85.91, 11.19, [104, 104, 0, 600])],
      ["cr", 1, tile(1, -85.91 + 0.5, 11.19, [105, 104])],
      ["tas", 0, tile(2, 144.64, -40.64, [1405, 1405, 1401, 0])],
    ], "one row per kept tile, in (clip, tile) order; tas's masked tile 1 left out");
    assert.deepEqual(await rows(join(first.dest, "habitat_clips.parquet"), "SELECT list(column_name || ' ' || column_type) FROM (DESCRIBE SELECT * FROM $f)"),
      [[["clip VARCHAR", "tile INTEGER", "rast BLOB"]]]);
    assert.equal(prov.files["habitat_clips.parquet"].rows, 3);
    assert.deepEqual([prov.clips.cr.tiles, prov.clips.cr.tileSize, prov.clips.tas.tiles, prov.clips.tas.tileSize], [2, 2, 1, 2]);
  } finally {
    rmSync(first.dir, { recursive: true, force: true });
    rmSync(second.dir, { recursive: true, force: true });
  }
});

for (const [mode, message] of [
  ["layer-class", /unknown class 509 \(layer lvl2_frac_1km_ver004\/x__509_n__ver004\.tif\)/],
  ["clip-class", /unknown class 1500 \(clip cr\)/],
  ["layers", /layer codes ≠ LAYER_CODES: missing 1405/],
  ["crs", /grid EPSG:3857, expected EPSG:4326/],
  ["clip-count", /clip cr: value counts differ from its cells/],
  ["outside", /records outside the 1 km grid: 2/],
  ["ratio", /Σ estimate ÷ Σ outline = 0\.91\d+, outside ±2 %/],
  ["exit", /habitat\.py exited 1/],
  ["json", /habitat\.py: report is not JSON/],
  ["missing", /habitat\.py: clip_tas\.tif missing/],
  ["extra", /habitat\.py: unexpected outputs stray\.txt/],
  ["masked-cells", /habitat\.py: clip tas: masked tile 0 holds cells/],
  ["tile-count", /habitat\.py: clip cr: 3 tiles, expected 2 × 1/],
] as const) {
  test(`HR2–HR5 ${mode}: buildHabitat refuses and data/learn/ is unchanged`, async () => {
    const { dir, dest, error } = await run(mode);
    try {
      assert.match(error?.message ?? "no error", message);
      assertUntouched(dest);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
}

test("HR6 --downloads must be outside the repository; the work folder is removed after a failure", async () => {
  assert.deepEqual(parseHabitatArgs([], REPO), { downloads: null });
  const outside = tmp("hr6-dl");
  try {
    assert.deepEqual(parseHabitatArgs(["--downloads", outside], REPO), { downloads: outside });
  } finally {
    rmSync(outside, { recursive: true, force: true });
  }
  for (const inside of [REPO, join(REPO, "tmp-downloads"), "data", "."]) {
    assert.throws(() => parseHabitatArgs(["--downloads", inside], REPO), /--downloads .* is inside the repository/, inside);
  }
  assert.throws(() => parseHabitatArgs(["--downloads"], REPO), /usage: pnpm ingest habitat \[--downloads <dir>\]/);
  assert.throws(() => parseHabitatArgs(["--new"], REPO), /usage: pnpm ingest habitat \[--downloads <dir>\]/);

  let seen = "";
  await assert.rejects(withWorkDir("critwire-hr6-", async (dir) => {
    seen = dir;
    writeFileSync(join(dir, "partial.bin"), "x");
    throw new Error("late failure");
  }), /late failure/);
  assert.ok(seen.startsWith(tmpdir()));
  assert.equal(existsSync(seen), false);
});
