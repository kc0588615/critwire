// IS1–IS8: how a lesson editor's run is isolated and a playground run is kept (site/learn/src/isolation.ts, plan D11,
// S12), against a fake engine that records every script it is given. Written before the code, seen failing first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { ScriptError } from "../build/learn/sql.ts";
import { AfterError, assertPersistable, changesTables, runIsolated, TransactionLost } from "../../site/learn/src/isolation.ts";

const RESULT = { columns: ["n"], rows: [[1]] };

/** A fake exec: records each script; `fail` maps a script to the error it throws. */
function fake(fail: Record<string, Error> = {}) {
  const ran: string[] = [];
  const exec = async (sql: string) => {
    ran.push(sql);
    if (fail[sql]) throw fail[sql];
    return sql === "SELECT 1" ? RESULT : { columns: [], rows: [] };
  };
  return { ran, exec };
}

test("IS1 a refused statement in the editor's SQL fails before anything runs, naming it", async () => {
  const { ran, exec } = fake();
  await assert.rejects(runIsolated(exec, [], "SELECT 1; COMMIT"), (e: Error) => {
    assert.ok(e instanceof ScriptError);
    assert.equal(e.message, "statement 2 of 2: COMMIT isn't run here: this editor's changes are rolled back; use the playground");
    return true;
  });
  assert.deepEqual(ran, []);
});

test("IS2 a refused statement in a block it runs after fails before anything runs, naming the block", async () => {
  const { ran, exec } = fake();
  await assert.rejects(runIsolated(exec, [{ id: "d1-ex", sql: "SET threads = 1; SELECT 1" }], "SELECT 1"),
    /^Error: d1-ex: statement 1 of 2: SET isn't run here/);
  assert.deepEqual(ran, []);
});

test("IS3 BEGIN, the after blocks in the order given, the SQL, ROLLBACK; the SQL's result comes back", async () => {
  const { ran, exec } = fake();
  const result = await runIsolated(exec, [{ id: "a", sql: "CREATE TABLE a (x INT)" }, { id: "b", sql: "INSERT INTO a VALUES (1)" }], "SELECT 1");
  assert.deepEqual(result, RESULT);
  assert.deepEqual(ran, ["BEGIN", "CREATE TABLE a (x INT)", "INSERT INTO a VALUES (1)", "SELECT 1", "ROLLBACK"]);
});

test("IS4 the SQL's error is rethrown as it is, after ROLLBACK", async () => {
  const error = new ScriptError(1, 1, "Catalog Error: Table with name nope does not exist!");
  const { ran, exec } = fake({ "SELECT * FROM nope": error });
  await assert.rejects(runIsolated(exec, [], "SELECT * FROM nope"), (e) => e === error);
  assert.deepEqual(ran, ["BEGIN", "SELECT * FROM nope", "ROLLBACK"]);
});

test("IS5 an after block's error is an AfterError naming the block, not the SQL's ScriptError, after ROLLBACK", async () => {
  const { ran, exec } = fake({ "CREATE TABLE a (x INT)": new ScriptError(1, 1, "Catalog Error: Table a already exists") });
  await assert.rejects(runIsolated(exec, [{ id: "d1-ex", sql: "CREATE TABLE a (x INT)" }], "SELECT 1"), (e: Error) => {
    assert.ok(e instanceof AfterError);
    assert.ok(!(e instanceof ScriptError));
    assert.equal(e.id, "d1-ex");
    assert.equal(e.message, "d1-ex, which this runs after, failed: statement 1 of 1: Catalog Error: Table a already exists");
    return true;
  });
  assert.deepEqual(ran, ["BEGIN", "CREATE TABLE a (x INT)", "ROLLBACK"]);
});

test("IS6 BEGIN or ROLLBACK failing is TransactionLost (the engine restarts); nothing runs after a failed BEGIN", async () => {
  const begin = fake({ BEGIN: new ScriptError(1, 1, "TransactionContext Error: cannot start a transaction within a transaction") });
  await assert.rejects(runIsolated(begin.exec, [], "SELECT 1"), (e: Error) => e instanceof TransactionLost && /BEGIN failed: .*within a transaction/.test(e.message));
  assert.deepEqual(begin.ran, ["BEGIN"]);

  const rollback = fake({ ROLLBACK: new ScriptError(1, 1, "TransactionContext Error: no transaction is active") });
  await assert.rejects(runIsolated(rollback.exec, [], "SELECT 1"), (e: Error) => e instanceof TransactionLost && /ROLLBACK failed: .*no transaction/.test(e.message));
  // ROLLBACK failing after the SQL failed: the lost transaction wins, since the engine must restart.
  const both = fake({ "SELECT 2": new ScriptError(1, 1, "boom"), ROLLBACK: new ScriptError(1, 1, "no transaction is active") });
  await assert.rejects(runIsolated(both.exec, [], "SELECT 2"), TransactionLost);
});

test("IS7 the playground refuses transaction control before anything runs, naming the statement; other statements pass", () => {
  assert.throws(() => assertPersistable("CREATE TABLE t (a INT); BEGIN; INSERT INTO t VALUES (1)"), (e: Error) => {
    assert.ok(e instanceof ScriptError);
    assert.match(e.message, /^statement 2 of 3: BEGIN isn't run in the playground/);
    return true;
  });
  assert.doesNotThrow(() => assertPersistable("SET threads = 1; CREATE TABLE t (a INT); DELETE FROM t"));
});

test("IS8 a script changes the tables unless every statement is readsOnly", () => {
  assert.equal(changesTables("SELECT 1; FROM species; -- DELETE\nSHOW TABLES"), false);
  assert.equal(changesTables("SELECT 1; DELETE FROM occurrences"), true);
  assert.equal(changesTables("SET threads = 1"), true);
});
