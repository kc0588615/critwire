// The habitat ingest (L3 plan §1, 004 §4.1): pnpm ingest habitat. From Jung et al. 2020 v004 (Zenodo record 4058819,
// CC BY 4.0): every country's estimated km² per level-2 class (003 §5's method 3), each published record's class, and
// two 100 m clips. This file holds the pins and the pure rules; habitat.py (raster work) and the run come with S6.
import { createHash } from "node:crypto";
import type { OccurrenceRow } from "../derive/sample.ts";

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

type HabitatRecord = Pick<OccurrenceRow, "id" | "longitude" | "latitude">;

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
