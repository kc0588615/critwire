// The star (star.ts; plan D9, S9; Fable MISSED1, Astra SC1; L5 S2), written before the code. writeStar runs d6's eight
// published d6-star-* blocks in Node DuckDB over the published files and writes /learn/data/star/. Failure modes: a star
// block missing from the course, naming a schema (it must run in PostGIS and DuckDB), not starting with CREATE TABLE of
// its table, or needing a block that isn't published before it; Node DuckDB giving another result than PostGIS recorded
// (the cross-engine guard: a plain build refuses with the line diff, --draft warns); a dimension without its unknown
// member; the files disagreeing with star.mmd; a Power BI `// input:` naming a file the build doesn't publish; the
// habitat fact's DDL failing in DuckDB (L5 F2: a CHECK DuckDB can't evaluate) or letting a negative, oversized, empty,
// duplicate or orphan row in.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseBlock, type Block } from "../../learn/blocks.ts";
import type { CoursePage } from "../../learn/course.ts";
import { readCourse } from "../../learn/course-files.ts";
import { readRecorded } from "../../learn/freshness.ts";
import { checkInput, readCsv } from "../../learn/star-check.ts";
import { labCreditContext } from "./credits.ts";
import { deriveInputs, derived, withDist } from "./dist-fixture.ts";
import { readErds } from "./erd.ts";
import { withLabTables } from "./projection.ts";
import { STAR_BLOCKS, STAR_FILES, starBlocks, starInputErrors, writeStar, type StarManifest } from "./star.ts";

const course = await readCourse();
const starErd = (await readErds()).texts.star;
const ctx = await labCreditContext({ download: deriveInputs.learn.download, registration: null, datasets: derived.learn.datasets });
const recorded = readRecorded(course.pages);

/** The course with block `id`'s file text changed by `edit` (re-parsed, as the build would read it). */
function edited(id: string, edit: (text: string) => string): CoursePage[] {
  return course.pages.map((p) => ({
    ...p,
    blocks: p.blocks.map((b): Block => {
      if (b.id !== id) return b;
      const { block, errors } = parseBlock(b.file, edit(b.text));
      assert.deepEqual(errors, []);
      return block!;
    }),
  }));
}
const real = () => {
  const { blocks, errors } = starBlocks(course.pages);
  assert.deepEqual(errors, []);
  return blocks;
};
const starDir = (out: URL) => fileURLToPath(new URL("learn/data/star/", out));
/** Runs fn with console.warn captured. */
async function warnings(fn: () => Promise<void>): Promise<string[]> {
  const got: string[] = [];
  const warn = console.warn;
  console.warn = (...a: unknown[]) => void got.push(a.join(" "));
  try {
    await fn();
  } finally {
    console.warn = warn;
  }
  return got;
}

test("SB1 the eight published blocks are d6's, in an order that runs each after the blocks it needs", () => {
  assert.deepEqual(real().map((s) => [s.block.id, s.table]), [
    ["d6-star-dim-species", "dim_species"], ["d6-star-dim-country", "dim_country"], ["d6-star-dim-dataset", "dim_dataset"],
    ["d6-star-dim-year", "dim_year"], ["d6-star-fact-records", "fact_records"], ["d6-star-fact-species-country", "fact_species_country"],
    ["d6-star-dim-habitat-class", "dim_habitat_class"], ["d6-star-fact-country-habitat", "fact_country_habitat"],
  ]);
  assert.deepEqual(STAR_FILES, STAR_BLOCKS.map((id) => `star/${id.slice("d6-star-".length).replaceAll("-", "_")}.csv`));
});

