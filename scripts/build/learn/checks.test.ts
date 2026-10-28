// LX, DuckDB half (plan D9.4, D15; review SC1, SC5): every LAB_CHECKS query on LAB_CHECK_FIXTURES, in DuckDB as the
// build runs them. checks.dbtest.ts runs the same fixtures in Postgres. Written before the code, seen failing
// first. Failure modes: a check counts a clean row (the build refuses good data); a check misses its violation (a
// loader that won't load gets published, or a bad row loads); NaN, ±Infinity, a negative uncertainty or month 13 slip
// past because the engine compares them differently; a check has no violating fixture, so nothing proves it fires.
import { test } from "node:test";
import assert from "node:assert/strict";
import { withOfflineDuckDb } from "../duckdb.ts";
import { assertLabChecks, countLabChecks, LAB_CHECK_FIXTURES, LAB_CHECKS } from "./checks.ts";

const duckCounts = (statements: readonly string[]) => withOfflineDuckDb(async (con) => {
  for (const s of statements) await con.run(s);
  return countLabChecks(async (sql) => (await con.runAndReadAll(sql)).getRows()[0]![0] as bigint);
});
const zeros = Object.fromEntries(LAB_CHECKS.map((c) => [c.name, 0]));

test("LX every check has a unique name and at least one violating fixture, and every fixture a check", () => {
  const names = LAB_CHECKS.map((c) => c.name);
  assert.equal(new Set(names).size, names.length);
  assert.deepEqual(Object.keys(LAB_CHECK_FIXTURES.violating).sort(), [...names].sort());
  for (const n of names) assert.ok(LAB_CHECK_FIXTURES.violating[n]!.length > 0, n);
});

test("LX clean fixtures: every check 0 in DuckDB", async () => {
  assert.deepEqual(await duckCounts([LAB_CHECK_FIXTURES.tables, LAB_CHECK_FIXTURES.clean]), zeros);
});

for (const check of LAB_CHECKS) {
  LAB_CHECK_FIXTURES.violating[check.name]?.forEach((violation, i) => {
    test(`LX ${check.name} #${i + 1}: exactly 1 in DuckDB (${violation})`, async () => {
      const counts = await duckCounts([LAB_CHECK_FIXTURES.tables, LAB_CHECK_FIXTURES.clean, violation]);
      assert.equal(counts[check.name], 1);
    });
  });
}

test("LX the edge values are among the fixtures: 'Infinity', NaN, a negative uncertainty, month 13", () => {
  const all = Object.values(LAB_CHECK_FIXTURES.violating).flat().join("\n");
  for (const v of ["'Infinity'", "'NaN'", "-1", "13"]) assert.ok(all.includes(v), v);
});

test("LX assertLabChecks: passes all zeros; refuses naming every failing check and its count", () => {
  assertLabChecks(zeros, "test");
  assert.throws(() => assertLabChecks({ ...zeros, occurrences_month: 2, occurrences_year: 1 }, "test"),
    /test: LAB_CHECKS failed: occurrences_month 2, occurrences_year 1/);
  assert.throws(() => assertLabChecks({ occurrences_month: 0 }, "test"), /missing check/);
});
