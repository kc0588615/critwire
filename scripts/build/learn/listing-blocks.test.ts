// The listing-block guard (listing-blocks.ts; plan 2026-11-02-critwire-learn-range-lessons, Target design 2), written
// before the code. A block reading /v1/range-listings.parquet is the one browser input outside the loader, so no lab key
// sees it: only this guard stops a refreshed file publishing a false lesson. Failure modes:
// listingBlocks, in both modes, before the db load:
// F1 another form of the name reads the file unguarded. F2 the file is reached without its name. F3 a listing block
// isn't plain (engine, status, `-- after:`, `-- expect:`, two statements, not read-only). F4 a chain hides the dependency.
// F5 a false positive blocks the course. F6 the wrong page is named, or anything but the one spelling counts as a reader.
// assertListingBlocks, on real published files:
// F7 the block doesn't run in a browser's tables. F8 a cell the two engines render differently. F9 row order isn't the
// query's own. F10 a curated correction would move the lesson. F11 the result differs from its snapshot. F12 one failure
// hides another, or the guard leaves a mess.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseBlock, type Block } from "../../learn/blocks.ts";
import type { CoursePage } from "../../learn/course.ts";
import { readCourse } from "../../learn/course-files.ts";
import { withDist } from "./dist-fixture.ts";
import { assertListingBlocks, listingBlocks, type ListingBlock } from "./listing-blocks.ts";

const FILE = "read_parquet('range-listings.parquet')";
const MDD = `${FILE} AS l WHERE l.sourceKey = 'mdd'`;
const course = await readCourse();

/** A block parsed from a file's text, as the build reads it: `name` carries the id and the extension. */
function parsed(name: string, text: string): Block {
  const { block } = parseBlock(`site/learn/sql/${name}`, text);
  assert.ok(block, `${name} didn't parse`);
  return block;
}
const browser = (id: string, sql: string, headers = "") => parsed(`${id}.sql`, `-- q: ${id}\n-- status: ran\n${headers}${sql}\n`);
const postgis = (id: string, sql: string) => parsed(`${id}.sql`, `-- q: ${id}\n-- status: ran\n-- engine: postgis\n${sql}\n`);
const python = (id: string, code: string) => parsed(`${id}.py`, `# q: ${id}\n# status: ran\n${code}\n`);
const powerbi = (id: string, code: string) => parsed(`${id}.m`, `// q: ${id}\n// status: untested: Power BI is Windows-only\n// input: star/dim_country.csv\n${code}\n`);
const pageOf = (id: string, blocks: Block[]) => ({ page: { id }, slots: [], blocks }) as unknown as CoursePage;
const errorsOf = (...blocks: Block[]) => listingBlocks([pageOf("p", blocks)]).errors;
/** The errors must name the block; the reason's words are what S7's CLI cases pin. */
function refused(block: Block, reason: RegExp): void {
  const errors = errorsOf(block);
  assert.ok(errors.some((e) => e.includes(block.id) && reason.test(e)), `${block.id} (${block.text}): ${JSON.stringify(errors)}`);
}
const listing = (block: Block, page = "p"): ListingBlock => ({ block, page });

/** Runs the guard, returning its error's message (undefined if it passed) and what it warned. */
async function guard(out: URL, blocks: ListingBlock[], recorded: ReadonlyMap<string, string>, draft: boolean) {
  const warned: string[] = [];
  const warn = console.warn;
  console.warn = (...a: unknown[]) => void warned.push(a.join(" "));
  try {
    await assertListingBlocks(out, blocks, { recorded, draft });
    return { error: undefined, warned };
  } catch (e) {
    return { error: (e as Error).message, warned };
  } finally {
    console.warn = warn;
  }
}
/** A block's rendered result: the guard prints it for a block with no snapshot. */
async function rendered(out: URL, block: Block): Promise<string> {
  const { error, warned } = await guard(out, [listing(block)], new Map(), true);
  assert.equal(error, undefined);
  const text = warned.join("\n");
  const at = text.indexOf("-- result:");
  assert.ok(at >= 0, text);
  return text.slice(at);
}
/** In both modes, with a snapshot equal to nothing: the guard throws naming the block and the reason. */
async function refusedBothWays(out: URL, block: Block, reason: RegExp): Promise<void> {
  for (const draft of [false, true]) {
    const { error } = await guard(out, [listing(block)], new Map([[block.id, "-- result: nothing"]]), draft);
    assert.ok(error?.includes(block.id) && reason.test(error), `${block.id} (draft ${draft}): ${error}`);
  }
}
/** Every file under `dir` with its sha256. */
function tree(dir: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const e of readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (!e.isFile()) continue;
    const path = join(e.parentPath, e.name);
    out[path] = createHash("sha256").update(readFileSync(path)).digest("hex");
  }
  return out;
}

