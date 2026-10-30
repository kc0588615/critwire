// learn:check's forced-failure loader (plan D10 check 9, A18; LC6 pure). Written before the code, seen failing first.
// Failure modes:
// - the extra row lands somewhere other than the occurrences COPY, or isn't a duplicate id → the load fails elsewhere
//   or not at all, and the check proves nothing → the first data row repeated right before that COPY's `\.`, the rest
//   byte for byte, and its id returned;
// - the loader's layout changed (no site, two sites, no `\.`, no rows to copy) → refused, "loader layout changed".
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { parseBlock } from "./blocks.ts";
import { blocksToRun, forcedFailureLoader, recordRuns, writeFeed } from "./check.ts";
import { courseBlocks, type CoursePage } from "./course.ts";
import { FEED } from "./feed.ts";
import type { BlockRuns, Outcome } from "./record.ts";
import { renderResult, type Result } from "./result.ts";
import { rasterGate } from "./runner.ts";

const COPY = "COPY occurrences (id, species_id, license) FROM stdin (FORMAT csv);";
const loader = (...lines: string[]) => lines.join("\n") + "\n";
const clean = loader("BEGIN;", "COPY species (id) FROM stdin (FORMAT csv);", "1", "\\.", "", COPY, "77,1,CC0 1.0", "78,1,CC BY 4.0", "\\.", "COMMIT;");

test("LC6 the first occurrences row is repeated before that COPY's end, the rest unchanged", () => {
  const forced = forcedFailureLoader(clean);
  assert.equal(forced.id, "77");
  assert.equal(forced.loader, loader("BEGIN;", "COPY species (id) FROM stdin (FORMAT csv);", "1", "\\.", "", COPY,
    "77,1,CC0 1.0", "78,1,CC BY 4.0", "77,1,CC0 1.0", "\\.", "COMMIT;"));
});

test("LC6 a loader without exactly one occurrences COPY with rows and an end is refused as layout changed", () => {
  for (const changed of [
    clean.replace(COPY, COPY.replace("COPY occurrences", "COPY learn_curriculum.occurrences")),
    clean + loader(COPY, "79,1,CC0 1.0", "\\."),
    loader(COPY, "77,1,CC0 1.0"),
    loader(COPY, "\\."),
    loader(COPY.replace("(id, ", "(species_id, id, "), "1,77,CC0 1.0", "\\."),
  ]) assert.throws(() => forcedFailureLoader(changed), /loader layout changed/, changed);
});

// `-- needs: raster` (004 §0, §3.2; plan L3 §4), with fake queries. Failure modes:
// - a server without PostGIS raster fails each raster block with PostgreSQL's own words, or late → the first raster
//   block stops the run: "block <id> needs PostGIS raster: CREATE EXTENSION postgis_raster";
// - a raster block passes only because the server turned on out-db rasters or a GDAL driver, which a learner's lab
//   doesn't have → either setting off its default is refused, naming it;
// - the check runs for every block, or before blocks that don't need it → once per run, before the first raster block.
const RASTER_BLOCK = parseBlock("g7-x.sql", "-- q: g7-x\n-- status: ran\n-- engine: postgis\n-- needs: raster\nSELECT 1 AS a\n").block!;
const PLAIN_BLOCK = parseBlock("g7-y.sql", "-- q: g7-y\n-- status: ran\n-- engine: postgis\nSELECT 1 AS a\n").block!;
const SETTINGS = { outdb: "off", drivers: "DISABLE_ALL" };

function fakeServer(over: { lib?: boolean; outdb?: string; drivers?: string } = {}) {
  const asked: string[] = [];
  const query = async (text: string) => {
    asked.push(text);
    if (/postgis_raster_lib_version\(\)/.test(text)) {
      if (over.lib === false) throw new Error("function postgis_raster_lib_version() does not exist");
      return [{ version: "3.4.2 c19ce56" }];
    }
    if (/current_setting/.test(text)) return [{ ...SETTINGS, ...over }];
    throw new Error(`unexpected query: ${text}`);
  };
  return { asked, query };
}

test("NR1 a raster block on a server without PostGIS raster stops the run, naming the block and the fix", async () => {
  const { query } = fakeServer({ lib: false });
  await assert.rejects(rasterGate(query)(RASTER_BLOCK), /^Error: block g7-x needs PostGIS raster: CREATE EXTENSION postgis_raster$/);
});

test("NR2 out-db rasters on, or a GDAL driver enabled, is refused, naming the setting", async () => {
  await assert.rejects(rasterGate(fakeServer({ outdb: "on" }).query)(RASTER_BLOCK), /block g7-x: postgis\.enable_outdb_rasters is on, not off/);
  await assert.rejects(rasterGate(fakeServer({ drivers: "GTiff COG" }).query)(RASTER_BLOCK), /block g7-x: postgis\.gdal_enabled_drivers is GTiff COG, not DISABLE_ALL/);
  await rasterGate(fakeServer().query)(RASTER_BLOCK);
});

