// The habitat ingest (L3 plan §1, 004 §4.1): pnpm ingest habitat [--downloads <dir>]. From Jung et al. 2020 v004
// (Zenodo record 4058819, CC BY 4.0): every country's estimated km² per level-2 class (003 §5's method 3), each
// published record's class, and two 100 m clips. This file holds the pins, the pure rules and every check;
// scripts/ingest/habitat.py does the raster and geometry work (no network, no class rule) and reports. Only after every
// check passed are the outputs copied into data/learn/, with habitat.json (inputs, method, layers, clips, tools,
// measured, files). No date in habitat.json, so a re-run is byte-identical.
import { createHash } from "node:crypto";
import { rmSync } from "node:fs";
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createTable, sqlPath, withOfflineDuckDb } from "../build/duckdb.ts";
import { childFile } from "../build/paths.ts";
import { deriveAll, readDeriveInputs } from "../derive/pipeline.ts";
import type { OccurrenceRow } from "../derive/sample.ts";
import { downloadFile, hashFile } from "../http.ts";
import { readJson, writeJson } from "../json.ts";
import { labDataDir, readLabFiles } from "../learn/lab-files.ts";
import { runPython, venvPython } from "./python.ts";

const ZENODO = "https://zenodo.org/api/records/4058819/files";
// File name in the download folder → pinned source (Zenodo publishes md5; the run records each file's sha256).
export const HABITAT_INPUTS = {
  "lvl2_frac_1km_ver004.zip": { url: `${ZENODO}/lvl2_frac_1km_ver004.zip/content`, bytes: 695_484_415, md5: "bd8508db8118f14d8da7bfa7950523d4" },
  "iucn_habitatclassification_composite_lvl2_ver004.zip": {
    url: `${ZENODO}/iucn_habitatclassification_composite_lvl2_ver004.zip/content`, bytes: 2_454_999_319, md5: "d9bad21c2c9e80814f59a6e57d934fa9",
  },
} as const;

// The 1 km fractions zip's layer codes (its members `…lvl2__<code>_<name>__ver004.tif`, read 2026-10-28), ascending.
export const LAYER_CODES: readonly number[] = [
  100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 200, 201, 202, 300, 301, 302, 303, 304, 305, 306, 307, 308,
  400, 401, 402, 403, 404, 405, 406, 407, 500, 501, 502, 503, 504, 505, 506, 507, 508, 509, 510, 511, 512, 513, 514,
  515, 516, 517, 518, 600, 800, 801, 802, 803, 900, 901, 908, 909, 1000, 1001, 1002, 1003, 1004, 1100, 1101, 1102,
  1103, 1104, 1105, 1106, 1200, 1206, 1207, 1400, 1401, 1402, 1403, 1404, 1405,
];
// The open-water overlay (003 §5): drawn over the land partition, so never a country summary row or a record's class.
export const OVERLAY_CODES: readonly number[] = [901, 1000, 1001, 1002, 1003, 1004];
const OVERLAY = new Set(OVERLAY_CODES);

// The two 100 m clips: fixed 0.75° study windows where the sample's records are densest (plan §1.4). Degrees; the run
// snaps them outward to the composite's grid.
export const CLIPS = {
  cr: { west: -84.2, south: 9.85, east: -83.45, north: 10.6 },
  tas: { west: 147.25, south: -43.1, east: 148, north: -42.35 },
} as const;

// One layer's value in a record's 1 km cell: code and fraction (0–1000).
export interface LayerFraction { code: number; fraction: number }

// A record's class: the partition code with the largest fraction, ties to the lowest code; null when none is above 0
// (a record outside every layer). Throws on a negative or non-finite fraction.
export function pickClass(fractions: readonly LayerFraction[]): number | null {
  let best: LayerFraction | null = null;
  for (const f of fractions) {
    if (!Number.isFinite(f.fraction) || f.fraction < 0) throw new Error(`code ${f.code}: fraction ${f.fraction}`);
    if (OVERLAY.has(f.code) || f.fraction === 0) continue;
    if (!best || f.fraction > best.fraction || (f.fraction === best.fraction && f.code < best.code)) best = f;
  }
  return best?.code ?? null;
}

