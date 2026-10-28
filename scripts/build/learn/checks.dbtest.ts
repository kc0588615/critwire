// LX, Postgres half (plan D9.4, D15; review SC1, SC5): every LAB_CHECKS query on LAB_CHECK_FIXTURES in PostgreSQL, as
// the loader's DO block runs them; checks.test.ts runs the same in DuckDB. Written before the code that runs them at
// load, seen failing first. Failure modes: a check counts a clean row in Postgres only (a good lab refuses to load); a
// check misses its violation in Postgres only (NaN, ±Infinity, a negative uncertainty or month 13 compare differently
// there), so a bad row loads; a check isn't portable SQL and errors in Postgres.
import assert from "node:assert/strict";
import { test } from "node:test";
import type postgres from "postgres";
import { withLabSchema } from "../../test-db.ts";
import { countLabChecks, LAB_CHECK_FIXTURES, LAB_CHECKS } from "./checks.ts";

const zeros = Object.fromEntries(LAB_CHECKS.map((c) => [c.name, 0]));
class Rollback extends Error {}

// The counts after `statements`, in a transaction that is rolled back, with search_path on the schema.
async function pgCounts(sql: postgres.Sql, schema: string, statements: readonly string[]): Promise<Record<string, number>> {
  let counts: Record<string, number> = {};
  try {
    await sql.begin(async (tx) => {
      await tx.unsafe(`SET LOCAL search_path = ${schema}`);
      for (const s of statements) await tx.unsafe(s);
      counts = await countLabChecks(async (q) => (await tx.unsafe<{ count: string }[]>(q))[0]!.count);
      throw new Rollback();
    });
  } catch (e) {
    if (!(e instanceof Rollback)) throw e;
  }
  return counts;
}

test("LX in Postgres: every check 0 on the clean fixtures, exactly 1 after each violating statement", (t) => withLabSchema(async (sql, schema) => {
  const base = [LAB_CHECK_FIXTURES.tables, LAB_CHECK_FIXTURES.clean];
  assert.deepEqual(await pgCounts(sql, schema, base), zeros);
  for (const check of LAB_CHECKS) {
    for (const [i, violation] of (LAB_CHECK_FIXTURES.violating[check.name] ?? []).entries()) {
      await t.test(`${check.name} #${i + 1}: ${violation}`, async () => {
        const counts = await pgCounts(sql, schema, [...base, violation]);
        assert.equal(counts[check.name], 1);
      });
    }
  }
}));