test("NR3 checked once per run, before the first raster block only", async () => {
  const { asked, query } = fakeServer();
  const gate = rasterGate(query);
  await gate(PLAIN_BLOCK);
  assert.deepEqual(asked, []);
  await gate(RASTER_BLOCK);
  const once = asked.length;
  assert.ok(once > 0);
  await gate(RASTER_BLOCK);
  await gate(PLAIN_BLOCK);
  assert.equal(asked.length, once);
});

// Which blocks a run runs (plan L4 §4.2, finding 3; BF1). Failure modes:
// - `--module s2` runs s2's blocks without s4's `-- boot` block, so a block reading s4_cells fails only there → every
//   run starts with the course's ran boot blocks (page order), then the page's;
// - a boot block on the run's page is listed twice (run twice, its result written twice) → once, first;
// - an untested boot block is run → only ran ones;
// - a whole run's list changes → every page's blocks in page order, boot blocks where runBlocks expects them.
const blockOf = (id: string, head: string) => parseBlock(`${id}.sql`, `-- q: ${id}\n${head}SELECT 1 AS a\n`).block!;
const ran = (id: string) => blockOf(id, "-- status: ran\n-- engine: postgis\n");
const bootOf = (id: string, status = "ran") => blockOf(id, `-- status: ${status}\n-- engine: postgis\n-- boot\n`);
const pageOf = (id: string, ...blocks: ReturnType<typeof ran>[]) => ({ page: { id, file: `${id}.html`, html: "" }, slots: [], blocks }) as CoursePage;
const COURSE = [
  pageOf("setup", ran("pg-role-smoke")),
  pageOf("s2", ran("s2-a"), ran("s2-b")),
  pageOf("s4", bootOf("s4-cells"), ran("s4-a"), bootOf("s4-later")),
  pageOf("s5", bootOf("s5-plan", "untested: needs a server"), ran("s5-a")),
];
const ids = (module?: string) => blocksToRun(COURSE, module).map((b) => b.id);

test("BF1 a --module run starts with the course's ran boot blocks, in page order, then the page's", () => {
  assert.deepEqual(ids("s2"), ["s4-cells", "s4-later", "s2-a", "s2-b"]);
  assert.deepEqual(ids("s5"), ["s4-cells", "s4-later", "s5-plan", "s5-a"]);
});

test("BF1 a boot block on the run's page isn't listed twice", () => {
  assert.deepEqual(ids("s4"), ["s4-cells", "s4-later", "s4-a"]);
});

test("BF1 a whole run's list is every page's blocks in page order", () => {
  assert.deepEqual(ids(), ["pg-role-smoke", "s2-a", "s2-b", "s4-cells", "s4-a", "s4-later", "s5-plan", "s5-a"]);
});

// BF2 (L5 plan T1, S1). Failure modes: `--module p3` builds its lookup from the run list, so a block naming a
// prerequisite page's block fails only there; or the run list picks the helper up as a block of its own, recording
// it twice or running it out of its page.
test("BF2 --module: a cross-page `-- after:` block resolves through courseBlocks; the run list is still boot blocks, then the page's", () => {
  const helper = ran("s4-h");
  const named = blockOf("s5-b", "-- status: ran\n-- engine: postgis\n-- after: s4-h\n");
  const course = [...COURSE.slice(0, 2), pageOf("s4", bootOf("s4-cells"), helper), pageOf("s5", named)];
  assert.deepEqual(blocksToRun(course, "s5").map((b) => b.id), ["s4-cells", "s5-b"]);
  assert.equal(courseBlocks(course).get("s4-h"), helper);
  assert.deepEqual(blocksToRun(course).map((b) => b.id), ["pg-role-smoke", "s2-a", "s2-b", "s4-cells", "s4-h", "s5-b"]);
});