test("SB2 a star block missing, naming a schema, not opening with CREATE TABLE <table>, or needing an unpublished block is refused", () => {
  const without = course.pages.map((p) => ({ ...p, blocks: p.blocks.filter((b) => b.id !== "d6-star-dim-year") }));
  assert.ok(starBlocks(without).errors.includes("star: block d6-star-dim-year isn't on a page"), starBlocks(without).errors.join("\n"));
  const schema = starBlocks(edited("d6-star-dim-country", (t) => t.replace("FROM countries", "FROM learn_curriculum.countries"))).errors;
  assert.ok(schema.includes("star: d6-star-dim-country names a schema (learn_curriculum.); star.sql relies on search_path"), schema.join("\n"));
  const first = starBlocks(edited("d6-star-dim-year", (t) => t.replace("CREATE TABLE dim_year (", "CREATE TABLE dim_years ("))).errors;
  assert.ok(first.includes("star: d6-star-dim-year's first statement must be CREATE TABLE dim_year ("), first.join("\n"));
  const after = starBlocks(edited("d6-star-fact-records", (t) => t.replace("-- after: d6-star-dim-species,", "-- after: d6-star-fact-country-habitat, d6-star-dim-species,"))).errors;
  assert.ok(after.includes("star: d6-star-fact-records runs after d6-star-fact-country-habitat, which isn't published before it"), after.join("\n"));
});

test("SB3 a Power BI `// input:` must name a file the build publishes", () => {
  assert.deepEqual(starInputErrors(course.pages), []);
  const pages = edited("pbi-smoke", (t) => t.replace("// input: star/dim_country.csv", "// input: star/dim_country.csv, star/dim_habitat.csv"));
  assert.deepEqual(starInputErrors(pages), [`q pbi-smoke: input star/dim_habitat.csv isn't a file this build publishes (${STAR_FILES.join(", ")})`]);
});

test("SB4 writeStar: eight CSVs and star/manifest.json; every file passes the input check; unknown members; NA is Namibia", () => withDist(async (out) => {
  await writeStar(out, { blocks: real(), recorded, starErd, ctx, draft: false });
  const dir = starDir(out);
  assert.deepEqual(readdirSync(dir).sort(), [...STAR_FILES.map((f) => f.slice(5)), "manifest.json"].sort());
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")) as StarManifest;
  assert.deepEqual(Object.keys(manifest.files).sort(), STAR_FILES.map((f) => f.slice(5)).sort());
  for (const f of STAR_FILES) assert.deepEqual((await checkInput(dir, f)).errors, [], f);
  assert.deepEqual(manifest.files["fact_records.csv"]!.primaryKey, ["record_id"]);
  assert.deepEqual(manifest.files["fact_records.csv"]!.foreignKeys.map((k) => k.references.file).sort(), ["dim_country.csv", "dim_dataset.csv", "dim_species.csv", "dim_year.csv"]);
  assert.equal(manifest.files["fact_records.csv"]!.rows, derived.learn.occurrences.length);
  assert.ok(manifest.files["dim_dataset.csv"]!.sources.some((s) => s.datasets === "datasets.csv"));
  // The habitat fact: grain one country × one class, both keys filled and found (checkInput), every class row published.
  const habitat = manifest.files["fact_country_habitat.csv"]!;
  assert.deepEqual(habitat.primaryKey, ["country_code", "habitat_code"]);
  assert.deepEqual(habitat.foreignKeys.map((k) => k.references.file).sort(), ["dim_country.csv", "dim_habitat_class.csv"]);
  assert.deepEqual(habitat.columns.map((c) => c.name), ["country_code", "habitat_code", "est_area_km2"]);
  assert.equal(habitat.rows, 5578);
  assert.equal(manifest.files["dim_habitat_class.csv"]!.rows, 75);
  const country = await readCsv(join(dir, "dim_country.csv"));
  assert.deepEqual(country.rows.find((r) => r[0] === "NA")?.[1], "Namibia");
  assert.ok(country.rows.some((r) => r[0] === "ZZ"));
  const before = readFileSync(join(dir, "manifest.json"));
  await writeStar(out, { blocks: real(), recorded, starErd, ctx, draft: false });
  assert.ok(readFileSync(join(dir, "manifest.json")).equals(before), "a second run gives the same bytes");
}));

