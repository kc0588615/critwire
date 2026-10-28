// Exercise checks (site/learn/src/check.ts; plan D11, S12). CK1–CK9: A1's result compare (check.test.ts), ported as
// written. PB1–PB4: a probe (an `-- expect: error` block whose `-- after:` names the exercise) must fail on its last
// statement with its text. EX1–EX6: Checker against a fake engine: pristine data only (Fable MF1, Astra MF1), the
// reference cached per generation, the learner's SQL and the probes run isolated. Written before the code, seen
// failing first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHANGED_TABLES, Checker, checkProbe, checkResult, type CheckEngine, type Exercise } from "../../site/learn/src/check.ts";
import { AfterError, type Script } from "../../site/learn/src/isolation.ts";
import type { Result } from "../../site/learn/src/query-result.ts";
import { ScriptError } from "../build/learn/sql.ts";

const res = (columns: string[], rows: unknown[][]) => ({ columns, rows });
const REF = res(["id", "name"], [[1, "a"], [2, "b"], [3, "c"]]);

test("CK1 the same rows under different column names pass", () => {
  assert.equal(checkResult(res(["x", "y"], [[1, "a"], [2, "b"], [3, "c"]]), REF, false).ok, true);
});

test("CK2 another row order passes unordered, fails ordered with the row-order hint", () => {
  const shuffled = res(["id", "name"], [[3, "c"], [1, "a"], [2, "b"]]);
  assert.equal(checkResult(shuffled, REF, false).ok, true);
  const v = checkResult(shuffled, REF, true);
  assert.equal(v.ok, false);
  assert.match(v.hint, /row order/);
  assert.equal(checkResult(REF, REF, true).ok, true);
});

test("CK3 an extra or missing row fails with the row-count hint", () => {
  const extra = checkResult(res(["id", "name"], [...REF.rows, [4, "d"]]), REF, false);
  assert.equal(extra.ok, false);
  assert.match(extra.hint, /4 rows.*3/);
  const missing = checkResult(res(["id", "name"], REF.rows.slice(0, 2)), REF, false);
  assert.equal(missing.ok, false);
  assert.match(missing.hint, /2 rows.*3/);
});

test("CK4 a different column count fails with the column-count hint", () => {
  const v = checkResult(res(["id"], [[1], [2], [3]]), REF, false);
  assert.equal(v.ok, false);
  assert.match(v.hint, /1 column.*2/);
});

test("CK5 swapped columns fail with the column-order hint", () => {
  const v = checkResult(res(["name", "id"], [["a", 1], ["b", 2], ["c", 3]]), REF, false);
  assert.equal(v.ok, false);
  assert.match(v.hint, /column order/);
});

test("CK6 duplicates count (multiset)", () => {
  const ref = res(["v"], [["a"], ["a"], ["b"]]);
  assert.equal(checkResult(res(["v"], [["a"], ["b"], ["b"]]), ref, false).ok, false);
  assert.equal(checkResult(res(["v"], [["b"], ["a"], ["a"]]), ref, false).ok, true);
});

test("CK7 NULL matches NULL, not 0 or ''", () => {
  const ref = res(["v"], [[null]]);
  assert.equal(checkResult(res(["v"], [[null]]), ref, false).ok, true);
  assert.equal(checkResult(res(["v"], [[0]]), ref, false).ok, false);
  assert.equal(checkResult(res(["v"], [[""]]), ref, false).ok, false);
});

test("CK8 BigInt 5n matches 5; lists compare element by element", () => {
  assert.equal(checkResult(res(["n"], [[5n]]), res(["n"], [[5]]), false).ok, true);
  assert.equal(checkResult(res(["l"], [[["BR", "AR"]]]), res(["l"], [[["BR", "AR"]]]), false).ok, true);
  assert.equal(checkResult(res(["l"], [[["AR", "BR"]]]), res(["l"], [[["BR", "AR"]]]), false).ok, false);
  assert.equal(checkResult(res(["l"], [[["BR"]]]), res(["l"], [[["BR", "AR"]]]), false).ok, false);
});

test("CK9 floats match within a relative 1e-9", () => {
  assert.equal(checkResult(res(["x"], [[0.1 + 0.2]]), res(["x"], [[0.3]]), false).ok, true);
  assert.equal(checkResult(res(["x"], [[1e6 * (1 + 1e-12)]]), res(["x"], [[1e6]]), false).ok, true);
  assert.equal(checkResult(res(["x"], [[1.001]]), res(["x"], [[1]]), false).ok, false);
});

const PROBE = { id: "d1-ex-same-url", expect: "PRIMARY KEY or UNIQUE constraint violation" };

test("PB1 a probe that runs without an error fails, naming the probe and the error it should give", () => {
  const v = checkProbe(PROBE, { result: res(["Count"], [[1]]) });
  assert.equal(v.ok, false);
  assert.equal(v.hint, 'd1-ex-same-url should fail after your answer with "PRIMARY KEY or UNIQUE constraint violation", but it ran without an error.');
});

test("PB2 a probe failing with another error fails and shows that error", () => {
  const v = checkProbe(PROBE, { error: new ScriptError(1, 1, "Catalog Error: Table with name species_photos does not exist!") });
  assert.equal(v.ok, false);
  assert.match(v.hint, /^d1-ex-same-url should fail after your answer with "PRIMARY KEY or UNIQUE constraint violation", but it failed with: statement 1 of 1: Catalog Error: Table with name species_photos/);
});

test("PB3 the right text on an earlier statement isn't the last statement's", () => {
  const v = checkProbe(PROBE, { error: new ScriptError(1, 2, "Constraint Error: PRIMARY KEY or UNIQUE constraint violation: duplicate key") });
  assert.equal(v.ok, false);
  assert.match(v.hint, /but it failed with: statement 1 of 2/);
});