// habitat.py's unrounded estimate for one country and layer.
export interface CountryLayerKm2 { country: string; code: number; km2: number }
// country_habitats' row (the lab table's columns).
export interface CountryHabitatRow { country_code: string; habitat_code: number; est_area_km2: number }

// country_habitats' rows: partition codes only, km² rounded to 0.01 (half up on the exact value, toFixed), rows that
// round to 0 dropped, sorted by (country, code). Throws on a negative or non-finite estimate, or a key given twice.
export function countryHabitatRows(estimates: readonly CountryLayerKm2[]): CountryHabitatRow[] {
  const seen = new Set<string>();
  const rows: CountryHabitatRow[] = [];
  for (const { country, code, km2 } of estimates) {
    const key = `${country} ${code}`;
    if (!Number.isFinite(km2) || km2 < 0) throw new Error(`${key}: km² ${km2}`);
    if (seen.has(key)) throw new Error(`${key} twice`);
    seen.add(key);
    const rounded = Number(km2.toFixed(2));
    if (!OVERLAY.has(code) && rounded >= 0.01) rows.push({ country_code: country, habitat_code: code, est_area_km2: rounded });
  }
  return rows.sort((a, b) => (a.country_code < b.country_code ? -1 : a.country_code > b.country_code ? 1 : a.habitat_code - b.habitat_code));
}

// One clip as PostGIS raster WKB input: north-up, square cells of `scale` degrees from the upper-left corner (ulx, uly);
// pixels = raw little-endian uint16, row-major from the upper left (habitat.py's clip_<id>.bin).
export interface RasterInput { width: number; height: number; ulx: number; uly: number; scale: number; srid: number; nodata: number; pixels: Uint8Array }

const RASTER_HEADER = 61;
const PT_16BUI = 6;
const HAS_NODATA = 0x40;

// PostGIS raster WKB, version 0, little-endian: the 61 B raster header, then one 16BUI band (1 B pixel type and flags,
// 2 B nodata, 2 B per cell). ST_RastFromWKB reads it.
export function rasterWkb({ width, height, ulx, uly, scale, srid, nodata, pixels }: RasterInput): Uint8Array {
  const u16 = (name: string, n: number, min = 0) => {
    if (!Number.isInteger(n) || n < min || n > 0xffff) throw new Error(`rasterWkb: ${name} ${n}`);
  };
  u16("width", width, 1);
  u16("height", height, 1);
  u16("nodata", nodata);
  if (!(Number.isFinite(scale) && scale > 0)) throw new Error(`rasterWkb: scale ${scale}`);
  if (!Number.isFinite(ulx) || !Number.isFinite(uly)) throw new Error(`rasterWkb: corner ${ulx}, ${uly}`);
  if (pixels.length !== 2 * width * height) throw new Error(`rasterWkb: ${pixels.length} pixel bytes ≠ 2 × ${width} × ${height}`);
  const out = new Uint8Array(RASTER_HEADER + 3 + pixels.length);
  const v = new DataView(out.buffer);
  v.setUint8(0, 1); // little-endian
  v.setUint16(1, 0, true); // version
  v.setUint16(3, 1, true); // bands
  [scale, -scale, ulx, uly, 0, 0].forEach((x, i) => v.setFloat64(5 + 8 * i, x, true)); // scale x/y, upper left x/y, skew x/y
  v.setInt32(53, srid, true);
  v.setUint16(57, width, true);
  v.setUint16(59, height, true);
  v.setUint8(RASTER_HEADER, HAS_NODATA | PT_16BUI);
  v.setUint16(RASTER_HEADER + 1, nodata, true);
  out.set(pixels, RASTER_HEADER + 3);
  return out;
}

export type HabitatRecord = Pick<OccurrenceRow, "id" | "longitude" | "latitude">;

// The records the ingest consumes, as habitat.py reads them: id,longitude,latitude, sorted by id, JS number formatting.
export function habitatRecordsCsv(records: readonly HabitatRecord[]): string {
  const rows = [...records].sort((a, b) => a.id - b.id).map((r) => `${r.id},${r.longitude},${r.latitude}\n`);
  return `id,longitude,latitude\n${rows.join("")}`;
}

export interface RecordsFingerprint { sha256: string; count: number }
// habitat.json's `inputs.records`: the sha256 of habitatRecordsCsv and the record count.
export const recordsFingerprint = (records: readonly HabitatRecord[]): RecordsFingerprint =>
  ({ sha256: createHash("sha256").update(habitatRecordsCsv(records)).digest("hex"), count: records.length });

