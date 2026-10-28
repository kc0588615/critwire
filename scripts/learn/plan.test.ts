// PL1–PL6 (plan D4, review item 1 SC6): `-- plan:` assertions, which check an EXPLAIN by what the lesson teaches
// instead of by its text. Written before the code, seen failing first. Failure modes: a plan that lost its index still
// passes; a Sort that appeared goes unnoticed; the row count is read from a child node; an assertion that can't be
// parsed is silently ignored; an error doesn't say which assertion failed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePlanAssertion, planErrors, type PlanAssertion } from "./plan.ts";

const PLAN = [
  "Bitmap Heap Scan on occurrences (actual rows=9 loops=1)",
  "  Recheck Cond: (species_id = 63)",
  "  Heap Blocks: exact=6",
  "  ->  Bitmap Index Scan on occurrences_species_id_idx (actual rows=9 loops=1)",
  "        Index Cond: (species_id = 63)",
];
const a = (value: string, line = 5): PlanAssertion => {
  const p = parsePlanAssertion(value, line);
  if (typeof p === "string") throw new Error(p);
  return p;
};

test("PL1 the three forms parse: text, no <text>, rows <n>", () => {
  assert.deepEqual(a("Index Cond: (species_id = 63)"), { kind: "has", text: "Index Cond: (species_id = 63)", line: 5 });
  assert.deepEqual(a("no Seq Scan"), { kind: "no", text: "Seq Scan", line: 5 });
  assert.deepEqual(a("rows 9"), { kind: "rows", rows: 9, line: 5 });
});

test("PL2 an empty assertion, `no` without text and a bad row count are refused", () => {
  assert.match(String(parsePlanAssertion("", 4)), /line 4: `-- plan:` needs <text>, no <text> or rows <n>/);
  assert.match(String(parsePlanAssertion("no ", 4)), /line 4: `-- plan: no` needs the text no line may contain/);
  assert.match(String(parsePlanAssertion("rows nine", 4)), /line 4: `-- plan: rows` takes a whole number/);
  assert.match(String(parsePlanAssertion("rows -1", 4)), /line 4: `-- plan: rows` takes a whole number/);
});

test("PL3 assertions that hold give no error", () => {
  assert.deepEqual(planErrors([a("rows 9"), a("Bitmap Index Scan on occurrences_species_id_idx"), a("Index Cond: (species_id = 63)"), a("no Seq Scan"), a("no Sort")], PLAN), []);
});

test("PL4 a rows mismatch fails with its line; rows come from the top node only", () => {
  assert.deepEqual(planErrors([a("rows 6", 7)], PLAN), ["line 7: `-- plan: rows 6`: the top node has actual rows=9"]);
  assert.deepEqual(planErrors([a("rows 9", 7)], ["Seq Scan on t", "  ->  Index Scan (actual rows=9 loops=1)"]), [
    "line 7: `-- plan: rows 9`: the top node has no actual rows= (EXPLAIN ANALYZE prints it)",
  ]);
});

test("PL5 `no <text>` that is present fails, naming the plan line", () => {
  assert.deepEqual(planErrors([a("no Recheck Cond", 8)], PLAN), ['line 8: `-- plan: no Recheck Cond`: plan line 2 has it: "  Recheck Cond: (species_id = 63)"']);
});

test("PL6 `<text>` that is absent fails; matching is case-sensitive, as the plan prints", () => {
  assert.deepEqual(planErrors([a("Seq Scan on occurrences", 9)], PLAN), ["line 9: `-- plan: Seq Scan on occurrences`: no plan line has it"]);
  assert.deepEqual(planErrors([a("index cond", 9)], PLAN), ["line 9: `-- plan: index cond`: no plan line has it"]);
});
