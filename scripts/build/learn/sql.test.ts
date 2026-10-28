// SQ1–SQ8 (the spike's test/sql.test.ts, ported) and IR1–IR3 (plan D11: what isolated() refuses, shared by the browser
// engine and the block lint). Written before the code, seen failing first. Failure modes: a `;` inside a string, a
// quoted name, a comment or a dollar quote splits a statement; an empty script runs as a no-op; an error doesn't say
// which statement failed; a transaction or session statement in a lesson editor outlives its ROLLBACK.
import { test } from "node:test";
import assert from "node:assert/strict";
import { codeOnly, isolatedRefusal, playgroundRefusal, readsOnly, scriptStatements, splitStatements, statementError } from "./sql.ts";

const texts = (sql: string) => splitStatements(sql).map((s) => s.text);

test("SQ1 ; inside a single-quoted string, with '' escapes, doesn't split", () => {
  assert.deepEqual(texts("SELECT 'a;b'; SELECT 'it''s; fine'"), ["SELECT 'a;b'", "SELECT 'it''s; fine'"]);
});

test("SQ2 ; inside a double-quoted identifier doesn't split", () => {
  assert.deepEqual(texts('SELECT 1 AS "x;y"; SELECT 2 AS "a""b;c"'), ['SELECT 1 AS "x;y"', 'SELECT 2 AS "a""b;c"']);
});

test("SQ3 ; inside -- and /* */ comments doesn't split", () => {
  assert.deepEqual(texts("SELECT 1 -- not; here\n, 2; SELECT /* nor; here */ 3"), ["SELECT 1 -- not; here\n, 2", "SELECT /* nor; here */ 3"]);
});

test("SQ4 no trailing ; keeps the last statement; trailing ; + whitespace/comments adds nothing", () => {
  assert.deepEqual(texts("SELECT 1; SELECT 2"), ["SELECT 1", "SELECT 2"]);
  assert.deepEqual(texts("SELECT 1;\n  \n"), ["SELECT 1"]);
  assert.deepEqual(texts("SELECT 1; -- done\n/* end */\n"), ["SELECT 1"]);
});

test("SQ5 empty statements dropped; comment-only text gives none and fails with 'no SQL to run'", () => {
  assert.deepEqual(texts(";;SELECT 1;; ;SELECT 2;"), ["SELECT 1", "SELECT 2"]);
  assert.deepEqual(splitStatements("-- just a comment\n/* and another */"), []);
  assert.deepEqual(splitStatements("   "), []);
  assert.throws(() => scriptStatements("-- q: x\n-- nothing else"), /no SQL to run/);
  assert.equal(scriptStatements("SELECT 1").length, 1);
});

test("SQ6 statement numbers are 1-based and errors name them", () => {
  const s = splitStatements("SELECT 1;; SELECT 2; SELECT 3");
  assert.deepEqual(s.map((x) => x.n), [1, 2, 3]);
  const e = statementError(s[1]!, 3, "Catalog Error: x");
  assert.match(e.message, /^statement 2 of 3: Catalog Error: x$/);
  assert.deepEqual([e.name, e.statement, e.total, e.detail], ["ScriptError", 2, 3, "Catalog Error: x"]);
});

test("SQ7 unterminated string, identifier or block comment fails", () => {
  assert.throws(() => splitStatements("SELECT 'abc; SELECT 2"), /unterminated string/);
  assert.throws(() => splitStatements('SELECT "abc; SELECT 2'), /unterminated quoted identifier/);
  assert.throws(() => splitStatements("SELECT 1 /* open; SELECT 2"), /unterminated comment/);
  assert.throws(() => splitStatements("SELECT 'it''s"), /unterminated string/);
});

test("SQ8 ; inside a dollar-quoted string ($$ or $tag$) doesn't split; codeOnly blanks it; $1 is a parameter, not a quote", () => {
  assert.deepEqual(texts("DO $$ BEGIN EXECUTE 'x'; END $$; SELECT 1"), ["DO $$ BEGIN EXECUTE 'x'; END $$", "SELECT 1"]);
  assert.deepEqual(texts("SELECT $f$a;$$;b$f$ AS s; SELECT 2"), ["SELECT $f$a;$$;b$f$ AS s", "SELECT 2"]);
  assert.deepEqual(texts("SELECT $1::int; SELECT a$b$ FROM t; SELECT 3"), ["SELECT $1::int", "SELECT a$b$ FROM t", "SELECT 3"]);
  assert.equal(codeOnly("DO $$ GRANT x $$"), "DO" + " ".repeat(14));
  assert.throws(() => splitStatements("SELECT $q$ open; SELECT 2"), /unterminated dollar-quoted string/);
});

