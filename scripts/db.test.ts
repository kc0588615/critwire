// Destination guard tests (MF1, plan D11). Failure modes first:
// G1: a load runs with CRITWIRE_DB_TARGET unset or empty (a stray DATABASE_URL rebuilds whatever it points at) → throws
//     naming the variable; a load into a database other than the target → throws naming both databases; the matching
//     target passes.
import assert from "node:assert/strict";
import { test } from "node:test";
import { assertTarget } from "./db.ts";

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
