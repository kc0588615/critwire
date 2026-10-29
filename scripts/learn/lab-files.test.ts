// LP1–LP4 (plan D5, D9.1): the build's check of data/learn/ against its provenance files, shapes.json (pnpm ingest
// shapes) and habitat.json (the stand-ins). Written before the code, seen failing first. Failure modes: a hand-edited
// or half-copied data file is published (sha256 or size differs from its provenance), a file no provenance lists is
// published uncredited, a listed file is missing, or one file is claimed by both provenance files.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync, unlinkSync } from "node:fs";
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

// LP5–LP8 (L3 plan §1.7 #11, finding 3): clips/{cr,tas}.tif live in a subfolder and have no rows. Written before
// the code, seen failing first. Failure modes: a nested file published uncredited, an empty or stray folder that the
// cap (fileSizes, recursive) and this check see differently, a symlink served as something else.
const tif = "II*\0tif";
const withClip = (dir: string) => {
  mkdirSync(join(dir, "clips"));
  writeFileSync(join(dir, "clips", "cr.tif"), tif);
  writeFileSync(join(dir, "habitat.json"), JSON.stringify({ files: {
    "b.parquet": entry("bb"), "clips/cr.tif": { bytes: Buffer.byteLength(tif), sha256: sha256(tif) },
  } }));
};

test("LP5 a listed nested file without rows passes, named by its relative path", () => withLabDir(async (dir) => {
  withClip(dir);
  assert.deepEqual((await read(dir)).map((f) => [f.name, f.provenance]), [
    ["a.parquet", "shapes.json"], ["b.parquet", "habitat.json"], ["clips/cr.tif", "habitat.json"],
  ]);
  writeFileSync(join(dir, "clips", "cr.tif"), "II*\0tiF");
  await assert.rejects(read(dir), (e: Error) => /clips\/cr\.tif/.test(e.message) && /sha256/.test(e.message));
}));

test("LP6 an unlisted nested file is refused, naming its relative path", () => withLabDir(async (dir) => {
  withClip(dir);
  writeFileSync(join(dir, "clips", "tas.tif"), tif);
  await assert.rejects(read(dir), (e: Error) => /clips\/tas\.tif/.test(e.message) && /listed by neither/.test(e.message));
}));

test("LP7 an empty folder, or one holding no listed file, is refused by name", () => withLabDir(async (dir) => {
  mkdirSync(join(dir, "clips"));
  await assert.rejects(read(dir), (e: Error) => /data\/learn\/clips\b/.test(e.message) && /no listed file/.test(e.message));
  rmSync(join(dir, "clips"), { recursive: true });
  withClip(dir);
  mkdirSync(join(dir, "clips", "old"));
  await assert.rejects(read(dir), (e: Error) => /clips\/old\b/.test(e.message) && /no listed file/.test(e.message));
}));

test("LP8 a non-regular file (a symlink) is refused by name, nested too", () => withLabDir(async (dir) => {
  symlinkSync(join(dir, "a.parquet"), join(dir, "c.parquet"));
  await assert.rejects(read(dir), (e: Error) => /c\.parquet/.test(e.message) && /isn't a regular file/.test(e.message));
  unlinkSync(join(dir, "c.parquet"));
  withClip(dir);
  symlinkSync(join(dir, "a.parquet"), join(dir, "clips", "tas.tif"));
  await assert.rejects(read(dir), (e: Error) => /clips\/tas\.tif/.test(e.message) && /isn't a regular file/.test(e.message));
}));

test("LP the committed data/learn/ passes: the four shape files and pnpm ingest habitat's six, clips nested", async () => {
  const files = await readLabFiles(labDataDir);
  assert.deepEqual(files.map((f) => f.name), [
    "admin1_shapes.parquet", "biomes.csv", "clips/cr.tif", "clips/tas.tif", "country_habitats.parquet", "country_shapes.parquet",
    "ecoregions.parquet", "habitat_classes.parquet", "habitat_clips.parquet", "occurrence_habitats.parquet",
  ]);
});
