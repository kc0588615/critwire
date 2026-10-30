// The lab shapes ingest (004 §4.1, plan D5): pnpm ingest shapes. Downloads the pinned Natural Earth 1:50m admin-0 and
// admin-1 files and RESOLVE's Ecoregions2017.zip into a temp folder, picks one 1:50m feature per countries.json code
// with the countries matcher (BV, GI and UM have none at 1:50m), then runs scripts/ingest/shapes.py (geometry only:
// no network, no country rule) and checks its report. Only then are the four outputs published into data/learn/, with
// shapes.json (inputs, tolerance, tool versions, per file rows, bytes, sha256 and invalid geometries, the matcher
// report). No date in shapes.json, so a re-run is byte-identical.
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { countriesFile, matchCountries, type CountriesFile, type CountriesResult, type NeProps } from "../derive/naturalearth.ts";
import { downloadFile } from "../http.ts";
import { formatJson, readJson } from "../json.ts";
import { labDataDir } from "../learn/lab-files.ts";
import type { NeLayer } from "../raw.ts";
import { assertVenv, INGEST_REQUIREMENTS } from "../venv.ts";
import { NE_COMMIT } from "./naturalearth.ts";
import { publishFiles } from "./publish.ts";
import { runPython, venvPython } from "./python.ts";

