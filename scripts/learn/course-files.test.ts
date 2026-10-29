// course-files.ts: the committed course read from site/learn/ (plan S5). Written before the code, seen failing first.
// Failure modes: a committed block, page or recorded result breaks a rule only the real files show (a lint, a slot
// without a file, a block on no page, a result without its block), so learn:check or the build would meet it late; the
// setup page loses a §0 block, or runs them out of 004's order.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readCourse } from "./course-files.ts";

test("CF1 the committed course passes every lint, and every ran PostGIS block has its recorded result", async () => {
  const { pages, errors, missing } = await readCourse();
  assert.deepEqual(errors, []);
  assert.deepEqual(missing, []);
  assert.equal(pages[0]?.page.id, "setup");
});

test("CF2 the setup page holds §0's (Python's too) and §3.3–3.5's blocks in 004's order", async () => {
  const { pages } = await readCourse();
  const setup = pages.find((p) => p.page.id === "setup")!;
  assert.equal(setup.page.file, "site/learn/pages/setup.html");
  assert.deepEqual(setup.blocks.map((b) => [b.id, b.engine, b.status]), [
    ["setup-counts", "duckdb", "ran"],
    ["pg-session", "postgis", "ran"],
    ["pg-smoke", "postgis", "ran"],
    ["pg-role-smoke", "postgis", "ran"],
    ["pg-tx-smoke", "postgis", "ran"],
    ["py-connect", "python", "ran"],
    ["py-smoke", "python", "ran"],
    ["gpkg-export", "python", "ran"],
    ["arcpy-moran", "python", "untested"],
    ["pbi-smoke", "powerbi", "untested"],
  ]);
});