// What habitat.json pins of the committed inputs it was made from.
export interface HabitatFreshness { countryShapes: { sha256: string }; records: RecordsFingerprint }

// Throws unless habitat.json was made from today's country outlines (country_shapes.parquet's sha256) and today's
// published records (their fingerprint): otherwise country_habitats or occurrence_habitats describe other data.
export function assertHabitatFresh(recorded: HabitatFreshness, now: { countryShapesSha256: string; occurrences: readonly HabitatRecord[] }): void {
  const fp = recordsFingerprint(now.occurrences);
  const why = recorded.countryShapes.sha256 !== now.countryShapesSha256 ? "country_shapes.parquet changed"
    : recorded.records.sha256 !== fp.sha256 || recorded.records.count !== fp.count ? "published records changed"
    : null;
  if (why !== null) throw new Error(`data/learn/habitat.json is stale (${why}): run pnpm ingest habitat`);
}

// --- The run ---------------------------------------------------------------------------------------------------------

const REPO = fileURLToPath(new URL("../../", import.meta.url));
const PYTHON = venvPython("habitat.py");
// A Zenodo file at ~3 MB/s: the composite takes ~14 min.
const DOWNLOAD_TIMEOUT_MS = 60 * 60_000;
// Σ estimate ÷ Σ outline area over every country: a guard against unit, transform or cell-area bugs (003 §5 measured
// −0.1 % and +0.3 %).
const RATIO_TOLERANCE = 0.02;
const CLASSES = "habitat_classes.parquet";
const SHAPES = "country_shapes.parquet";
// What buildHabitat writes into data/learn/ (habitat.json besides), and what habitat.py writes into its --out.
export const HABITAT_OUTPUTS = ["country_habitats.parquet", "occurrence_habitats.parquet", "habitat_clips.parquet", "clips/cr.tif", "clips/tas.tif"] as const;
const CLIP_IDS = Object.keys(CLIPS) as (keyof typeof CLIPS)[];
const PY_OUTPUTS = ["country_layer_km2.csv", "outline_km2.csv", "record_fractions.csv", ...CLIP_IDS.flatMap((id) => [`clip_${id}.bin`, `clip_${id}.tif`])].sort();

// One downloaded Zenodo file: where it is, its pins and its sha256.
export interface ZenodoFile { path: string; url: string; bytes: number; md5: string; sha256: string }

// What habitat.py prints on stdout.
export interface HabitatReport {
  tools: Record<string, string>;
  grid: { crs: string; width: number; height: number; transform: number[]; bandRows: number };
  layers: { member: string; code: number; nonZero: number; max: number }[];
  outlines: number;
  recordsOutside: number[];
  clips: Record<keyof typeof CLIPS, {
    crs: string; dtype: string; layout: string; width: number; height: number; ulx: number; uly: number; scale: number; nodata: number;
    values: Record<string, number>; nodataCells: number;
  }>;
  timings: Record<string, number>;
}

const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const byNumber = (a: number, b: number) => a - b;

// A CSV habitat.py wrote: no quoting, the header checked, each row split into `header.length` fields.
async function readCsv(path: string, header: string): Promise<string[][]> {
  const text = await readFile(path, "utf8");
  const [first, ...lines] = text.trimEnd().split("\n");
  if (first !== header) throw new Error(`habitat.py: ${path}: header ${JSON.stringify(first)}, expected ${header}`);
  const n = header.split(",").length;
  return lines.filter((l) => l !== "").map((l, i) => {
    const f = l.split(",");
    if (f.length !== n) throw new Error(`habitat.py: ${path} line ${i + 2}: ${f.length} fields, expected ${n}`);
    return f;
  });
}
const num = (s: string, what: string): number => {
  const n = Number(s);
  if (s === "" || !Number.isFinite(n)) throw new Error(`habitat.py: ${what} ${JSON.stringify(s)}`);
  return n;
};

