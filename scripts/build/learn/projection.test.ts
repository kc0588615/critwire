// PJ1–PJ4 (plan D9.4, D9.5; review SC1): the Learn projection's assumptions, checked before anything is written, and
// LAB_CHECKS over the published bytes. Written before the code, seen failing first. Failure modes: two records share an
// external id, so setup.sql's UNIQUE (and the loader's) fails with an opaque message, or the id is silently forced
// unique; a taxon name has two ranks or two parents, so taxa's primary key breaks or the tree lies; a retired record
// (replacedBy) is counted as an active species; the build's projection skips a table or misses a violation that is in
// the published files.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { deriveAll, readDeriveInputs } from "../../derive/pipeline.ts";
import { labDataDir, readLabFiles } from "../../learn/lab-files.ts";
import { speciesFile, type Species } from "../../species.ts";
import { writeCountries } from "../countries.ts";
import { writeTables } from "../tables.ts";
import { writeLearnData } from "./data.ts";
import { assertLearnProjection, LAB_TABLES, projectLearn } from "./projection.ts";
import { LAB_CHECKS } from "./checks.ts";

const derived = deriveAll(await readDeriveInputs());
const records = () => structuredClone(derived.records) as Species[];
const ID_KEYS = ["iucn", "gbif", "col", "wikidata", "inaturalist", "ncbi"] as const;

test("PJ clean: the committed records pass", () => {
  assertLearnProjection(derived.records);
});

for (const key of ID_KEYS) {
  test(`PJ1 a shared ids.${key} is refused, naming the column, value, ids and the fix`, () => {
    const rs = records();
    const [a, b] = rs.filter((s) => s.ids[key] !== null);
    (b!.ids as Record<string, unknown>)[key] = a!.ids[key];
    assert.throws(() => assertLearnProjection(rs), (e: Error) => {
      assert.match(e.message, new RegExp(`species\\.${key}_id`));
      assert.ok(e.message.includes(String(a!.ids[key])), e.message);
      assert.match(e.message, new RegExp(`${Math.min(a!.id, b!.id)}, ${Math.max(a!.id, b!.id)}`));
      assert.match(e.message, /non-unique.*site\/learn\/sql\/setup\.sql.*db\/learn\/lab-keys\.sql.*ERD/s);
      return true;
    });
  });
}

test("PJ2 a taxon name at two ranks is refused, naming both", () => {
  const rs = records();
  rs[1]!.taxonomy.genus = rs[0]!.taxonomy.family;
  assert.throws(() => assertLearnProjection(rs), new RegExp(`taxon "${rs[0]!.taxonomy.family}".*family.*genus|taxon "${rs[0]!.taxonomy.family}".*genus.*family`));
});

test("PJ2 a taxon name with two parents is refused, naming both", () => {
  const rs = records();
  const a = rs[0]!;
  const b = rs.find((s) => s.taxonomy.family !== a.taxonomy.family)!;
  b.taxonomy.genus = a.taxonomy.genus;
  assert.throws(() => assertLearnProjection(rs), (e: Error) => {
    assert.match(e.message, new RegExp(`taxon "${a.taxonomy.genus}".*two parents`));
    assert.ok(e.message.includes(a.taxonomy.family) && e.message.includes(b.taxonomy.family), e.message);
    return true;
  });
});

test("PJ3 a record with replacedBy is refused (retired records are never counted as active)", () => {
  const rs = records();
  rs[2]!.replacedBy = [rs[3]!.id];
  assert.throws(() => assertLearnProjection(rs), new RegExp(`species ${rs[2]!.id}.*replacedBy.*replacement`));
});

async function withDist(fn: (out: URL) => Promise<void>, occurrences = derived.learn.occurrences) {
  const dir = mkdtempSync(join(tmpdir(), "critwire-learn-projection-"));
  try {
    const out = pathToFileURL(`${dir}/`);
    mkdirSync(join(dir, "v1"));
    await writeTables(speciesFile, new URL("v1/", out));
    await writeCountries(derived.countries.rows, new URL("v1/", out));
    await writeLearnData(new URL("learn/data/", out), { learn: { ...derived.learn, occurrences }, files: await readLabFiles(labDataDir) });
    await fn(out);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("PJ4 projectLearn over the published files: 14 tables, the sample's rows, every LAB_CHECKS 0", () => withDist(async (out) => {
  const { tables, checks } = await projectLearn(out);
  assert.deepEqual(Object.keys(tables), LAB_TABLES.map((t) => t.name));
  assert.equal(LAB_TABLES.length, 14);
  assert.equal(tables.occurrences, derived.learn.occurrences.length);
  assert.equal(tables.species, derived.records.length);
  assert.equal(tables.countries, derived.countries.rows.length);
  for (const t of LAB_TABLES) assert.ok(tables[t.name]! > 0, t.name);
  assert.deepEqual(checks, Object.fromEntries(LAB_CHECKS.map((c) => [c.name, 0])));
}));

test("PJ4 projectLearn counts a violation that is in the published bytes", async () => {
  const [first, ...rest] = derived.learn.occurrences;
  const known = first!.country_code_gbif === "FR" ? "DE" : "FR";
  const broken = [{ ...first!, country_code_gbif: known, country_code: null }, ...rest];
  await withDist(async (out) => {
    const { checks } = await projectLearn(out);
    assert.equal(checks.occurrences_country_key, 1);
  }, broken);
});
