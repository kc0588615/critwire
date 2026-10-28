// The PostGIS loader's generator (plan D9.6; port of the spike's LD1–LD4, LD10, LD11). Written before the code, seen
// failing first. Pure: a small in-memory DuckDB, no database. Failure modes:
// LD1: a COPY in text format (or none) silently changes `\` rows (004 F10), or one is smuggled in through a hand-written
//      part → every COPY is FROM stdin (FORMAT csv), anything else throws.
// LD2: WKB written in a form csv mangles → base64, one line per row.
// LD3: '' and NULL merge, or `\.` inside a value ends psql's COPY early → '' quoted, NULL empty; a `\.` line throws.
// LD4: a second transaction (a COMMIT in the DDL, a SAVEPOINT in the keys) breaks "a failed load changes nothing" →
//      the file is \set, BEGIN … COMMIT with no other transaction control; hand-written parts with any throw.
//      The schema is dropped only inside the MF4 guard's DO block, after lock_timeout and before CREATE SCHEMA; a check
//      whose SQL could end its DO block early ($) or whose name isn't plain throws.
// LD10: the same inputs give different bytes → rows ordered by key, the text generated twice is equal.
// LD11: a missing input, a missing or unexpected column, a table without input or input without table → each named.
// The real loader's LD9 and LD10 need dist/: loader.dbtest.ts.
import assert from "node:assert/strict";
import { test } from "node:test";
import { assertCsvCopies, generateLoader } from "./loader.ts";
import { FIXTURE_DDL, FIXTURE_KEYS, fixtureSpec, withFixture } from "./loader-fixture.ts";

const SCHEMA = "learn_t_fixture";

test("LD1 every COPY is FORMAT csv; text format (or none), or a COPY in a hand-written part, throws", () => withFixture(async (con) => {
  const text = await generateLoader(con, fixtureSpec(SCHEMA));
  const copies = text.split("\n").filter((l) => /^COPY /i.test(l));
  assert.equal(copies.length, 4);
  for (const c of copies) assert.match(c, / FROM stdin \(FORMAT csv\);$/);
  assert.doesNotThrow(() => assertCsvCopies(text));
  assert.throws(() => assertCsvCopies("COPY t (a) FROM stdin;\n"), /FORMAT csv/);
  assert.throws(() => assertCsvCopies("COPY t (a) FROM stdin (FORMAT text);\n"), /FORMAT csv/);
  assert.throws(() => assertCsvCopies("copy t from stdin\n"), /FORMAT csv/);
  await assert.rejects(generateLoader(con, fixtureSpec(SCHEMA, { keys: FIXTURE_KEYS + "COPY parent FROM stdin;\n" })), /COPY/);
  await assert.rejects(generateLoader(con, fixtureSpec(SCHEMA, { ddl: FIXTURE_DDL + "\\i other.sql\n" })), /meta-command/);
}));

test("LD2 WKB is written as base64, one line per row", () => withFixture(async (con) => {
  const text = await generateLoader(con, fixtureSpec(SCHEMA));
  assert.match(text, /^COPY shapes \(id, geom\) FROM stdin \(FORMAT csv\);\n1,AQEAAAAAAAAAAADwPwAAAAAAAABA\n\\\.$/m);
}));

test("LD3 '' is quoted and NULL empty; a value holding a line \\. throws", () => withFixture(async (con) => {
  const text = await generateLoader(con, fixtureSpec(SCHEMA));
  assert.match(text, /^7,""$/m);
  assert.match(text, /^8,$/m);
  await con.run("CREATE TABLE dot AS SELECT 1 AS id, 'a\n\\.\nb' AS s");
  const spec = fixtureSpec(SCHEMA, { tables: fixtureSpec(SCHEMA).tables.map((t) => (t.name === "texts" ? { ...t, from: "dot" } : t)) });
  await assert.rejects(generateLoader(con, spec), /texts: a value holds a line/);
}));