test("IR1 transaction control and session statements are refused by their first keyword, any case, after comments", () => {
  for (const kw of ["BEGIN", "START", "COMMIT", "END", "ROLLBACK", "ABORT", "SET", "RESET", "USE", "PRAGMA", "ATTACH", "DETACH", "INSTALL", "LOAD"])
    assert.equal(isolatedRefusal(`-- a note\n/* and */ ${kw.toLowerCase()} x`), `${kw} isn't run here: this editor's changes are rolled back; use the playground`);
});

test("IR2 a keyword elsewhere (in a string, a comment, a CTE or a name) isn't refused", () => {
  for (const s of ["SELECT 'BEGIN'", "-- COMMIT\nSELECT 1", "WITH x AS (SELECT 1) SELECT * FROM x", "SELECT setting FROM t", "UPDATE t SET a = 1", "\"set\" ", "INSERT INTO t VALUES (1)"])
    assert.equal(isolatedRefusal(s), undefined, s);
});

test("IR3 a statement with no code has no keyword to refuse", () => {
  assert.equal(isolatedRefusal("-- nothing"), undefined);
});

test("PR1 the playground refuses transaction control by its first keyword, and nothing else", () => {
  for (const kw of ["BEGIN", "START", "COMMIT", "END", "ROLLBACK", "ABORT"])
    assert.equal(playgroundRefusal(`-- a note\n${kw.toLowerCase()} transaction`), `${kw} isn't run in the playground: an open transaction would break the lesson editors, which roll back their own; transactions are practised in psql`);
  for (const s of ["SET threads = 1", "USE memory", "PRAGMA version", "SELECT 'BEGIN'", "DELETE FROM t", "-- COMMIT"]) assert.equal(playgroundRefusal(s), undefined, s);
});

test("RO1 a read is readsOnly: SELECT, FROM, WITH, VALUES, DESCRIBE, SHOW, SUMMARIZE, EXPLAIN, any case, after comments", () => {
  for (const s of ["SELECT 1", "FROM species", "WITH x AS (SELECT 1) SELECT * FROM x", "VALUES (1)", "DESCRIBE species", "SHOW TABLES", "SUMMARIZE species", "EXPLAIN SELECT 1", "-- note\n/* and */ select 1"])
    assert.equal(readsOnly(s), true, s);
});

test("RO2 a write or a setting isn't: INSERT, UPDATE, DELETE, CREATE, DROP, ALTER, COPY, SET, PRAGMA, CALL, ANALYZE", () => {
  for (const s of ["INSERT INTO t VALUES (1)", "UPDATE t SET a = 1", "DELETE FROM t", "CREATE TABLE t (a INT)", "DROP TABLE t", "ALTER TABLE t ADD b INT", "COPY t TO 'x.csv'", "SET threads = 1", "PRAGMA version", "CALL pragma_version()", "ANALYZE"])
    assert.equal(readsOnly(s), false, s);
});

test("RO3 a CTE that deletes isn't readsOnly", () => {
  assert.equal(readsOnly("WITH d AS (DELETE FROM t RETURNING *) SELECT * FROM d"), false);
});

test("RO4 EXPLAIN ANALYZE isn't readsOnly (it runs the statement)", () => {
  assert.equal(readsOnly("EXPLAIN ANALYZE SELECT 1"), false);
});

test("RO5 a keyword inside a string or a comment doesn't count", () => {
  for (const s of ["SELECT 'DELETE FROM t'", "SELECT 1 -- then DROP it", "SELECT /* INSERT */ 1", "SELECT $$CREATE$$"]) assert.equal(readsOnly(s), true, s);
});

test("RO6 nextval and setval change a sequence: not readsOnly", () => {
  assert.equal(readsOnly("SELECT nextval('s')"), false);
  assert.equal(readsOnly("SELECT setval('s', 1)"), false);
});

test("RO7 SELECT … INTO isn't readsOnly; a word that only contains a keyword is", () => {
  assert.equal(readsOnly("SELECT * INTO t2 FROM t"), false);
  assert.equal(readsOnly("SELECT created, updated_at, intonation, dropped FROM t"), true);
});
