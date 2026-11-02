// MDD ingest (plan F2). Written before the code, seen failing first. Failure modes:
// 1. Zenodo's license.id, version or DOI differs from the pin and passes.
// 2. md5 or size differs and passes.
// 3. A row count other than 6,904, or a duplicate name, passes.
// 4. iucnStatus or extinct reaches the snapshot.
// 5. read_csv turns an NA cell or type-sniffs a value: places must be the cell, verbatim.
// 6. A loose name match: _ for a space only, else null, never guessed.
// 7. A non-mammal gets a key, or a mammal is missing.
// 8. The temp folder survives, on success or failure.
import { createHash } from "node:crypto";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import type { BaseSpecies } from "../species.ts";
import { fetchMdd, MDD_FILE, MDD_PIN, type MddPin } from "./mdd.ts";

const HEADER = "sciName,id,phylosort,iucnStatus,extinct,countryDistribution,continentDistribution";
const line = (name: string, id: string, places: string) => `${name},${id},7,SENTINELSTATUS,0,${places},SENTINELCONTINENT`;
const CSV = [
  HEADER,
  line("Panthera_leo", "1001", "Kenya|Cambodia?|Namibia"),
  line("Canis_lupus", "1002", "NA"),
  line("Bos_taurus", "1003", "Domesticated"),
  line("Felis_catus", "01004", "1"), // a value a sniffer would read as a number
  line("Dendrobates_auratus", "1005", "Panama"), // same name as a base amphibian: scope is the base's mammals
  line("Ursus_arctos_horribilis", "1006", "Canada"),
].join("\n") + "\n";

const RECORD = { doi: MDD_PIN.doi, metadata: { version: MDD_PIN.version, publication_date: "2026-07-28", license: { id: "cc-by-4.0" } } };

const species = (scientificName: string, cls = "Mammalia") => ({ scientificName, taxonomy: { class: cls } }) as BaseSpecies;
const BASE = [species("Panthera leo"), species("Canis lupus"), species("Bos taurus"), species("Felis catus"), species("Dendrobates auratus", "Amphibia")];

const pinOf = (csv: string, rows = csv.trim().split("\n").length - 1): MddPin => ({
  ...MDD_PIN, rows, file: { url: MDD_FILE.url, md5: createHash("md5").update(csv).digest("hex"), bytes: Buffer.byteLength(csv) },
});

// Answers the Zenodo record and the file; every run gets a TMPDIR of its own, seen empty afterwards.
async function zenodo(t: TestContext, csv: string, record: object = RECORD): Promise<() => Promise<string[]>> {
  t.mock.method(globalThis, "fetch", async (input: string) => (input === MDD_PIN.record ? Response.json(record) : new Response(csv)));
  const root = await mkdtemp(join(tmpdir(), "mdd-test-"));
  const was = process.env.TMPDIR;
  process.env.TMPDIR = root;
  t.after(async () => {
    if (was === undefined) delete process.env.TMPDIR;
    else process.env.TMPDIR = was;
    await rm(root, { recursive: true, force: true });
  });
  return () => readdir(root);
}

test("the mammals' cells, verbatim, with the release read from Zenodo", async (t) => {
  const left = await zenodo(t, CSV);
  const got = await fetchMdd(BASE, pinOf(CSV));
  assert.deepEqual(got, {
    file: pinOf(CSV).file,
    release: { version: MDD_PIN.version, issued: "2026-07-28", doi: MDD_PIN.doi },
    license: "CC BY 4.0",
    species: {
      "Panthera leo": { id: "1001", places: "Kenya|Cambodia?|Namibia" },
      "Canis lupus": { id: "1002", places: "NA" },
      "Bos taurus": { id: "1003", places: "Domesticated" },
      "Felis catus": { id: "01004", places: "1" },
    },
  });
  assert.deepEqual(await left(), []);
});