const NE_RAW = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${NE_COMMIT}/geojson`;
// File name in the temp folder → pinned source (sha256 and size as the spikes measured them).
export const SHAPE_INPUTS = {
  "ne_50m_admin_0_countries.geojson": { url: `${NE_RAW}/ne_50m_admin_0_countries.geojson`, sha256: "3e458fc036ad0a66411f2c1e6cac49c5d7bfb81cb1123bc513b22511a2b7fdeb", bytes: 3_083_490 },
  "ne_50m_admin_0_map_units.geojson": { url: `${NE_RAW}/ne_50m_admin_0_map_units.geojson`, sha256: "b8d421aca6e9e08e8cdf09cc26af111cc3e0deba4fe915611d58ade71e8a4db0", bytes: 3_179_420 },
  "ne_50m_admin_1_states_provinces.geojson": { url: `${NE_RAW}/ne_50m_admin_1_states_provinces.geojson`, sha256: "69a0e06e640b2d505858ae1cb63034e4677f3000b35a98e16312932b98c426b9", bytes: 2_325_694 },
  "Ecoregions2017.zip": { url: "https://storage.googleapis.com/teow2016/Ecoregions2017.zip", sha256: "be36d6209e443038d02e309f0447c6e7f2a62f5fe60c605ffe90d064952f2a60", bytes: 149_248_653 },
} as const;
const LAYER_FILES: Record<NeLayer, keyof typeof SHAPE_INPUTS> = {
  countries: "ne_50m_admin_0_countries.geojson",
  map_units: "ne_50m_admin_0_map_units.geojson",
};
// The cross-check property shapes.py compares on each selected feature: unique per feature in its 1:50m layer.
const CHECK_FIELD: Record<NeLayer, string> = { countries: "ADM0_A3", map_units: "GU_A3" };
// countries.json codes with no 1:50m feature (Bouvet Island, Gibraltar, US Minor Outlying Islands).
export const SHAPE_GAPS = ["BV", "GI", "UM"] as const;
export const SHAPE_OUTPUTS = ["admin1_shapes.parquet", "biomes.csv", "country_shapes.parquet", "ecoregions.parquet"] as const;
const PYTHON = venvPython("shapes.py");
// Ecoregions2017.zip is ~149 MB.
const TIMEOUT_MS = 30 * 60_000;

export interface ShapeSelection { code: string; layer: NeLayer; index: number; check: { field: string; value: string } }
export type SelectionReport = Omit<CountriesResult["report"], "notInGbif" | "gbifNotInRows"> & { gaps: string[] };
// What shapes.py prints on stdout.
export interface ShapesReport {
  tools: Record<string, string>;
  tolerance: number;
  crossChecked: number;
  admin1CountryCodes: string[];
  outputs: Record<(typeof SHAPE_OUTPUTS)[number], { rows: number; invalid?: Record<string, number> }>;
}

const sorted = (xs: Iterable<string>) => [...xs].sort();
const sha256 = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");

// One 1:50m feature per countries code, by the countries matcher (002 §6). Throws unless the codes with no feature are
// exactly SHAPE_GAPS and every 1:50m code has a countries row.
export function selectShapes(layers: Record<NeLayer, NeProps[]>, countryCodes: string[]): { selection: ShapeSelection[]; report: SelectionReport } {
  const gaps = new Set<string>(SHAPE_GAPS);
  const { rows, report } = matchCountries(layers, { speciesCodes: countryCodes.filter((c) => !gaps.has(c)), gbifCodes: [] });
  const picked = new Set(rows.map((r) => r.code));
  const extra = rows.map((r) => r.code).filter((c) => !countryCodes.includes(c));
  if (extra.length) throw new Error(`1:50m codes with no countries row: ${extra.join(", ")}`);
  const missing = sorted(countryCodes.filter((c) => !picked.has(c)));
  if (missing.join() !== SHAPE_GAPS.join()) throw new Error(`1:50m gaps ${missing.join(", ")} ≠ expected ${SHAPE_GAPS.join(", ")}`);
  const selection = rows.map(({ code }) => {
    const { layer, index } = report.matches[code];
    const value = layers[layer][index][CHECK_FIELD[layer]];
    if (typeof value !== "string" || !value) throw new Error(`${code}: ${layer} feature ${index} has no ${CHECK_FIELD[layer]}`);
    return { code, layer, index, check: { field: CHECK_FIELD[layer], value } };
  });
  const { notInGbif: _n, gbifNotInRows: _g, ...rest } = report;
  return { selection, report: { ...rest, gaps: missing } };
}

// Throws unless the report agrees with the selection, the countries codes and the files in `outDir`.
async function checkReport(stdout: string, outDir: string, selection: ShapeSelection[], countryCodes: string[]): Promise<ShapesReport> {
  let report: ShapesReport;
  try {
    report = JSON.parse(stdout) as ShapesReport;
  } catch {
    throw new Error(`shapes.py: report is not JSON: ${stdout.slice(0, 300)}`);
  }
  const files = await readdir(outDir);
  for (const name of SHAPE_OUTPUTS) if (!files.includes(name)) throw new Error(`shapes.py: ${name} missing`);
  const unknown = files.filter((f) => !(SHAPE_OUTPUTS as readonly string[]).includes(f));
  if (unknown.length) throw new Error(`shapes.py: unexpected outputs ${unknown.join(", ")}`);
  if (sorted(Object.keys(report.outputs ?? {})).join() !== SHAPE_OUTPUTS.join()) throw new Error(`shapes.py: report outputs ${Object.keys(report.outputs ?? {}).join(", ")}`);
  for (const name of SHAPE_OUTPUTS) {
    if (!Number.isInteger(report.outputs[name].rows) || report.outputs[name].rows < 1) throw new Error(`shapes.py: ${name}: rows ${report.outputs[name].rows}`);
  }
  const shapeRows = report.outputs["country_shapes.parquet"].rows;
  if (shapeRows !== selection.length) throw new Error(`shapes.py: country_shapes.parquet: ${shapeRows} rows ≠ ${selection.length} selected`);
  if (report.crossChecked !== selection.length) throw new Error(`shapes.py: cross-checked ${report.crossChecked} ≠ ${selection.length} selected`);
  const noRow = sorted((report.admin1CountryCodes ?? []).filter((c) => !countryCodes.includes(c)));
  if (noRow.length) throw new Error(`shapes.py: admin-1 codes with no countries row: ${noRow.join(", ")}`);
  return report;
}

// From the downloaded inputs in `inDir`: selects, runs shapes.py, checks its report, then publishes the outputs into `dest`
// and writes dest/shapes.json. Nothing reaches `dest` unless every check passed.
export async function buildShapes({ inDir, dest, countryCodes, python = PYTHON }: { inDir: string; dest: URL; countryCodes: string[]; python?: string[] }): Promise<void> {
  const layers = {} as Record<NeLayer, NeProps[]>;
  for (const layer of Object.keys(LAYER_FILES) as NeLayer[]) {
    const geojson = JSON.parse(await readFile(join(inDir, LAYER_FILES[layer]), "utf8")) as { features: { properties: NeProps }[] };
    layers[layer] = geojson.features.map((f) => f.properties);
  }
  const { selection, report: matcher } = selectShapes(layers, countryCodes);
  const selectFile = join(inDir, "select.json");
  await writeFile(selectFile, JSON.stringify(selection));
  const outDir = join(inDir, "out");
  await mkdir(outDir);
  const report = await checkReport(await runPython("shapes.py", python, ["--in", inDir, "--select", selectFile, "--out", outDir]), outDir, selection, countryCodes);

  const files: Record<string, { bytes: number; rows: number; sha256: string; invalid?: Record<string, number> }> = {};
  for (const name of SHAPE_OUTPUTS) {
    const body = await readFile(join(outDir, name));
    files[name] = { bytes: body.length, rows: report.outputs[name].rows, sha256: sha256(body), invalid: report.outputs[name].invalid };
  }
  await publishFiles(dest, {
    ...Object.fromEntries(SHAPE_OUTPUTS.map((name) => [name, { copy: join(outDir, name) }])),
    "shapes.json": { text: formatJson({
      inputs: SHAPE_INPUTS, tolerance: report.tolerance, tools: report.tools, files, matcher: { scale: "1:50m", ...matcher },
    }, { canonical: true }) },
  });
}

// pnpm ingest shapes: downloads every input into a fresh temp folder, builds into data/learn/, removes the folder.
export async function ingestShapes(): Promise<void> {
  await assertVenv(INGEST_REQUIREMENTS, "ingest shapes");
  const { rows } = await readJson<CountriesFile>(countriesFile);
  const inDir = await mkdtemp(join(tmpdir(), "critwire-shapes-"));
  try {
    for (const [name, { url, sha256, bytes }] of Object.entries(SHAPE_INPUTS)) {
      await downloadFile(url, join(inDir, name), { sha256, bytes, timeoutMs: TIMEOUT_MS });
    }
    await buildShapes({ inDir, dest: labDataDir, countryCodes: rows.map((r) => r.code) });
  } finally {
    await rm(inDir, { recursive: true, force: true });
  }
  console.log(`ingest shapes: wrote data/learn/{${SHAPE_OUTPUTS.join(",")}} and shapes.json`);
}
