// learn:check's forced-failure loader (plan D10 check 9, A18; LC6 pure). Written before the code, seen failing first.
// Failure modes:
// - the extra row lands somewhere other than the occurrences COPY, or isn't a duplicate id → the load fails elsewhere
//   or not at all, and the check proves nothing → the first data row repeated right before that COPY's `\.`, the rest
//   byte for byte, and its id returned;
// - the loader's layout changed (no site, two sites, no `\.`, no rows to copy) → refused, "loader layout changed".
import assert from "node:assert/strict";
import { test } from "node:test";
import { parseBlock } from "./blocks.ts";
import { forcedFailureLoader } from "./check.ts";
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