test("PB4 the right text on the last statement passes", () => {
  const v = checkProbe(PROBE, { error: new ScriptError(2, 2, "Constraint Error: PRIMARY KEY or UNIQUE constraint violation: duplicate key \"x\"") });
  assert.equal(v.ok, true);
});

/** A fake engine: `answers` maps SQL to its result or error; every isolated run is recorded. */
function fakeEngine(answers: Record<string, Result | Error>) {
  const runs: { after: string[]; sql: string }[] = [];
  const engine = {
    changed: false as boolean,
    generation: 1,
    async isolated(after: readonly Script[], sql: string): Promise<Result> {
      runs.push({ after: after.map((a) => `${a.id}=${a.sql}`), sql });
      const a = answers[sql];
      if (a === undefined) throw new Error(`fake engine: no answer for ${sql}`);
      if (a instanceof Error) throw a;
      return a;
    },
  } satisfies CheckEngine;
  return { engine, runs };
}

const SETUP = { id: "d1-setup", sql: "CREATE TABLE t (a INT)" };
const EX: Exercise = {
  id: "d1-ex",
  answer: "REFERENCE",
  ordered: false,
  after: [SETUP],
  probes: [
    { id: "p1", sql: "PROBE1", expect: "violates unique", after: [SETUP, { id: "d1-ex", sql: "REFERENCE" }] },
    { id: "p2", sql: "PROBE2", expect: "CHECK constraint failed", after: [{ id: "d1-ex", sql: "REFERENCE" }] },
  ],
};
const COUNTS = res(["n"], [[74]]);
const refused = (text: string) => new ScriptError(1, 1, `Constraint Error: ${text}`);

test("EX1 on a changed generation, Check refuses with 002's message and runs nothing", async () => {
  const { engine, runs } = fakeEngine({});
  engine.changed = true;
  const v = await new Checker(engine).check(EX, "MINE");
  assert.deepEqual(v, { ok: false, hint: CHANGED_TABLES });
  assert.equal(CHANGED_TABLES, "Changed the tables? Reset database brings them back.");
  assert.deepEqual(runs, []);
});

test("EX2 the reference runs once per generation and exercise, after the exercise's after blocks; a new generation runs it again", async () => {
  const { engine, runs } = fakeEngine({ REFERENCE: COUNTS, MINE: res(["n"], [[73]]) });
  const checker = new Checker(engine);
  await checker.check(EX, "MINE");
  await checker.check(EX, "MINE");
  assert.deepEqual(runs.filter((r) => r.sql === "REFERENCE"), [{ after: ["d1-setup=CREATE TABLE t (a INT)"], sql: "REFERENCE" }]);
  engine.generation = 2;
  await checker.check(EX, "MINE");
  assert.equal(runs.filter((r) => r.sql === "REFERENCE").length, 2);
});

test("EX3 the learner's SQL runs after the same blocks; its error is the verdict, naming it", async () => {
  const { engine, runs } = fakeEngine({ REFERENCE: COUNTS, MINE: new ScriptError(1, 1, 'Parser Error: syntax error at or near "INSRT"') });
  const v = await new Checker(engine).check(EX, "MINE");
  assert.deepEqual(v, { ok: false, hint: 'Your SQL failed: statement 1 of 1: Parser Error: syntax error at or near "INSRT"' });
  assert.deepEqual(runs.find((r) => r.sql === "MINE")?.after, ["d1-setup=CREATE TABLE t (a INT)"]);
});

test("EX4 a wrong result is the verdict, with the learner's result (the page shows it), and no probe runs", async () => {
  const { engine, runs } = fakeEngine({ REFERENCE: COUNTS, MINE: res(["n"], [[73]]) });
  const v = await new Checker(engine).check(EX, "MINE");
  assert.deepEqual(v, { ok: false, hint: "Some rows differ from the answer.", result: res(["n"], [[73]]) });
  assert.ok(!runs.some((r) => r.sql.startsWith("PROBE")));
});

test("EX5 the probes run in order after the learner's SQL (in the exercise's place); the first that fails is the verdict", async () => {
  const { engine, runs } = fakeEngine({ REFERENCE: COUNTS, MINE: COUNTS, PROBE1: COUNTS, PROBE2: refused("CHECK constraint failed") });
  const v = await new Checker(engine).check(EX, "MINE");
  assert.equal(v.ok, false);
  assert.match(v.hint, /^p1 should fail after your answer with "violates unique", but it ran without an error\.$/);
  assert.deepEqual(runs.find((r) => r.sql === "PROBE1")?.after, ["d1-setup=CREATE TABLE t (a INT)", "d1-ex=MINE"]);
  assert.ok(!runs.some((r) => r.sql === "PROBE2"));
});

test("EX6 every probe refused: Correct; an engine error that isn't the learner's SQL failing is thrown, not a verdict", async () => {
  const ok = fakeEngine({ REFERENCE: COUNTS, MINE: COUNTS, PROBE1: refused("violates unique"), PROBE2: refused("CHECK constraint failed") });
  assert.deepEqual(await new Checker(ok.engine).check(EX, "MINE"), { ok: true, hint: "Correct.", result: COUNTS });
  assert.deepEqual(ok.runs.find((r) => r.sql === "PROBE2")?.after, ["d1-ex=MINE"]);

  const after = fakeEngine({ REFERENCE: COUNTS, MINE: new AfterError("d1-setup", new Error("boom")) });
  await assert.rejects(new Checker(after.engine).check(EX, "MINE"), AfterError);
  const restarted = fakeEngine({ REFERENCE: new Error("the database was restarted") });
  await assert.rejects(new Checker(restarted.engine).check(EX, "MINE"), /restarted/);
});