test("F1 another form of the name is refused, naming the block", () => {
  const other = /another form of range-listings/;
  const forms: Block[] = [
    browser("f1-bare", "SELECT * FROM 'range-listings.parquet';"),
    browser("f1-double", `SELECT * FROM "range-listings.parquet";`),
    browser("f1-double-reader", `SELECT * FROM read_parquet("range-listings.parquet");`),
    browser("f1-scan", "SELECT * FROM parquet_scan('range-listings.parquet');"),
    browser("f1-list", "SELECT * FROM read_parquet(['range-listings.parquet']);"),
    browser("f1-url", "SELECT * FROM read_parquet('https://critwire.com/v1/range-listings.parquet');"),
    browser("f1-csv", "SELECT * FROM read_csv('range-listings.csv');"),
    browser("f1-json", "SELECT * FROM read_json('range-listings.json');"),
    browser("f1-table", "SELECT * FROM range_listings;"),
    browser("f1-comment", "-- see range-listings.parquet\nSELECT 1;"),
    browser("f1-upper", "SELECT * FROM READ_PARQUET('range-listings.parquet');"),
    postgis("f1-postgis", "-- range listings live elsewhere\nSELECT 1;"),
    python("f1-python", `print(f"{BASE}/v1/range-listings.parquet")`),
    powerbi("f1-powerbi", `let s = "range-listings.csv" in s`),
  ];
  for (const b of forms) refused(b, other);
  // Beside the one supported spelling, another form still refuses.
  refused(browser("f1-beside", `SELECT * FROM ${FILE}, 'range-listings.csv';`), other);
});

test("F2 the file reached without its name is refused, on a block of any engine", () => {
  const unnamed = /without its name/;
  for (const b of [
    browser("f2-all", "SELECT * FROM read_parquet('*.parquet');"),
    browser("f2-glob", "SELECT * FROM read_parquet('spec*.parquet');"),
    browser("f2-concat", "SELECT * FROM read_parquet('spe' || 'cies.parquet');"),
    browser("f2-scan", "SELECT * FROM parquet_scan(x);"),
    browser("f2-from", "SELECT * FROM '*.parquet';"),
    browser("f2-set", "SELECT * FROM read_parquet('r[a]nge.parquet');"),
    browser("f2-any", "SELECT * FROM read_csv('r?nge.csv');"),
    postgis("f2-postgis", "SELECT * FROM read_parquet('*.parquet');"),
    python("f2-python", "con.sql(\"SELECT * FROM read_parquet('*.parquet')\")"),
    powerbi("f2-powerbi", "let s = \"SELECT * FROM '*.json'\" in s"),
  ]) refused(b, unnamed);
});

test("F3 a listing block that isn't plain is refused", () => {
  const select = `SELECT count(*) FROM ${MDD};`;
  refused(postgis("f3-postgis", select), /must be a browser block/);
  refused(python("f3-python", `print("${select}")`), /must be a browser block/);
  refused(powerbi("f3-powerbi", `let s = "${select}" in s`), /must be a browser block/);
  refused(parsed("f3-untested.sql", `-- q: f3-untested\n-- status: untested: not yet\n${select}\n`), /must be ran/);
  refused(browser("f3-after", select, "-- after: f3-earlier\n"), /`after:`/);
  refused(browser("f3-expect", select, "-- expect: error nope\n"), /`expect:`/);
  refused(browser("f3-two", `SELECT 1; ${select}`), /one statement/);
  refused(browser("f3-write", `CREATE TEMP TABLE t AS SELECT * FROM ${FILE};`), /read-only/);
});

test("F4 a block naming a listing block in `-- after:` is refused, naming both", () => {
  const reader = browser("f4-reader", `SELECT count(*) FROM ${MDD};`);
  const later = browser("f4-later", "SELECT 1;", "-- after: f4-reader\n");
  assert.ok(errorsOf(reader, later).some((e) => e.includes("f4-later") && e.includes("f4-reader") && /runs after/.test(e)), errorsOf(reader, later).join("\n"));
  // Across pages too: the reader needn't be on the same page.
  const across = listingBlocks([pageOf("a", [reader]), pageOf("b", [later])]).errors;
  assert.ok(across.some((e) => e.includes("f4-later") && e.includes("f4-reader")), across.join("\n"));
});

