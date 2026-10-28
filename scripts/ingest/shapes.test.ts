// SH1–SH3: the shapes ingest (plan D5): downloadFile's pins, the 1:50m selection's gaps, and buildShapes refusing a bad
// Python run before anything reaches data/learn/. Written before the code, seen failing first. Offline: a local server
// on port 0, scripts/fixtures/ne-*.geojson (attribute-only excerpts), and a fake Python (a node script) per case.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { downloadFile } from "../http.ts";
import type { NeProps } from "../derive/naturalearth.ts";
import { buildShapes, SHAPE_GAPS, SHAPE_INPUTS, SHAPE_OUTPUTS, selectShapes } from "./shapes.ts";

const FIX = new URL("../fixtures/", import.meta.url);
const features = (f: string): NeProps[] => JSON.parse(readFileSync(new URL(f, FIX), "utf8")).features.map((x: { properties: NeProps }) => x.properties);
const layers = () => ({ countries: features("ne-countries.geojson"), map_units: features("ne-map-units.geojson") });
// The fixture's codes (as matchCountries picks them) plus the three 1:50m gaps: the stand-in for data/countries.json.
const FIXTURE_CODES = ["BR", "FR", "GF", "MQ", "NA", "NO", "RE", "TW", "XK"];
const countryCodes = () => [...FIXTURE_CODES, ...SHAPE_GAPS].sort();
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const tmp = (prefix: string) => mkdtempSync(join(tmpdir(), `critwire-${prefix}-`));