test("SB5 the cross-engine guard: a recorded result Node DuckDB doesn't give fails a plain build with the line diff; --draft warns", () => withDist(async (out) => {
  const id = "d6-star-dim-species";
  const other = new Map(recorded).set(id, recorded.get(id)!.replace("76 | 3 | 50", "76 | 3 | 51"));
  await assert.rejects(writeStar(out, { blocks: real(), recorded: other, starErd, ctx, draft: false }), (e: Error) => {
    assert.match(e.message, /star block d6-star-dim-species: Node DuckDB gives another result than PostGIS recorded \(site\/learn\/labs\/checked\/d6-star-dim-species\.txt\)/);
    assert.ok(e.message.includes("- 76 | 3 | 51\n+ 76 | 3 | 50"), e.message);
    return true;
  });
  const missing = new Map(recorded);
  missing.delete(id);
  await assert.rejects(writeStar(out, { blocks: real(), recorded: missing, starErd, ctx, draft: false }), /star block d6-star-dim-species: no recorded PostGIS result/);
  const warned = await warnings(() => writeStar(out, { blocks: real(), recorded: other, starErd, ctx, draft: true }));
  assert.ok(warned.some((w) => w.startsWith("build --draft: star block d6-star-dim-species: Node DuckDB gives another result")), warned.join("\n"));
  assert.ok(readdirSync(starDir(out)).includes("manifest.json"));
}));

test("SB6 a dimension without its unknown member is refused, --draft too", () => withDist(async (out) => {
  const { blocks } = starBlocks(edited("d6-star-dim-country", (t) => t.replace(/\nUNION ALL\nSELECT 'ZZ'.*;\n/, ";\n")));
  await assert.rejects(warnings(() => writeStar(out, { blocks, recorded, starErd, ctx, draft: true })), /dim_country\.csv: no unknown member \(country_code = ZZ\)/);
}));

test("SB7 the files against star.mmd: a drawn column the star doesn't write is refused, --draft too", () => withDist(async (out) => {
  const drawn = starErd.replace('VARCHAR label "2016; Unknown for -1"', 'VARCHAR label "2016; Unknown for -1"\n        VARCHAR era "drawn, not written"');
  await assert.rejects(writeStar(out, { blocks: real(), recorded, starErd: drawn, ctx, draft: true }), /site\/learn\/erd\/star\.mmd: .*era/);
}));

/** Runs d6's star blocks up to and including `last` in Node DuckDB over the published lab tables, then fn. */
const withStar = (last: string, fn: (run: (sql: string) => Promise<unknown>) => Promise<void>) => withDist((out) => withLabTables(out, async (con) => {
  for (const { block } of real().slice(0, STAR_BLOCKS.indexOf(last as (typeof STAR_BLOCKS)[number]) + 1))
    for (const s of block.statements) await con.run(s.text);
  await fn((sql) => con.run(sql));
}));
/** A (country, class) pair both dimensions hold that the fact doesn't. */
const freePair = "SELECT c.country_code, h.habitat_code FROM dim_country AS c, dim_habitat_class AS h EXCEPT SELECT country_code, habitat_code FROM fact_country_habitat ORDER BY 1, 2 LIMIT 1";

test("SB8 the habitat fact's DDL in DuckDB: the committed rows insert; a negative or oversized area is refused", () =>
  withStar("d6-star-fact-country-habitat", async (run) => {
    await assert.rejects(run(`INSERT INTO fact_country_habitat SELECT *, -1 FROM (${freePair})`), /CHECK constraint/);
    await assert.rejects(run(`INSERT INTO fact_country_habitat SELECT *, 10000000000 FROM (${freePair})`));
    await assert.rejects(run(`INSERT INTO fact_country_habitat SELECT *, 9999999999.995 FROM (${freePair})`));
    await run(`INSERT INTO fact_country_habitat SELECT *, 0 FROM (${freePair})`);
  }));

test("SB9 the habitat fact refuses an empty key, a duplicate (country, class) and a class dim_habitat_class lacks", () =>
  withStar("d6-star-fact-country-habitat", async (run) => {
    await assert.rejects(run("INSERT INTO fact_country_habitat VALUES (NULL, (SELECT min(habitat_code) FROM dim_habitat_class), 1)"), /NOT NULL/);
    await assert.rejects(run("INSERT INTO fact_country_habitat VALUES ('ZZ', NULL, 1)"), /NOT NULL/);
    await assert.rejects(run("INSERT INTO fact_country_habitat SELECT country_code, habitat_code, 1 FROM fact_country_habitat ORDER BY 1, 2 LIMIT 1"), /[Dd]uplicate key/);
    await assert.rejects(run("INSERT INTO fact_country_habitat VALUES ('ZZ', (SELECT max(habitat_code) + 1 FROM dim_habitat_class), 1)"), /foreign key/i);
  }));