test("F5 the real course holds no error, and read_parquet of another file passes", () => {
  assert.deepEqual(listingBlocks(course.pages).errors, []);
  assert.deepEqual(errorsOf(
    browser("f5-plain", "SELECT * FROM read_parquet('species.parquet');"),
    browser("f5-named", "SELECT * FROM read_parquet('species.parquet', hive_partitioning = false);"),
    browser("f5-spaced", "SELECT * FROM read_parquet( 'species.parquet' );"),
    python("f5-python", "print(1)"),
  ), []);
});

test("F6 each listing block comes back with its page; only the one spelling makes a block a reader", () => {
  const a = browser("f6-a", `SELECT count(*) FROM ${MDD};`);
  const b = browser("f6-b", `SELECT count(*) FROM ${MDD};`);
  const none = browser("f6-none", "SELECT * FROM read_parquet('species.parquet');");
  const { blocks, errors } = listingBlocks([pageOf("one", [a, none]), pageOf("two", [b])]);
  assert.deepEqual(errors, []);
  assert.deepEqual(blocks.map((l) => [l.page, l.block.id]), [["one", "f6-a"], ["two", "f6-b"]]);
  // A refused spelling isn't a reader: it's an error, and no page gains the copy rule by it.
  const other = listingBlocks([pageOf("one", [browser("f6-other", "SELECT * FROM 'range-listings.parquet';")])]);
  assert.deepEqual(other.blocks, []);
  assert.equal(other.errors.length, 1);
});