test("a mammal the file doesn't hold is null; names match exactly, _ for a space only", async (t) => {
  await zenodo(t, CSV);
  const base = [species("Panthera leo"), species("panthera leo"), species("Ursus arctos"), species("Ursus arctos horribilis"), species("Canis  lupus")];
  const got = await fetchMdd(base, pinOf(CSV));
  assert.deepEqual(Object.keys(got.species).sort(), ["Canis  lupus", "Panthera leo", "Ursus arctos", "Ursus arctos horribilis", "panthera leo"].sort());
  assert.deepEqual(got.species["Panthera leo"], { id: "1001", places: "Kenya|Cambodia?|Namibia" });
  assert.equal(got.species["panthera leo"], null);
  assert.equal(got.species["Ursus arctos"], null);
  assert.equal(got.species["Canis  lupus"], null);
  assert.deepEqual(got.species["Ursus arctos horribilis"], { id: "1006", places: "Canada" });
});

test("no iucnStatus, extinct or any other column reaches the result", async (t) => {
  await zenodo(t, CSV);
  const text = JSON.stringify(await fetchMdd(BASE, pinOf(CSV)));
  for (const never of ["iucnStatus", "extinct", "SENTINELSTATUS", "SENTINELCONTINENT", "phylosort"]) assert.ok(!text.includes(never), never);
});

test("a mammal's cell naming IUCN refuses", async (t) => {
  const csv = `${HEADER}\n${line("Panthera_leo", "1001", "Kenya (IUCN)")}\n`;
  await zenodo(t, csv);
  await assert.rejects(fetchMdd(BASE, pinOf(csv)), /IUCN data at/);
});

for (const [why, record] of [
  ["license", { ...RECORD, metadata: { ...RECORD.metadata, license: { id: "cc-by-sa-4.0" } } }],
  ["no license", { ...RECORD, metadata: { version: MDD_PIN.version, publication_date: "2026-07-28" } }],
  ["version", { ...RECORD, metadata: { ...RECORD.metadata, version: "v2.6" } }],
  ["doi", { ...RECORD, doi: "10.5281/zenodo.1" }],
  ["issued", { ...RECORD, metadata: { version: MDD_PIN.version, license: { id: "cc-by-4.0" } } }],
] as const) {
  test(`a Zenodo record with a different ${why} refuses`, async (t) => {
    const left = await zenodo(t, CSV, record);
    await assert.rejects(fetchMdd(BASE, pinOf(CSV)), /mdd: /);
    assert.deepEqual(await left(), []);
  });
}

test("a file off its md5 or size refuses, no temp folder left; the real pin holds the release's numbers", async (t) => {
  const left = await zenodo(t, CSV);
  await assert.rejects(fetchMdd(BASE, { ...pinOf(CSV), file: { ...pinOf(CSV).file, md5: "0".repeat(32) } }), /md5 .* ≠ pinned/);
  await assert.rejects(fetchMdd(BASE, { ...pinOf(CSV), file: { ...pinOf(CSV).file, bytes: 1 } }), /bytes ≠ pinned 1/);
  await assert.rejects(fetchMdd(BASE), /bytes ≠ pinned 9303589/);
  assert.deepEqual(await left(), []);
  assert.deepEqual([MDD_FILE.md5, MDD_FILE.bytes, MDD_PIN.rows], ["533e662fd5b8f66a5f56c191e7efac44", 9303589, 6904]);
});

test("a row count off the pin refuses, no temp folder left", async (t) => {
  const left = await zenodo(t, CSV);
  await assert.rejects(fetchMdd(BASE, pinOf(CSV, 7)), /mdd: 6 rows, pinned 7/);
  assert.deepEqual(await left(), []);
});

test("a duplicate name refuses, no temp folder left", async (t) => {
  const csv = `${HEADER}\n${line("Panthera_leo", "1001", "Kenya")}\n${line("Panthera_leo", "1009", "Chad")}\n`;
  const left = await zenodo(t, csv);
  await assert.rejects(fetchMdd(BASE, pinOf(csv)), /mdd: duplicate name Panthera_leo/);
  assert.deepEqual(await left(), []);
});