test("LD4 \\set ON_ERROR_STOP on, BEGIN, encoding, lock_timeout first; COMMIT last; no other transaction control", () => withFixture(async (con) => {
  const text = await generateLoader(con, fixtureSpec(SCHEMA));
  const lines = text.split("\n");
  assert.deepEqual(lines.slice(0, 2), ["\\set ON_ERROR_STOP on", "BEGIN;"]);
  assert.ok(lines.includes("SET client_encoding = 'UTF8';"));
  assert.ok(lines.includes("SET LOCAL lock_timeout = '60s';"));
  const guard = lines.indexOf("DO $guard$");
  assert.ok(lines.indexOf("SET LOCAL lock_timeout = '60s';") < guard);
  assert.ok(guard < lines.indexOf(`CREATE SCHEMA ${SCHEMA};`));
  assert.deepEqual(lines.filter((l) => /DROP SCHEMA/i.test(l)).map((l) => l.trim()), [`DROP SCHEMA ${SCHEMA} CASCADE;`]);
  assert.ok(lines.findIndex((l) => /DROP SCHEMA/i.test(l)) > guard);
  assert.ok(text.endsWith("COMMIT;\n"));
  // Outside COPY data and the DO blocks' PL/pgSQL (whose BEGIN … END is a block, not a transaction).
  let inData = false;
  let doEnd = "";
  const sqlLines = lines.filter((l) => {
    if (inData) return (inData = l !== "\\.") && false;
    if (doEnd) return (doEnd = l === doEnd ? "" : doEnd) && false;
    if (/^COPY /.test(l)) inData = true;
    const tag = /^DO (\$\w*\$)$/.exec(l)?.[1];
    if (tag) doEnd = `${tag};`;
    return true;
  });
  const control = sqlLines.filter((l) => /^\s*(BEGIN|COMMIT|ROLLBACK|END|ABORT|START\s+TRANSACTION|SAVEPOINT|RELEASE|PREPARE\s+TRANSACTION)\b/i.test(l));
  assert.deepEqual(control, ["BEGIN;", "COMMIT;"]);
  assert.deepEqual(lines.filter((l) => /^DO\b/.test(l)), ["DO $guard$", "DO $$"]);
  assert.deepEqual(sqlLines.filter((l) => l.startsWith("\\")), ["\\set ON_ERROR_STOP on"]);
  await assert.rejects(generateLoader(con, fixtureSpec(SCHEMA, { ddl: FIXTURE_DDL + "COMMIT;\n" })), /transaction control/);
  await assert.rejects(generateLoader(con, fixtureSpec(SCHEMA, { keys: FIXTURE_KEYS + "SAVEPOINT a;\n" })), /transaction control/);
  // A comment or string that says COMMIT is not transaction control.
  await assert.doesNotReject(generateLoader(con, fixtureSpec(SCHEMA, { keys: FIXTURE_KEYS + "-- COMMIT;\nCOMMENT ON TABLE parent IS 'COMMIT;';\n" })));
  await assert.rejects(generateLoader(con, fixtureSpec("Bad-Name")), /schema Bad-Name/);
  await assert.rejects(generateLoader(con, fixtureSpec(SCHEMA, { checks: [{ name: "x", sql: "SELECT 0 $$; COMMIT; DO $$" }] })), /check x: \$/);
  await assert.rejects(generateLoader(con, fixtureSpec(SCHEMA, { checks: [{ name: "Bad name", sql: "SELECT 0" }] })), /check Bad name/);
}));

test("LD10 the same inputs give byte-identical output, rows ordered by key", () => withFixture(async (con) => {
  const a = await generateLoader(con, fixtureSpec(SCHEMA));
  assert.equal(await generateLoader(con, fixtureSpec(SCHEMA)), a);
  assert.match(a, /FROM stdin \(FORMAT csv\);\n10,1\n11,2\n12,2\n\\\./);
  assert.match(a, /FROM stdin \(FORMAT csv\);\n1,one\n2,two\n\\\./);
}));

test("LD11 a missing input file, a missing or unexpected column, a table without input or input without table fails, naming it", () => withFixture(async (con) => {
  const swap = (from: string) => fixtureSpec(SCHEMA, { tables: fixtureSpec(SCHEMA).tables.map((t) => (t.name === "parent" ? { ...t, from } : t)) });
  await assert.rejects(generateLoader(con, swap("read_parquet('ld11-nowhere.parquet')")), /ld11-nowhere\.parquet/);
  await assert.rejects(generateLoader(con, swap("(SELECT *, 'x' AS colour FROM parent)")), /parent: unexpected column colour/);
  await assert.rejects(generateLoader(con, swap("(SELECT id FROM parent)")), /parent: input lacks column name/);
  await assert.rejects(generateLoader(con, swap("(SELECT id, now() AS name FROM parent)")), /parent\.name: type TIMESTAMP WITH TIME ZONE has no csv form/);
  await assert.rejects(generateLoader(con, fixtureSpec(SCHEMA, { tables: fixtureSpec(SCHEMA).tables.slice(1) })), /parent: no input/);
  await assert.rejects(generateLoader(con, fixtureSpec(SCHEMA, { ddl: FIXTURE_DDL.replace(/^CREATE TABLE shapes.*$/m, "") })), /shapes: not in the DDL/);
}));
