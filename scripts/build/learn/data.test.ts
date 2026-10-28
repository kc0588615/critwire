// DS1–DS3 (plan D9.3): writeLearnData's files so far. Written before the code, seen failing first. Failure modes:
// datasets.csv loses or reorders a column, mangles a title with a comma or quote, writes a missing DOI as text, isn't
// sorted by key, or differs from the spike's published file; a data/learn/ file isn't copied byte for byte; a file
// appears in /learn/data/ that the build didn't mean to write.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { deriveAll, readDeriveInputs } from "../../derive/pipeline.ts";
import type { LearnResult } from "../../derive/sample.ts";
import { labDataDir, readLabFiles } from "../../learn/lab-files.ts";
import { writeDatasets, writeLearnData } from "./data.ts";

// sha256 of SP/site/learn/data/datasets.csv, the spike's published file (sha256sum, once).
const SPIKE_DATASETS_SHA256 = "3bd8c17262391e827c967cf8536606b3397521965e49eb45dfe96c86a54c1fb3";
const sha256 = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");

async function withDir(fn: (dir: string) => Promise<void>) {
  const dir = mkdtempSync(join(tmpdir(), "critwire-learn-data-"));
  try { await fn(dir); } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("DS1 datasets.csv: 5 columns, sorted by key, CSV quoting, a missing DOI empty", () => withDir(async (dir) => {
  const rows: LearnResult["datasets"] = [
    { dataset_key: "b", title: "Birds, \"common\"", publisher: "P", doi: null, license: "CC0 1.0" },
    { dataset_key: "a", title: "Ants", publisher: "Q, Inc.", doi: "10.1/x", license: "CC BY 4.0" },
  ];
  await writeDatasets(rows, pathToFileURL(`${dir}/`));
  assert.equal(readFileSync(join(dir, "datasets.csv"), "utf8"),
    "dataset_key,title,publisher,doi,license\na,Ants,\"Q, Inc.\",10.1/x,CC BY 4.0\nb,\"Birds, \"\"common\"\"\",P,,CC0 1.0\n");
}));

test("DS2 datasets.csv from the committed sample = the spike's published file; writeLearnData writes exactly its files", () => withDir(async (dir) => {
  const { learn } = deriveAll(await readDeriveInputs());
  const files = await readLabFiles(labDataDir);
  await writeLearnData(pathToFileURL(`${dir}/`), { learn, files });
  assert.equal(sha256(join(dir, "datasets.csv")), SPIKE_DATASETS_SHA256);
  assert.deepEqual(readdirSync(dir).sort(), ["datasets.csv", "occurrences.csv", "occurrences.parquet", ...files.map((f) => f.name)].sort());
  for (const f of files) assert.equal(sha256(join(dir, f.name)), sha256(fileURLToPath(new URL(f.name, labDataDir))), f.name);
}));