// Throws unless the report parses and agrees with LAYER_CODES, the classes, the grid's CRS, CLIPS and the files in outDir.
async function checkReport(stdout: string, outDir: string, classes: ReadonlySet<number>): Promise<HabitatReport> {
  let report: HabitatReport;
  try {
    report = JSON.parse(stdout) as HabitatReport;
  } catch {
    throw new Error(`habitat.py: report is not JSON: ${stdout.slice(0, 300)}`);
  }
  const files = await readdir(outDir);
  for (const name of PY_OUTPUTS) if (!files.includes(name)) throw new Error(`habitat.py: ${name} missing`);
  const unknown = files.filter((f) => !PY_OUTPUTS.includes(f));
  if (unknown.length) throw new Error(`habitat.py: unexpected outputs ${unknown.join(", ")}`);
  if (report.grid?.crs !== "EPSG:4326") throw new Error(`habitat.py: grid ${report.grid?.crs}, expected EPSG:4326`);
  const codes = (report.layers ?? []).map((l) => l.code).sort(byNumber);
  const missing = LAYER_CODES.filter((c) => !codes.includes(c));
  const extra = codes.filter((c, i) => !LAYER_CODES.includes(c) || codes.indexOf(c) !== i);
  if (missing.length || extra.length) throw new Error(`habitat.py: layer codes ≠ LAYER_CODES: missing ${missing.join(", ") || "none"}; extra ${extra.join(", ") || "none"}`);
  for (const l of report.layers) if (l.nonZero > 0 && !classes.has(l.code)) throw new Error(`habitat.py: unknown class ${l.code} (layer ${l.member})`);
  if (report.recordsOutside?.length) throw new Error(`habitat.py: records outside the 1 km grid: ${report.recordsOutside.join(", ")}`);
  if (Object.keys(report.clips ?? {}).sort().join() !== [...CLIP_IDS].sort().join()) throw new Error(`habitat.py: clips ${Object.keys(report.clips ?? {}).join(", ")}`);
  for (const id of CLIP_IDS) {
    const c = report.clips[id];
    if (c.crs !== "EPSG:4326" || c.dtype !== "uint16" || c.layout !== "COG") throw new Error(`habitat.py: clip ${id}: ${c.crs} ${c.dtype} ${c.layout}, expected EPSG:4326 uint16 COG`);
  }
  return report;
}