async function withServer(body: Buffer, fn: (url: string) => Promise<void>): Promise<void> {
  const server = createServer((req, res) => {
    if (req.url !== "/file.bin") { res.writeHead(404).end("not found"); return; }
    res.writeHead(200, { "content-type": "application/octet-stream" }).end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await fn(`http://127.0.0.1:${(server.address() as AddressInfo).port}/file.bin`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("SH1 downloadFile writes the file only when its sha256 and size equal the pins; otherwise no file is left", async () => {
  const body = Buffer.from("a pinned file\n".repeat(10_000));
  const dir = tmp("sh1");
  try {
    await withServer(body, async (url) => {
      const path = join(dir, "ok.bin");
      await downloadFile(url, path, { sha256: sha(body), bytes: body.length });
      assert.deepEqual(readFileSync(path), body);

      const badSha = join(dir, "bad-sha.bin");
      await assert.rejects(downloadFile(url, badSha, { sha256: "0".repeat(64), bytes: body.length }), new RegExp(`sha256 ${sha(body)} ≠ pinned 0{64}`));
      assert.equal(existsSync(badSha), false);

      const badSize = join(dir, "bad-size.bin");
      await assert.rejects(downloadFile(url, badSize, { sha256: sha(body), bytes: body.length + 1 }), new RegExp(`${body.length} bytes ≠ pinned ${body.length + 1}`));
      assert.equal(existsSync(badSize), false);

      const notFound = join(dir, "missing.bin");
      await assert.rejects(downloadFile(url.replace("file.bin", "nope"), notFound, { sha256: sha(body), bytes: body.length }), /HTTP 404/);
      assert.equal(existsSync(notFound), false);
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("SH2 the 1:50m selection allows exactly BV, GI and UM as gaps; any other gap or extra code fails", () => {
  assert.deepEqual([...SHAPE_GAPS], ["BV", "GI", "UM"]);
  const { selection, report } = selectShapes(layers(), countryCodes());
  assert.deepEqual(selection.map((s) => s.code), FIXTURE_CODES);
  assert.deepEqual(report.gaps, ["BV", "GI", "UM"]);
  // Each selected feature carries its cross-check: ADM0_A3 in countries, GU_A3 in map_units.
  assert.deepEqual(selection.find((s) => s.code === "BR"), { code: "BR", layer: "countries", index: 4, check: { field: "ADM0_A3", value: "BRA" } });
  assert.deepEqual(selection.find((s) => s.code === "GF"), { code: "GF", layer: "map_units", index: 1, check: { field: "GU_A3", value: "GUF" } });

  // A countries code with no 1:50m feature that isn't an expected gap.
  assert.throws(() => selectShapes(layers(), [...countryCodes(), "QQ"]), /no country row for 1 species codes: QQ/);
  const noNorway = { ...layers(), countries: layers().countries.filter((p) => p.ADMIN !== "Norway") };
  assert.throws(() => selectShapes(noNorway, countryCodes()), /: NO$/);
  // An expected gap that has a 1:50m feature after all (the selection changed): fails, naming the gaps.
  const gibraltar = { ADM0_A3: "GIB", CONTINENT: "Europe", GEOUNIT: "Gibraltar", GU_A3: "GIB", ISO_A2: "GI", ISO_A2_EH: "GI", ISO_A3_EH: "GIB",
    NAME_EN: "Gibraltar", REGION_UN: "Europe", SUBREGION: "Southern Europe", TYPE: "Geo unit" };
  assert.throws(() => selectShapes({ ...layers(), map_units: [...layers().map_units, gibraltar] }, countryCodes()), /1:50m gaps BV, UM ≠ expected BV, GI, UM/);
  // A 1:50m code with no countries row.
  assert.throws(() => selectShapes(layers(), countryCodes().filter((c) => c !== "TW")), /1:50m codes with no countries row: TW/);
});

// A fake shapes.py: writes the four outputs into --out and prints a report, broken as `mode` says.
const FAKE = `
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
const [mode, ...rest] = process.argv.slice(2);
const arg = (name) => rest[rest.indexOf(name) + 1];
const selection = JSON.parse(readFileSync(arg("--select"), "utf8"));
const out = arg("--out");
if (mode === "exit") { console.error("boom"); process.exit(1); }
const files = { "admin1_shapes.parquet": 3, "biomes.csv": 2, "country_shapes.parquet": selection.length, "ecoregions.parquet": 4 };
for (const name of Object.keys(files)) if (!(mode === "missing" && name === "ecoregions.parquet")) writeFileSync(join(out, name), name + " bytes\\n");
const outputs = Object.fromEntries(Object.entries(files).map(([n, rows]) => [n, { rows: mode === "rows" && n === "country_shapes.parquet" ? rows - 1 : rows, invalid: {} }]));
const report = { tools: { python: "3.12.3" }, tolerance: 0.05, crossChecked: mode === "cross" ? selection.length - 1 : selection.length,
  admin1CountryCodes: mode === "admin1" ? ["QQ"] : ["BR"], outputs };
console.log(mode === "json" ? "not json" : JSON.stringify(report));
`;

async function sh3(mode: string): Promise<{ dest: string; error?: Error }> {
  const dir = tmp("sh3");
  const inDir = join(dir, "in");
  const dest = join(dir, "data-learn");
  for (const d of [inDir, dest]) mkdirSync(d);
  copyFileSync(new URL("ne-countries.geojson", FIX), join(inDir, "ne_50m_admin_0_countries.geojson"));
  copyFileSync(new URL("ne-map-units.geojson", FIX), join(inDir, "ne_50m_admin_0_map_units.geojson"));
  writeFileSync(join(dest, "country_shapes.parquet"), "old\n");
  const fake = join(dir, "fake-shapes.mjs");
  writeFileSync(fake, FAKE);
  try {
    await buildShapes({ inDir, dest: pathToFileURL(dest + "/"), python: [process.execPath, fake, mode], countryCodes: countryCodes() });
    return { dest };
  } catch (error) {
    return { dest, error: error as Error };
  }
}

function assertUntouched(dest: string): void {
  assert.deepEqual(readdirSync(dest), ["country_shapes.parquet"]);
  assert.equal(readFileSync(join(dest, "country_shapes.parquet"), "utf8"), "old\n");
}

test("SH3 a clean run writes the four outputs and shapes.json (bytes, sha256, rows; inputs; matcher report)", async () => {
  const { dest, error } = await sh3("ok");
  try {
    assert.equal(error, undefined);
    assert.deepEqual(readdirSync(dest).sort(), [...SHAPE_OUTPUTS, "shapes.json"].sort());
    const prov = JSON.parse(readFileSync(join(dest, "shapes.json"), "utf8"));
    for (const name of SHAPE_OUTPUTS) {
      const bytes = readFileSync(join(dest, name));
      assert.equal(prov.files[name].sha256, sha(bytes));
      assert.equal(prov.files[name].bytes, bytes.length);
    }
    assert.equal(prov.files["country_shapes.parquet"].rows, FIXTURE_CODES.length);
    assert.deepEqual(Object.keys(prov.inputs).sort(), Object.keys(SHAPE_INPUTS).sort());
    assert.deepEqual(prov.matcher.gaps, ["BV", "GI", "UM"]);
    assert.equal(prov.tolerance, 0.05);
    assert.equal(prov.retrieved, undefined, "no date: a re-run must be byte-identical");
  } finally {
    rmSync(join(dest, ".."), { recursive: true, force: true });
  }
});

for (const [mode, message] of [
  ["exit", /shapes\.py exited 1/],
  ["json", /shapes\.py: report is not JSON/],
  ["missing", /ecoregions\.parquet missing/],
  ["rows", /country_shapes\.parquet: 8 rows ≠ 9 selected/],
  ["cross", /cross-checked 8 ≠ 9 selected/],
  ["admin1", /admin-1 codes with no countries row: QQ/],
] as const) {
  test(`SH3 ${mode}: buildShapes refuses and writes nothing to data/learn/`, async () => {
    const { dest, error } = await sh3(mode);
    try {
      assert.match(error?.message ?? "no error", message);
      assertUntouched(dest);
    } finally {
      rmSync(join(dest, ".."), { recursive: true, force: true });
    }
  });
}
