// Destination guard tests (MF1, plan D11). Failure modes first:
// G1: a load runs with CRITWIRE_DB_TARGET unset or empty (a stray DATABASE_URL rebuilds whatever it points at) → throws
//     naming the variable; a load into a database other than the target → throws naming both databases; the matching
//     target passes.
// B1 (L3 item 5): a batch's parameters (rows × columns) reach postgres.js's 65,534 limit → the load fails past
//     ≈ 2,979 rows; BATCH_ROWS × speciesRows' columns stays under it.
import assert from "node:assert/strict";
import { test } from "node:test";
import { assertTarget, BATCH_ROWS, speciesRows } from "./db.ts";
import { readJson } from "./json.ts";
import { speciesFile, type Species } from "./species.ts";

test("G1 a missing or empty target throws naming CRITWIRE_DB_TARGET", () => {
  for (const target of [undefined, ""]) assert.throws(() => assertTarget("critwire_dev", target), /CRITWIRE_DB_TARGET/);
});

test("G1 a mismatched target throws naming both databases", () => {
  assert.throws(() => assertTarget("critwire_dev", "other_db"), (error: Error) =>
    error.message.includes("critwire_dev") && error.message.includes("other_db") && error.message.includes("CRITWIRE_DB_TARGET"));
});

test("G1 the matching target passes", () => {
  assert.doesNotThrow(() => assertTarget("critwire_dev", "critwire_dev"));
});

test("B1 a batch's parameters stay under postgres.js's 65,534", async () => {
  const [first] = await readJson<Species[]>(speciesFile);
  const columns = Object.keys(speciesRows([first])[0]).length;
  assert.ok(Number.isInteger(BATCH_ROWS) && BATCH_ROWS > 0, `BATCH_ROWS is ${BATCH_ROWS}`);
  assert.ok(BATCH_ROWS * columns < 65_534, `${BATCH_ROWS} rows × ${columns} columns`);
});
