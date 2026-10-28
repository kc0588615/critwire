// CD11, NE1: the Natural Earth ingest (getBytes' pin check, the attribute cut). Written before the code, seen failing
// first. A local server on port 0 serves scripts/fixtures/ne-*.geojson (A1's spike fixtures: attribute-only excerpts).
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { getBytes } from "../http.ts";
import { fetchNaturalEarth, NE_COMMIT, NE_FIELDS, NE_FILES, NE_RELEASE } from "./naturalearth.ts";

const FIX = new URL("../fixtures/", import.meta.url);
const bodies: Record<string, Buffer> = {
  countries: readFileSync(new URL("ne-countries.geojson", FIX)),
  map_units: readFileSync(new URL("ne-map-units.geojson", FIX)),
};
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const pinned = (patch: Partial<Record<keyof typeof NE_FILES, Buffer>> = {}) => ({
  countries: { path: "geojson/countries.geojson", sha256: sha(patch.countries ?? bodies.countries) },
  map_units: { path: "geojson/map_units.geojson", sha256: sha(patch.map_units ?? bodies.map_units) },
});

// Serves /<commit>/geojson/<layer>.geojson from `served` (default: the fixtures); 404 otherwise.
async function withServer(fn: (base: string) => Promise<void>, served: Record<string, Buffer> = bodies): Promise<void> {
  const server = createServer((req, res) => {
    const layer = req.url?.match(/^\/[0-9a-f]{40}\/geojson\/(\w+)\.geojson$/)?.[1];
    const body = layer === undefined ? undefined : served[layer];
    if (body === undefined) { res.writeHead(404).end("not found"); return; }
    res.writeHead(200, { "content-type": "application/geo+json" }).end(body);
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    await fn(`http://127.0.0.1:${(server.address() as AddressInfo).port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("CD11 getBytes returns the body only when its sha256 equals the pin", async () => {
  await withServer(async (base) => {
    const url = `${base}/${NE_COMMIT}/geojson/countries.geojson`;
    assert.deepEqual(Buffer.from(await getBytes(url, { sha256: sha(bodies.countries) })), bodies.countries);
    await assert.rejects(getBytes(url, { sha256: "0".repeat(64) }), new RegExp(`sha256 ${sha(bodies.countries)} ≠ pinned 0{64}`));
    await assert.rejects(getBytes(`${base}/nope`, { sha256: "0".repeat(64) }), /HTTP 404/);
  });
});

test("CD11 a file that differs from its pin refuses the whole ingest, naming the file", async () => {
  const changed = Buffer.concat([bodies.map_units, Buffer.from("\n")]);
  await withServer(async (base) => {
    await assert.rejects(fetchNaturalEarth({ base, files: pinned() }), /map_units\.geojson: sha256 [0-9a-f]{64} ≠ pinned/);
  }, { ...bodies, map_units: changed });
});

test("NE1 the snapshot holds each layer's ten fields per unit, the release, commit and field list; no geometry", async () => {
  await withServer(async (base) => {
    const files = pinned();
    const snap = await fetchNaturalEarth({ base, files });
    assert.deepEqual(Object.keys(snap).sort(), ["commit", "fields", "files", "layers", "release"]);
    assert.equal(snap.commit, NE_COMMIT);
    assert.deepEqual(snap.release, { version: "v5.1.2", issued: "2022-05-13" });
    assert.deepEqual(snap.release, NE_RELEASE);
    assert.deepEqual(snap.fields, NE_FIELDS);
    for (const layer of ["countries", "map_units"] as const) {
      assert.equal(NE_FIELDS[layer].length, 10);
      assert.deepEqual(NE_FIELDS[layer], [...NE_FIELDS[layer]].sort());
      assert.deepEqual(snap.files[layer], { url: `${base}/${NE_COMMIT}/${files[layer].path}`, sha256: files[layer].sha256 });
      const features = JSON.parse(bodies[layer].toString()).features as { properties: Record<string, string> }[];
      // same units in the file's order (the matcher reports feature indexes), cut to exactly the layer's fields
      assert.deepEqual(snap.layers[layer], features.map((f) => Object.fromEntries(NE_FIELDS[layer].map((k) => [k, f.properties[k]]))));
    }
    assert.ok(!JSON.stringify(snap).includes("geometry"));
    assert.ok(!JSON.stringify(snap).includes("NAME_LONG") && !JSON.stringify(snap).includes("GU_A3"));
    // the real pins are the 1:10m files of 002 §6
    assert.equal(NE_FILES.countries.sha256, "239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255");
    assert.equal(NE_FILES.map_units.sha256, "57da82be755f4afccd8f3b14251bb2752f5df1395f47d2d86f817470c4a48862");
  });
});

test("NE1 a unit missing a field, or with a non-string value, fails naming layer, unit index and field", async () => {
  const geo = JSON.parse(bodies.countries.toString());
  delete geo.features[2].properties.REGION_UN;
  const missing = Buffer.from(JSON.stringify(geo));
  await withServer(async (base) => {
    await assert.rejects(fetchNaturalEarth({ base, files: pinned({ countries: missing }) }), /naturalearth: countries unit 2: REGION_UN is not a string/);
  }, { ...bodies, countries: missing });
  geo.features[2].properties.REGION_UN = null;
  const nul = Buffer.from(JSON.stringify(geo));
  await withServer(async (base) => {
    await assert.rejects(fetchNaturalEarth({ base, files: pinned({ countries: nul }) }), /naturalearth: countries unit 2: REGION_UN is not a string/);
  }, { ...bodies, countries: nul });
});
