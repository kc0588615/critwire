// LP1–LP4 (plan D5, D9.1): the build's check of data/learn/ against its provenance files, shapes.json (pnpm ingest
// shapes) and habitat.json (the stand-ins). Written before the code, seen failing first. Failure modes: a hand-edited
// or half-copied data file is published (sha256 or size differs from its provenance), a file no provenance lists is
// published uncredited, a listed file is missing, or one file is claimed by both provenance files.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { labDataDir, readLabFiles } from "./lab-files.ts";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const entry = (s: string) => ({ bytes: Buffer.byteLength(s), rows: 1, sha256: sha256(s) });

// A temp data/learn/ with a.parquet (shapes.json) and b.parquet (habitat.json); fn gets its path.
async function withLabDir(fn: (dir: string) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), "critwire-lab-"));
  try {
    writeFileSync(join(dir, "a.parquet"), "aaa");
    writeFileSync(join(dir, "b.parquet"), "bb");
    writeFileSync(join(dir, "shapes.json"), JSON.stringify({ files: { "a.parquet": entry("aaa") } }));
    writeFileSync(join(dir, "habitat.json"), JSON.stringify({ files: { "b.parquet": entry("bb") } }));
    await fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
const read = (dir: string) => readLabFiles(pathToFileURL(`${dir}/`));

test("LP clean: every data file listed once and equal; sorted, with bytes and sha256", () => withLabDir(async (dir) => {
  assert.deepEqual(await read(dir), [
    { name: "a.parquet", bytes: 3, sha256: sha256("aaa"), provenance: "shapes.json" },
    { name: "b.parquet", bytes: 2, sha256: sha256("bb"), provenance: "habitat.json" },
  ]);
}));

test("LP1 a hand-edited data/learn/ file is refused, naming it and its provenance file", () => withLabDir(async (dir) => {
  writeFileSync(join(dir, "a.parquet"), "aab");
  await assert.rejects(read(dir), (e: Error) => /a\.parquet/.test(e.message) && /shapes\.json/.test(e.message) && /sha256/.test(e.message));
  writeFileSync(join(dir, "b.parquet"), "bbb");
  writeFileSync(join(dir, "a.parquet"), "aaa");
  await assert.rejects(read(dir), (e: Error) => /b\.parquet/.test(e.message) && /habitat\.json/.test(e.message));
}));

test("LP2 a file neither provenance file lists is refused, naming it", () => withLabDir(async (dir) => {
  writeFileSync(join(dir, "c.csv"), "c");
  await assert.rejects(read(dir), (e: Error) => /c\.csv/.test(e.message) && /shapes\.json/.test(e.message) && /habitat\.json/.test(e.message));
}));

test("LP3 a listed file that is missing is refused, naming it", () => withLabDir(async (dir) => {
  unlinkSync(join(dir, "b.parquet"));
  await assert.rejects(read(dir), (e: Error) => /b\.parquet/.test(e.message) && /missing/.test(e.message));
}));

test("LP4 a file both provenance files list is refused", () => withLabDir(async (dir) => {
  writeFileSync(join(dir, "habitat.json"), JSON.stringify({ files: { "a.parquet": entry("aaa"), "b.parquet": entry("bb") } }));
  await assert.rejects(read(dir), (e: Error) => /a\.parquet/.test(e.message) && /both/.test(e.message));
}));

test("LP the committed data/learn/ passes: the four shape files and the two habitat stand-ins", async () => {
  const files = await readLabFiles(labDataDir);
  assert.deepEqual(files.map((f) => f.name), [
    "admin1_shapes.parquet", "biomes.csv", "country_habitats.parquet", "country_shapes.parquet", "ecoregions.parquet", "habitat_classes.parquet",
  ]);
});