// writeFeed (L5 plan T4, S4; WF1–WF3): learn:check --update writes c1's feed from c1-feed-file's one cell. Failure
// modes:
// - WF1: the feed comes from a run that didn't happen or failed, or from a result that isn't one text cell named `feed`
//   (0 or 2 rows, 2 columns, another name, a jsonb object that would render as something else) → refused, naming the
//   block, nothing written;
// - WF2: the file isn't the cell's text byte for byte (a final newline, re-encoded) → it is, utf8, no final newline;
//   an equal file is rewritten (its mtime moves, so make sees a change) → left alone;
// - WF3: a --module run (never --update), a plain run, or an --update run whose results didn't settle writes the feed
//   → nothing written.
const FEED_TEXT = '{"cells": [{"h3": "8a2a1072b59ffff", "weight": 1}], "meaning": "Records — not its range"}';
const feedRuns = (result: Result | undefined, failures: string[] = []): BlockRuns[] => {
  const o: Outcome = { id: FEED.block, failures, ...(result && !failures.length ? { rendered: renderResult(FEED.block, result), result } : {}) };
  return [{ block: { id: FEED.block, boot: false, plan: [] }, first: o, second: { ...o } }];
};
const cell = (text: unknown) => ({ columns: [FEED.column], rows: [[text]] });
function withDir(fn: (dir: string) => Promise<void>) {
  return async () => {
    const dir = mkdtempSync(join(tmpdir(), "critwire-feed-"));
    try {
      await fn(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
}
const exists = (f: string) => {
  try {
    statSync(f);
    return true;
  } catch {
    return false;
  }
};

test("WF1 writeFeed refuses, naming the block, a missing or failed run and a result that isn't one text cell `feed`", withDir(async (dir) => {
  const file = join(dir, "c1-feed.json");
  const cases: [BlockRuns[], RegExp][] = [
    [[], /q c1-feed-file: no run to write .*c1-feed\.json from/],
    [feedRuns(cell(FEED_TEXT), ["q c1-feed-file: boom"]), /q c1-feed-file: failed, so .*c1-feed\.json isn't written/],
    [feedRuns({ columns: [FEED.column], rows: [] }), /q c1-feed-file: 0 rows, not 1/],
    [feedRuns({ columns: [FEED.column], rows: [[FEED_TEXT], [FEED_TEXT]] }), /q c1-feed-file: 2 rows, not 1/],
    [feedRuns({ columns: [FEED.column, "n"], rows: [[FEED_TEXT, 1]] }), /q c1-feed-file: columns feed, n, not feed/],
    [feedRuns({ columns: ["doc"], rows: [[FEED_TEXT]] }), /q c1-feed-file: columns doc, not feed/],
    [feedRuns(cell(JSON.parse(FEED_TEXT))), /q c1-feed-file: feed is an object, not text: select doc::text/],
  ];
  for (const [runs, error] of cases) await assert.rejects(writeFeed(runs, file), error, String(error));
  assert.ok(!exists(file), "nothing written");
}));

test("WF2 writeFeed writes the cell's text byte for byte, utf8, no final newline; an equal file keeps its mtime", withDir(async (dir) => {
  const file = join(dir, "c1-feed.json");
  await writeFeed(feedRuns(cell(FEED_TEXT)), file);
  assert.equal(readFileSync(file, "utf8"), FEED_TEXT);
  assert.deepEqual(readFileSync(file), Buffer.from(FEED_TEXT, "utf8"));
  const old = new Date("2001-01-01T00:00:00Z");
  utimesSync(file, old, old);
  await writeFeed(feedRuns(cell(FEED_TEXT)), file);
  assert.equal(statSync(file).mtimeMs, old.getTime(), "left alone");
  await writeFeed(feedRuns(cell(FEED_TEXT.replace("1}", "2}"))), file);
  assert.equal(readFileSync(file, "utf8"), FEED_TEXT.replace("1}", "2}"));
}));

test("WF3 a run without --update (a --module or plain run) and an --update run that didn't settle write no feed", withDir(async (dir) => {
  const file = join(dir, "c1-feed.json");
  const checkedDir = join(dir, "checked");
  const quiet = { checkedDir, log: () => {} };
  // A plain or --module run: the result is checked (here: it has no recorded result, so the run fails) and never written.
  await assert.rejects(recordRuns(feedRuns(cell(FEED_TEXT)), { ...quiet, update: false, feed: file }), /no recorded result/);
  writeFileSync(join(dir, "c1-feed-file.txt"), renderResult(FEED.block, cell(FEED_TEXT)));
  await recordRuns(feedRuns(cell(FEED_TEXT)), { update: false, feed: file, checkedDir: dir, log: () => {} });
  assert.ok(!exists(file), "a checking run writes no feed");
  // An --update run whose blocks didn't all pass, or whose gates failed: nothing written, the feed included.
  const failing: BlockRuns = { block: { id: "c1-other", boot: false, plan: [] }, first: { id: "c1-other", failures: ["q c1-other: boom"] }, second: { id: "c1-other", failures: [] } };
  await assert.rejects(recordRuns([...feedRuns(cell(FEED_TEXT)), failing], { ...quiet, update: true, feed: file }), /q c1-other: boom/);
  await assert.rejects(recordRuns(feedRuns(cell(FEED_TEXT)), { ...quiet, update: true, feed: file, gateFailures: ["agree x: off"] }), /agree x: off/);
  assert.ok(!exists(file), "an unsettled --update writes no feed");
  // An --update run of a course without c1-feed-file (feed undefined): results written, no feed.
  await recordRuns(feedRuns(cell(FEED_TEXT)), { ...quiet, update: true });
  assert.ok(!exists(file));
  // Settled: the results, then the feed.
  await recordRuns(feedRuns(cell(FEED_TEXT)), { ...quiet, update: true, feed: file });
  assert.equal(readFileSync(file, "utf8"), FEED_TEXT);
}));