// A clip's cells (habitat.py's clip_<id>.bin) recounted against its report and classes; returns its raster WKB.
async function clipRaster(id: keyof typeof CLIPS, clip: HabitatReport["clips"][keyof typeof CLIPS], outDir: string, classes: ReadonlySet<number>): Promise<Uint8Array> {
  const bin = await readFile(join(outDir, `clip_${id}.bin`));
  if (bin.length !== 2 * clip.width * clip.height) throw new Error(`habitat.py: clip ${id}: ${bin.length} bytes ≠ 2 × ${clip.width} × ${clip.height}`);
  const counts = new Map<number, number>();
  for (let i = 0; i < bin.length; i += 2) {
    const v = bin.readUInt16LE(i);
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const nodataCells = counts.get(clip.nodata) ?? 0;
  counts.delete(clip.nodata);
  const values = Object.fromEntries([...counts].sort(([a], [b]) => a - b).map(([v, n]) => [String(v), n]));
  const reported = Object.fromEntries(Object.entries(clip.values).sort(([a], [b]) => Number(a) - Number(b)));
  if (JSON.stringify(values) !== JSON.stringify(reported) || nodataCells !== clip.nodataCells) {
    throw new Error(`habitat.py: clip ${id}: value counts differ from its cells`);
  }
  for (const v of counts.keys()) if (!classes.has(v)) throw new Error(`habitat.py: unknown class ${v} (clip ${id})`);
  return rasterWkb({ width: clip.width, height: clip.height, ulx: clip.ulx, uly: clip.uly, scale: clip.scale, srid: 4326, nodata: clip.nodata, pixels: bin });
}

// From the downloaded inputs (`zenodo`) and the records the build publishes: runs habitat.py in `work`, checks its
// report and outputs, applies the rules, then copies the outputs into `dest` (data/learn/) and writes dest/habitat.json.
// Nothing reaches `dest` unless every check passed. `signal` kills habitat.py.
export async function buildHabitat({ work, dest, records, zenodo, python = PYTHON, signal }: {
  work: string; dest: URL; records: readonly HabitatRecord[]; zenodo: Record<keyof typeof HABITAT_INPUTS, ZenodoFile>; python?: string[]; signal?: AbortSignal;
}): Promise<void> {
  const previous = await readJson<{ source: Record<string, string>; files: Record<string, { sha256: string }> }>(childFile(dest, "habitat.json"));
  const classesEntry = previous.files[CLASSES];
  const classesSha = sha256(await readFile(childFile(dest, CLASSES)));
  if (classesSha !== classesEntry?.sha256) throw new Error(`data/learn/${CLASSES}: sha256 ${classesSha} ≠ habitat.json's ${classesEntry?.sha256} (never edit it)`);
  const classes = new Set(await withOfflineDuckDb(async (con) =>
    (await con.runAndReadAll(`SELECT code FROM read_parquet(${sqlPath(childFile(dest, CLASSES))})`)).getRows().map((r) => Number(r[0]))));
  const shapesSha = sha256(await readFile(childFile(dest, SHAPES)));

  const recordsCsv = join(work, "records.csv");
  const clipsJson = join(work, "clips.json");
  const outDir = join(work, "out");
  await writeFile(recordsCsv, habitatRecordsCsv(records));
  await writeFile(clipsJson, JSON.stringify(CLIPS));
  await mkdir(outDir);
  const stdout = await runPython("habitat.py", python, [
    "--fractions", zenodo["lvl2_frac_1km_ver004.zip"].path, "--composite", zenodo["iucn_habitatclassification_composite_lvl2_ver004.zip"].path,
    "--shapes", fileURLToPath(childFile(dest, SHAPES)), "--records", recordsCsv, "--clips", clipsJson, "--out", outDir,
  ], signal);
  const report = await checkReport(stdout, outDir, classes);
  const layerCodes = new Set(LAYER_CODES);

  // Countries: the estimate against the outlines.
  const outlines = (await readCsv(join(outDir, "outline_km2.csv"), "country,km2,cells")).map(([country, km2, cells]) => ({ country, km2: num(km2, "outline km²"), cells: num(cells, "cells") }));
  const countries = new Set(outlines.map((o) => o.country));
  if (countries.size !== outlines.length || outlines.length !== report.outlines) throw new Error(`habitat.py: ${outlines.length} outline rows, ${countries.size} countries, ${report.outlines} outlines read`);
  const estimates = (await readCsv(join(outDir, "country_layer_km2.csv"), "country,code,km2")).map(([country, code, km2]) => {
    const row = { country, code: num(code, "code"), km2: num(km2, "km²") };
    if (!countries.has(country) || !layerCodes.has(row.code)) throw new Error(`habitat.py: country_layer_km2.csv: ${country} ${code}: unknown country or layer`);
    return row;
  });
  const estimate = estimates.filter((e) => !OVERLAY.has(e.code)).reduce((s, e) => s + e.km2, 0);
  const outlineKm2 = outlines.reduce((s, o) => s + o.km2, 0);
  const ratio = estimate / outlineKm2;
  if (!(Math.abs(ratio - 1) <= RATIO_TOLERANCE)) throw new Error(`habitat.py: Σ estimate ÷ Σ outline = ${ratio}, outside ±${RATIO_TOLERANCE * 100} % (a unit, transform or cell-area bug)`);
  const countryRows = countryHabitatRows(estimates);

  // Records: each published record's class, NULL when its cell holds no partition class.
  const ids = new Set(records.map((r) => r.id));
  const fractions = new Map<number, LayerFraction[]>();
  for (const [id, code, fraction] of await readCsv(join(outDir, "record_fractions.csv"), "id,code,fraction")) {
    const f = { code: num(code, "code"), fraction: num(fraction, "fraction") };
    if (!ids.has(num(id, "id")) || !layerCodes.has(f.code)) throw new Error(`habitat.py: record_fractions.csv: record ${id} code ${code}: unknown record or layer`);
    fractions.set(Number(id), [...(fractions.get(Number(id)) ?? []), f]);
  }
  const occurrenceRows = [...records].sort((a, b) => a.id - b.id).map((r) => ({ occurrence_id: r.id, habitat_code: pickClass(fractions.get(r.id) ?? []) }));

  const clipRows: { clip: string; rast: Uint8Array }[] = [];
  for (const id of CLIP_IDS) clipRows.push({ clip: id, rast: await clipRaster(id, report.clips[id], outDir, classes) });

  // Write into work/data/, then copy into dest.
  const staged = join(work, "data");
  await mkdir(join(staged, "clips"), { recursive: true });
  const at = (name: string) => sqlPath(pathToFileURL(join(staged, name)));
  await withOfflineDuckDb(async (con) => {
    await createTable(con, "ch", { country_code: "VARCHAR", habitat_code: "INTEGER", est_area_km2: "DOUBLE" }, countryRows);
    await con.run(`COPY (SELECT country_code, habitat_code, est_area_km2::DECIMAL(12,2) AS est_area_km2 FROM ch ORDER BY country_code, habitat_code) TO ${at("country_habitats.parquet")} (FORMAT parquet, COMPRESSION zstd)`);
    await createTable(con, "oh", { occurrence_id: "BIGINT", habitat_code: "INTEGER" }, occurrenceRows);
    await con.run(`COPY (SELECT * FROM oh ORDER BY occurrence_id) TO ${at("occurrence_habitats.parquet")} (FORMAT parquet, COMPRESSION zstd, ROW_GROUP_SIZE 100000)`);
    await createTable(con, "hc", { clip: "VARCHAR", rast: "BLOB" }, clipRows);
    await con.run(`COPY (SELECT * FROM hc ORDER BY clip) TO ${at("habitat_clips.parquet")} (FORMAT parquet, COMPRESSION zstd)`);
  });
  for (const id of CLIP_IDS) await copyFile(join(outDir, `clip_${id}.tif`), join(staged, `clips/${id}.tif`));
  const rows: Record<string, number> = { "country_habitats.parquet": countryRows.length, "occurrence_habitats.parquet": occurrenceRows.length, "habitat_clips.parquet": clipRows.length };
  const files: Record<string, unknown> = { [CLASSES]: classesEntry };
  for (const name of HABITAT_OUTPUTS) {
    const body = await readFile(join(staged, name));
    files[name] = { bytes: body.length, ...(name in rows ? { rows: rows[name] } : {}), sha256: sha256(body) };
  }

  const pixel = report.grid.transform[0];
  const habitat = {
    source: { ...previous.source, version: "004" },
    inputs: {
      zenodo: Object.fromEntries(Object.entries(zenodo).map(([name, { url, bytes, md5, sha256 }]) => [name, { url, bytes, md5, sha256 }])),
      countryShapes: { sha256: shapesSha },
      records: recordsFingerprint(records),
    },
    method: {
      countries: `method 3 (003 §5): v004's 1 km level-2 fractions (EPSG:4326, ${pixel}° cells); per country, Σ fraction ÷ 1000 × the cell's geodesic area (WGS84) over the cells whose centre is inside its Natural Earth 1:50m outline (overlapping outlines both count a shared cell); partition classes only (open-water overlay ${OVERLAY_CODES.join(", ")} left out); km² rounded to 0.01; estimated from a map, not measured`,
      records: "the record's 1 km cell: the partition class with the largest fraction, ties to the lowest code; NULL when the cell holds none; the map's class at that place, not the species' habitat",
      clips: "v004's level-2 composite at 100 m (EPSG:4326), each window snapped outward to its grid, cells unchanged; cloud-optimized GeoTIFF (DEFLATE, PREDICTOR=2, 256 px blocks, nearest-neighbour overviews); habitat_clips.parquet holds the same cells as PostGIS raster WKB",
    },
    grid: { width: report.grid.width, height: report.grid.height, transform: report.grid.transform },
    layers: { codes: LAYER_CODES, allZero: report.layers.filter((l) => l.nonZero === 0).map((l) => l.code).sort(byNumber), overlay: OVERLAY_CODES },
    clips: Object.fromEntries(CLIP_IDS.map((id) => {
      const c = report.clips[id];
      return [id, {
        bounds: { west: c.ulx, north: c.uly, east: c.ulx + c.width * c.scale, south: c.uly - c.height * c.scale },
        width: c.width, height: c.height, scale: c.scale, nodata: c.nodata, nodataCells: c.nodataCells, values: c.values,
      }];
    })),
    tools: report.tools,
    measured: {
      estimateOverOutline: Number(ratio.toFixed(6)),
      outlines: outlines.length,
      outlinesWithNoCell: outlines.filter((o) => o.cells === 0).map((o) => o.country).sort(),
      records: occurrenceRows.length,
      nullClassRecords: occurrenceRows.filter((r) => r.habitat_code === null).length,
    },
    files,
  };

  for (const name of HABITAT_OUTPUTS) {
    const to = fileURLToPath(childFile(dest, name));
    await mkdir(dirname(to), { recursive: true });
    await copyFile(join(staged, name), to);
  }
  await writeJson(childFile(dest, "habitat.json"), habitat, { canonical: true });
  console.error(`habitat.py: ${JSON.stringify(report.timings)} (s); Σ estimate ÷ Σ outline ${ratio}`);
}

// pnpm ingest habitat's arguments: --downloads <dir> (development only) keeps the zips in <dir>, outside the repository.
export function parseHabitatArgs(args: readonly string[], repo: string = REPO): { downloads: string | null } {
  if (args.length === 0) return { downloads: null };
  if (args.length !== 2 || args[0] !== "--downloads" || !args[1]) throw new Error("usage: pnpm ingest habitat [--downloads <dir>]");
  const dir = resolve(args[1]);
  const rel = relative(resolve(repo), dir);
  if (rel === "" || !(rel === ".." || rel.startsWith("../") || isAbsolute(rel))) throw new Error(`--downloads ${dir} is inside the repository: use a folder outside it`);
  return { downloads: dir };
}

// Runs fn in a fresh temp folder, removed afterwards, after a failure and on SIGINT or SIGTERM (which also abort
// fn's signal, killing a child it started, and exit).
export async function withWorkDir<T>(prefix: string, fn: (dir: string, signal: AbortSignal) => Promise<T>): Promise<T> {
  const dir = await mkdtemp(join(tmpdir(), prefix));
  const abort = new AbortController();
  const onSignal = (sig: NodeJS.Signals) => {
    abort.abort();
    rmSync(dir, { recursive: true, force: true });
    process.exit(sig === "SIGINT" ? 130 : 143);
  };
  process.once("SIGINT", onSignal);
  process.once("SIGTERM", onSignal);
  try {
    return await fn(dir, abort.signal);
  } finally {
    process.off("SIGINT", onSignal);
    process.off("SIGTERM", onSignal);
    await rm(dir, { recursive: true, force: true });
  }
}

// A Zenodo file at `path`: kept when its size and md5 equal the pins (a --downloads rerun), otherwise downloaded.
async function zenodoFile(path: string, { url, bytes, md5 }: (typeof HABITAT_INPUTS)[keyof typeof HABITAT_INPUTS]): Promise<ZenodoFile> {
  const kept = await stat(path).then((s) => s.size === bytes, () => false) && await hashFile(path, "md5") === md5;
  if (kept) console.error(`ingest habitat: reusing ${path} (size and md5 equal the pins)`);
  else await downloadFile(url, path, { sha256: null, md5, bytes, timeoutMs: DOWNLOAD_TIMEOUT_MS });
  return { path, url, bytes, md5, sha256: await hashFile(path) };
}

// pnpm ingest habitat [--downloads <dir>]: the Zenodo files, one after the other, into a fresh temp folder (or <dir>),
// then buildHabitat into data/learn/ for the records the build publishes. The temp folder is always removed.
export async function ingestHabitat(args: string[]): Promise<void> {
  const { downloads } = parseHabitatArgs(args);
  await readLabFiles(); // data/learn/ as its provenance files record it, before anything runs
  const records = deriveAll(await readDeriveInputs()).learn.occurrences;
  await withWorkDir("critwire-habitat-", async (work, signal) => {
    const dir = downloads ?? join(work, "downloads");
    await mkdir(dir, { recursive: true });
    const zenodo = {} as Record<keyof typeof HABITAT_INPUTS, ZenodoFile>;
    for (const [name, pin] of Object.entries(HABITAT_INPUTS) as [keyof typeof HABITAT_INPUTS, (typeof HABITAT_INPUTS)[keyof typeof HABITAT_INPUTS]][]) {
      zenodo[name] = await zenodoFile(join(dir, name), pin);
    }
    await buildHabitat({ work, dest: labDataDir, records, zenodo, signal });
  });
  console.log(`ingest habitat: wrote data/learn/{${HABITAT_OUTPUTS.join(",")}} and habitat.json`);
}
