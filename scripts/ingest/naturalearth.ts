// Natural Earth ingest (002 §6, plan D4): the two pinned 1:10m admin-0 GeoJSON files, cut to the attributes the
// countries matcher reads. Fetch and normalize only; no fs.
import { getBytes } from "../http.ts";
import type { NaturalEarthSnapshot, NeLayer } from "../raw.ts";

const RAW_BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector";
export const NE_RELEASE = { version: "v5.1.2", issued: "2022-05-13" };
export const NE_COMMIT = "f1890d9f152c896d250a77557a5751a93d494776";
export const NE_FILES: Record<NeLayer, { path: string; sha256: string }> = {
  countries: { path: "geojson/ne_10m_admin_0_countries.geojson", sha256: "239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255" },
  map_units: { path: "geojson/ne_10m_admin_0_map_units.geojson", sha256: "57da82be755f4afccd8f3b14251bb2752f5df1395f47d2d86f817470c4a48862" },
};
// The matcher's fields per layer, sorted: the unit's name is ADMIN in countries, GEOUNIT in map_units.
export const NE_FIELDS: Record<NeLayer, string[]> = {
  countries: ["ADM0_A3", "ADMIN", "CONTINENT", "ISO_A2", "ISO_A2_EH", "ISO_A3_EH", "NAME_EN", "REGION_UN", "SUBREGION", "TYPE"],
  map_units: ["ADM0_A3", "CONTINENT", "GEOUNIT", "ISO_A2", "ISO_A2_EH", "ISO_A3_EH", "NAME_EN", "REGION_UN", "SUBREGION", "TYPE"],
};
const LAYERS: NeLayer[] = ["countries", "map_units"];
// The files are ~13 MB each.
const TIMEOUT_MS = 120_000;

// Each feature's properties cut to `fields`, in file order. Throws on a field that isn't a string.
function cutLayer(layer: NeLayer, geojson: unknown, fields: string[]): Record<string, string>[] {
  const features = (geojson as { features?: unknown }).features;
  if (!Array.isArray(features)) throw new Error(`naturalearth: ${layer} has no features array`);
  return features.map((f: { properties?: Record<string, unknown> }, i) => Object.fromEntries(fields.map((k) => {
    const v = f.properties?.[k];
    if (typeof v !== "string") throw new Error(`naturalearth: ${layer} unit ${i}: ${k} is not a string (${JSON.stringify(v)})`);
    return [k, v];
  })));
}

export async function fetchNaturalEarth({ base = RAW_BASE, files = NE_FILES } = {}): Promise<Omit<NaturalEarthSnapshot, "retrieved">> {
  const fetched = {} as NaturalEarthSnapshot["files"];
  const layers = {} as NaturalEarthSnapshot["layers"];
  for (const layer of LAYERS) {
    const { path, sha256 } = files[layer];
    const url = `${base}/${NE_COMMIT}/${path}`;
    const bytes = await getBytes(url, { sha256, timeoutMs: TIMEOUT_MS });
    fetched[layer] = { url, sha256 };
    layers[layer] = cutLayer(layer, JSON.parse(new TextDecoder().decode(bytes)), NE_FIELDS[layer]);
  }
  return { release: NE_RELEASE, commit: NE_COMMIT, fields: NE_FIELDS, files: fetched, layers };
}