test("F7 a block that doesn't run in a browser's tables is refused in both modes, naming it", () => withDist(async (out) => {
  await refusedBothWays(out, browser("f7-error", `SELECT nope FROM ${FILE};`), /doesn't run/);
  await refusedBothWays(out, browser("f7-star", `SELECT count(*) FROM ${FILE} AS l JOIN dim_species AS d ON d.species_id = l.speciesId;`), /doesn't run/);
}));

test("F8 only VARCHAR, INTEGER, BIGINT and DOUBLE cells pass", () => withDist(async (out) => {
  const one = `FROM ${MDD} LIMIT 1`;
  for (const [id, cell, type] of [
    ["f8-list", "[1]", "INTEGER\\[\\]"], ["f8-struct", "{'a': 1}", "STRUCT"], ["f8-enum", "'a'::ENUM('a', 'b')", "ENUM"],
    ["f8-decimal", "1.5", "DECIMAL"], ["f8-date", "DATE '2026-11-02'", "DATE"], ["f8-boolean", "true", "BOOLEAN"],
  ] as const) await refusedBothWays(out, browser(id, `SELECT ${cell} AS c ${one};`), new RegExp(`cell type.*${type}`));
  const fine = browser("f8-fine", `SELECT 'a' AS v, 1 AS i, 1::BIGINT AS b, 1.5::DOUBLE AS d ${one};`);
  assert.equal((await guard(out, [listing(fine)], new Map([[fine.id, await rendered(out, fine)]]), false)).error, undefined);
}));

test("F9 more than one row needs the query's own ORDER BY", () => withDist(async (out) => {
  const rows = `SELECT l.country AS a FROM ${MDD}`;
  await refusedBothWays(out, browser("f9-none", `${rows};`), /no ORDER BY/);
  await refusedBothWays(out, browser("f9-window", `SELECT l.country AS a, row_number() OVER (ORDER BY l.country) AS n FROM ${MDD};`), /no ORDER BY/);
  await refusedBothWays(out, browser("f9-agg", `SELECT l.speciesId AS a, string_agg(l.country ORDER BY l.country) AS b FROM ${MDD} GROUP BY l.speciesId;`), /no ORDER BY/);
  await refusedBothWays(out, browser("f9-cte", `WITH c AS (${rows} ORDER BY a) SELECT a FROM c;`), /no ORDER BY/);
  await refusedBothWays(out, browser("f9-string", `SELECT l.country AS a, 'ORDER BY a' AS b FROM ${MDD};`), /no ORDER BY/);
  await refusedBothWays(out, browser("f9-comment", `${rows} -- ORDER BY a\n;`), /no ORDER BY/);
  await refusedBothWays(out, browser("f9-ident", `SELECT l.country AS "ORDER BY a" FROM ${MDD};`), /no ORDER BY/);
  for (const b of [
    browser("f9-limit", `${rows} ORDER BY a, l.speciesId LIMIT 3;`),
    browser("f9-order", `${rows} ORDER BY a, l.speciesId;`),
    browser("f9-one", `SELECT count(*) AS n FROM ${MDD};`),
    browser("f9-one-window", `SELECT count(*) AS n, row_number() OVER (ORDER BY 1) AS r FROM ${MDD};`),
  ]) assert.equal((await guard(out, [listing(b)], new Map([[b.id, await rendered(out, b)]]), false)).error, undefined, b.id);
}));

test("F10 a block reading non-mammal rows is refused in both modes; a mammal-scoped one passes", () => withDist(async (out) => {
  const scope = /reads non-mammal rows/;
  await refusedBothWays(out, browser("f10-count", `SELECT count(*) AS n FROM ${FILE};`), scope);
  await refusedBothWays(out, browser("f10-facts", `SELECT l.origin, l.presence, count(*) AS n FROM ${FILE} AS l GROUP BY l.origin, l.presence ORDER BY n DESC, l.origin, l.presence;`), scope);
  await refusedBothWays(out, browser("f10-docs", `SELECT speciesId, country FROM ${FILE}
WHERE area IS NULL GROUP BY 1, 2
HAVING (COUNT(*) FILTER (origin LIKE 'native%') > 0 AND COUNT(*) FILTER (origin = 'introduced') > 0)
    OR (COUNT(*) FILTER (presence = 'present') > 0 AND COUNT(*) FILTER (presence = 'absent') > 0)
ORDER BY 1, 2;`), scope);
  for (const b of [
    browser("f10-mdd", `SELECT count(*) AS n FROM ${MDD};`),
    browser("f10-class", `SELECT count(*) AS n FROM ${FILE} AS l JOIN species_taxonomy AS t ON t.species_id = l.speciesId WHERE t.class = 'Mammalia';`),
  ]) assert.equal((await guard(out, [listing(b)], new Map([[b.id, await rendered(out, b)]]), false)).error, undefined, b.id);
}));

test("F11 a result unlike its snapshot: plain refuses with the diff, --draft warns; missing prints the result; equal is silent", () => withDist(async (out) => {
  const b = browser("f11", `SELECT count(*) AS n FROM ${MDD};`);
  const now = await rendered(out, b);
  assert.match(now, /^-- result: f11 · 1 row · sha256 [0-9a-f]{12}\nn\n\d+$/);

  const equal = await guard(out, [listing(b)], new Map([[b.id, now]]), false);
  assert.deepEqual(equal, { error: undefined, warned: [] });

  const changed = now.replace(/\d+$/, "1");
  const plain = await guard(out, [listing(b)], new Map([[b.id, changed]]), false);
  assert.ok(plain.error?.includes("f11") && plain.error.includes("- 1") && plain.error.includes(`+ ${now.split("\n").at(-1)}`), String(plain.error));
  const draft = await guard(out, [listing(b)], new Map([[b.id, changed]]), true);
  assert.equal(draft.error, undefined);
  assert.ok(draft.warned.some((w) => w.includes("f11") && w.includes("- 1")), draft.warned.join("\n"));

  const missingPlain = await guard(out, [listing(b)], new Map(), false);
  assert.ok(missingPlain.error?.includes("no snapshot") && missingPlain.error.includes(now), String(missingPlain.error));
  const missingDraft = await guard(out, [listing(b)], new Map(), true);
  assert.equal(missingDraft.error, undefined);
  assert.ok(missingDraft.warned.some((w) => w.includes("no snapshot") && w.includes(now)), missingDraft.warned.join("\n"));
}));

test("F12 every failure of every block is named in one error; 0 blocks passes; the session closes; dist/ doesn't change", () => withDist(async (out) => {
  const dist = fileURLToPath(out);
  const before = tree(dist);
  assert.deepEqual(await guard(out, [], new Map(), false), { error: undefined, warned: [] });

  // One block with three faults, one with a fourth, one with a fifth: none hides another.
  const many = browser("f12-many", `SELECT [l.country] AS a FROM ${FILE} AS l;`);
  const other = browser("f12-other", `SELECT nope FROM ${FILE};`);
  const stale = browser("f12-stale", `SELECT count(*) AS n FROM ${MDD};`);
  const { error } = await guard(out, [many, other, stale].map((b) => listing(b)), new Map([[many.id, "x"], [other.id, "x"], [stale.id, "x"]]), false);
  for (const reason of [/f12-many.*cell type/, /f12-many.*no ORDER BY/, /f12-many.*reads non-mammal rows/, /f12-other.*doesn't run/, /f12-stale.*snapshot/])
    assert.match(error ?? "", reason);

  // Closed after that failure, the next session opens and passes.
  const fine = browser("f12-fine", `SELECT count(*) AS n FROM ${MDD};`);
  assert.equal((await guard(out, [listing(fine)], new Map([[fine.id, await rendered(out, fine)]]), false)).error, undefined);
  assert.deepEqual(tree(dist), before);
}));
