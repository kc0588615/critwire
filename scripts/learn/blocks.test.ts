// The block model (plan D2): one block file = 004's fence body, headers included, named by its `-- q:`. The spike's
// static cases (RQ1–5, 13, 15, 17, 26, RP5, PC1, PC7; plan-queries.ts) ported to files, and the new lints (BL1–BL9).
// Written before the code, seen failing first. Failure modes: a block runs that 004 never tested (bad id, status, file
// name); a header is misspelt or repeated and silently ignored; `-- after:` names a block that can't run first; a
// browser block starts with a statement that outlives the editor's ROLLBACK; an EXPLAIN is compared by its text
// instead of by what it teaches; a two-session block mixes in single-session headers; a Power BI block claims to run.
// The privilege, cleanup and determinism rules (RQ15's PostGIS half, RQ18, RP5, RP12, RP14) are privilege.ts's (S2).
import { test } from "node:test";
import assert from "node:assert/strict";
import { lintPage, parseBlock, PBI_STATUS, type Block } from "./blocks.ts";

/** A block file's errors (parse only). */
const errs = (file: string, text: string) => parseBlock(file, text).errors;
/** A parsed block; throws on any error. */
function block(file: string, text: string): Block {
  const { block: b, errors } = parseBlock(file, text);
  assert.deepEqual(errors, [], file);
  return b!;
}
/** Asserts that every expected message appears among the errors. */
function has(errors: string[], ...want: string[]) {
  for (const w of want) assert.ok(errors.some((e) => e.includes(w)), `missing ${JSON.stringify(w)} in\n${errors.join("\n")}`);
}
const sql = (id: string, ...lines: string[]) => [`-- q: ${id}`, ...lines].join("\n") + "\n";
const pg = (id: string, ...lines: string[]) => sql(id, "-- status: ran", "-- engine: postgis", ...lines);

test("BL0 a valid block: fields, code without the test headers (`-- show: cards` kept), statements", () => {
  const b = block("f1-page.sql", sql("f1-page", "-- status: ran", "-- after: f1-a, f1-b", "-- show: cards", "SELECT 1 AS a;", "SELECT 2 AS b"));
  assert.deepEqual(
    { id: b.id, engine: b.engine, status: b.status, after: b.after, boot: b.boot, txOwn: b.txOwn, code: b.code, statements: b.statements.map((s) => s.text) },
    { id: "f1-page", engine: "duckdb", status: "ran", after: ["f1-a", "f1-b"], boot: false, txOwn: false, code: "-- show: cards\nSELECT 1 AS a;\nSELECT 2 AS b\n", statements: ["-- show: cards\nSELECT 1 AS a", "SELECT 2 AS b"] },
  );
  const u = block("d4-x.sql", sql("d4-x", "-- status: untested: needs two sessions", "-- engine: postgis", "SELECT 1"));
  assert.deepEqual([u.status, u.reason, u.engine], ["untested", "needs two sessions", "postgis"]);
  assert.equal(block("a.sql", pg("a", "SELECT 1 / 0", "")).text, pg("a", "SELECT 1 / 0", ""), "text is the file, byte for byte");
});

test("RQ1 a block without `-- q:`", () => {
  has(errs("x.sql", "-- status: ran\nSELECT 1\n"), "x.sql: no `-- q:` header");
});

test("RQ2 a duplicate id on a page", () => {
  const a = block("r02.sql", sql("r02", "-- status: untested: first", "SELECT 1"));
  const b = block("r02.m", ["// q: r02", `// status: ${PBI_STATUS}`, "// input: star/dim_year.csv", "let x = 1 in x"].join("\n") + "\n");
  has(lintPage([a, b]), 'r02.m: duplicate id "r02" (first in r02.sql)');
});

test("RQ3 an id outside [a-z0-9-]+", () => {
  has(errs("R03_bad.sql", sql("R03_bad", "-- status: untested: id test", "SELECT 1")), 'R03_bad.sql: invalid id "R03_bad"');
});

test("RQ4 a missing or unknown status", () => {
  has(errs("r04a.sql", sql("r04a", "SELECT 1")), "q r04a: no `-- status:` header");
  has(errs("r04b.sql", sql("r04b", "-- status: maybe", "SELECT 1")), 'q r04b: unknown status "maybe"');
});

test("RQ5 untested with an empty reason", () => {
  has(errs("r05.sql", sql("r05", "-- status: untested:", "SELECT 1")), "q r05: `untested:` needs a reason");
});

test("RQ13 `-- expect` takes `error <text>`", () => {
  has(errs("r13.sql", sql("r13", "-- status: ran", "-- expect: failure", "SELECT 1")), 'q r13: `-- expect` must be "error <text the error contains>"');
  assert.equal(block("r13b.sql", sql("r13b", "-- status: ran", "-- expect: error Constraint Error", "SELECT 1")).expectError, "Constraint Error");
});

test("RQ15 (browser) transaction control in a browser block is refused before anything runs", () => {
  const e = (id: string, body: string) => errs(`${id}.sql`, sql(id, "-- status: ran", body));
  has(e("r15a", "BEGIN; SELECT 1 AS a"), "q r15a: statement 1: BEGIN isn't run here");
  has(e("r15b", "SELECT 1 AS a; commit"), "q r15b: statement 2: COMMIT isn't run here");
  has(e("r15c", "SELECT 1 AS a;\n-- undo it\nROLLBACK;"), "q r15c: statement 2: ROLLBACK isn't run here");
  has(e("r15d", "START TRANSACTION; SELECT 1 AS a"), "q r15d: statement 1: START isn't run here");
  has(e("r15e", "SET threads = 1;\nSELECT 1 AS a"), "q r15e: statement 1: SET isn't run here"); // RP5 p5i
  assert.deepEqual(errs("r15f.sql", sql("r15f", "-- status: untested: shown only", "BEGIN; SELECT 1")), [], "an untested block never runs");
});

test("RQ17, RP5 p5j: `-- params` is refused on page blocks", () => {
  has(errs("r17.sql", sql("r17", "-- status: ran", "-- params: [5]", "SELECT ? AS a")), "q r17: `-- params` isn't supported: no page binds a learner's input");
  has(errs("p5j.sql", pg("p5j", "-- params: [1]", "SELECT $1::int AS a")), "q p5j: `-- params` isn't supported");
});

test("RQ26, RP5 p5k: `-- after:` blocks exist on the page, come earlier, run, don't expect an error, own no transaction, share the engine", () => {
  const ran = (id: string, ...h: string[]) => block(`${id}.sql`, sql(id, "-- status: ran", ...h, `SELECT 1 AS a`));
  const page = [
    ran("r26a"),
    block("r26u.sql", sql("r26u", "-- status: untested: not run", "SELECT 1")),
    ran("r26x", "-- expect: error Catalog Error"),
    block("r26t.sql", pg("r26t", "-- tx: own", "SELECT 1 AS a")),
    ran("r26c", "-- after: r26a, nope, r26d"),
    ran("r26d", "-- after: r26d"),
    ran("r26e", "-- after: setup, r26u"),
    ran("r26f", "-- after: r26x"),
    block("r26g.sql", pg("r26g", "-- after: r26t, r26a", "SELECT 1 AS a")),
  ];
  has(
    lintPage(page),
    'r26c.sql: q r26c: `-- after`: unknown block "nope" (not on this page)',
    'q r26c: `-- after`: "r26d" comes after it',
    'q r26d: `-- after`: "r26d" comes after it',
    'q r26e: `-- after`: "setup" already runs at boot',
    'q r26e: `-- after`: "r26u" is untested',
    'q r26f: `-- after`: "r26x" expects an error',
    'q r26g: `-- after`: "r26t" owns its transaction',
    'q r26g: `-- after`: "r26a" runs in duckdb, not postgis',
  );
  has(errs("r26h.sql", sql("r26h", "-- status: ran", "-- after: r26a,, Bad", "SELECT 1")), "q r26h: `-- after` must be a comma-separated list of ids");
  has(errs("r26i.sql", sql("r26i", "-- status: ran", "-- after: r26a, r26a", "SELECT 1")), 'q r26i: `-- after`: "r26a" named twice');
});

test("PC1 a pg-session block runs the runner's session, then one SELECT or SHOW", () => {
  has(errs("pg-session.sql", pg("pg-session", "SET search_path = learn_spatial, public;", "SHOW search_path;")), "q pg-session: it must run the runner's session, in order: SET search_path = learn_curriculum, public; then one SELECT or SHOW of the settings");
  has(errs("pg-session.sql", sql("pg-session", "-- status: ran", "SET search_path = learn_curriculum, public;", "SHOW search_path;")), "q pg-session: the pg-session block is `ran` with `-- engine: postgis`");
  assert.deepEqual(errs("pg-session.sql", pg("pg-session", "SET search_path = learn_curriculum, public;", "SHOW search_path;")), []);
});

test("PC7 boot blocks: PostGIS only, no value, no `-- after`, no expected error, not `tx: own`; nothing names one in `-- after`", () => {
  has(errs("b1.sql", sql("b1", "-- status: ran", "-- boot", "SELECT 1")), "q b1: `-- boot` is for engine postgis");
  has(errs("b2.sql", pg("b2", "-- boot", "-- after: b0", "SELECT 1")), "q b2: a `-- boot` block has no `-- after`");
  has(errs("b4.sql", pg("b4", "-- boot", "-- expect: error division by zero", "SELECT 1 / 0")), "q b4: a `-- boot` block can't expect an error");
  has(errs("b5.sql", pg("b5", "-- boot: yes", "SELECT 1")), "q b5: `-- boot` takes no value");
  has(errs("b6.sql", pg("b6", "-- boot", "-- tx: own", "SELECT 1")), "q b6: a `-- boot` block can't be `-- tx: own`");
  const b0 = block("b0.sql", pg("b0", "-- boot", "CREATE TABLE grid (id int)"));
  assert.equal(b0.boot, true);
  has(lintPage([b0, block("b3.sql", pg("b3", "-- after: b0", "SELECT 1"))]), 'q b3: `-- after`: "b0" already runs at boot');
});

test("BL1 the file name is the id, with .sql, .m or .dax", () => {
  has(errs("other.sql", sql("f1-a", "-- status: ran", "SELECT 1")), 'other.sql: q f1-a: the file is named "other.sql", not "f1-a.sql"');
  has(errs("f1-a.txt", sql("f1-a", "-- status: ran", "SELECT 1")), "f1-a.txt: a block file is .sql, .m or .dax");
  has(errs("x.sql", "\n"), "x.sql: no `-- q:` header");
  has(errs("x.sql", sql("x", "-- status: ran", "-- comment only")), "q x: no SQL to run");
  has(errs("x.sql", sql("x", "-- status: ran", "SELECT 'open")), "q x: unterminated string");
});

test("BL2 duplicate and unknown headers; tx and needs values; engine names", () => {
  has(errs("x.sql", sql("x", "-- status: ran", "-- status: ran", "SELECT 1")), "x.sql: duplicate `-- status:` header");
  has(errs("x.sql", sql("x", "-- status: ran", "-- engine: sqlite", "SELECT 1")), 'q x: unknown engine "sqlite" (duckdb or postgis)');
  has(errs("x.sql", pg("x", "-- tx: mine", "SELECT 1")), "q x: `-- tx` takes `own`");
  has(errs("x.sql", sql("x", "-- status: ran", "-- tx: own", "SELECT 1")), "q x: `-- tx: own` is for engine postgis");
  has(errs("x.sql", pg("x", "-- tx: own", "-- after: y", "SELECT 1")), "q x: a `-- tx: own` block has no `-- after`");
  has(errs("x.sql", pg("x", "-- tx: own", "-- expect: error y", "SELECT 1")), "q x: a `-- tx: own` block can't expect an error");
  has(errs("x.sql", pg("x", "-- needs: gpu", "SELECT 1")), "q x: unknown `-- needs: gpu` (raster)");
  has(errs("x.sql", sql("x", "-- status: ran", "-- needs: raster", "SELECT 1")), "q x: `-- needs: raster` is for engine postgis");
  has(errs("x.sql", pg("x", "SELECT ST_Value(rast, 1, 1) FROM t")), "q x: uses the raster API (st_value); add `-- needs: raster`");
  assert.equal(block("x.sql", pg("x", "-- needs: raster", "SELECT ST_Value(rast, 1, 1) FROM t")).needsRaster, true);
});

test("BL3 `-- fails:` only in `tx: own` and sessions blocks, with text; it reads the statement's leading comments", () => {
  has(errs("x.sql", pg("x", "-- fails: boom", "SELECT 1")), "q x: statement 1: `-- fails:` is for `-- tx: own` and `-- sessions:` blocks");
  has(errs("x.sql", pg("x", "-- tx: own", "BEGIN;", "-- fails:", "SELECT 1;", "ROLLBACK")), "q x: statement 2: `-- fails:` needs the text the error contains");
  const b = block("x.sql", pg("x", "-- tx: own", "BEGIN;", "-- run again:", "-- fails: duplicate key", "INSERT INTO t VALUES (1);", "ROLLBACK"));
  assert.deepEqual(b.fails, [undefined, "duplicate key", undefined]);
});

test("BL4 `-- plan:` only on a ran PostGIS block ending in EXPLAIN; each such block asserts rows and a node or condition", () => {
  const explain = ["EXPLAIN (ANALYZE, COSTS OFF, TIMING OFF, SUMMARY OFF)", "SELECT id FROM occurrences WHERE species_id = 63;"];
  has(errs("x.sql", pg("x", "-- plan: rows 1", "SELECT 1")), "q x: `-- plan:` is for a block whose last statement is EXPLAIN");
  has(errs("x.sql", sql("x", "-- status: ran", "-- plan: rows 1", ...explain)), "q x: `-- plan:` is for engine postgis");
  has(errs("x.sql", pg("x", ...explain)), "q x: an EXPLAIN block needs `-- plan: rows <n>`", "q x: an EXPLAIN block needs a `-- plan: <text>` or `-- plan: no <text>` about its nodes");
  has(errs("x.sql", pg("x", "-- plan: rows 9", ...explain)), "q x: an EXPLAIN block needs a `-- plan: <text>`");
  has(errs("x.sql", pg("x", "-- plan: Seq Scan", ...explain)), "q x: an EXPLAIN block needs `-- plan: rows <n>`");
  has(errs("x.sql", pg("x", "-- plan: rows 1", "-- plan: rows 2", "-- plan: Seq Scan", ...explain)), "q x: more than one `-- plan: rows`");
  has(errs("x.sql", pg("x", "-- plan: rows x", "-- plan: Seq Scan", ...explain)), "x.sql: line 4: `-- plan: rows` takes a whole number");
  const b = block("d3-btree.sql", pg("d3-btree", "-- after: d3-analyze", "-- plan: rows 9", "-- plan: Index Cond: (species_id = 63)", "-- plan: no Seq Scan", ...explain));
  assert.deepEqual(b.plan, [
    { kind: "rows", rows: 9, line: 5 },
    { kind: "has", text: "Index Cond: (species_id = 63)", line: 6 },
    { kind: "no", text: "Seq Scan", line: 7 },
  ]);
  assert.deepEqual(errs("u.sql", sql("u", "-- status: untested: shown only", "-- engine: postgis", ...explain)), [], "an untested EXPLAIN needs no assertions");
});

test("BL5 `-- sessions:` is PostGIS only, names two or more sessions, and excludes after, boot, expect and tx", () => {
  has(errs("x.sql", sql("x", "-- status: ran", "-- sessions: A, B", "-- window A", "SELECT 1")), "q x: `-- sessions:` is for engine postgis");
  has(errs("x.sql", pg("x", "-- sessions: A", "-- window A", "SELECT 1")), "q x: `-- sessions:` names two or more sessions");
  has(errs("x.sql", pg("x", "-- sessions: A, A", "-- window A", "SELECT 1")), 'q x: `-- sessions:` names "A" twice');
  has(errs("x.sql", pg("x", "-- sessions: A, b-2", "-- window A", "SELECT 1")), "q x: `-- sessions:` must be a comma-separated list of names [A-Z][A-Za-z0-9]*");
  for (const [h, name] of [["-- after: y", "after"], ["-- boot", "boot"], ["-- expect: error z", "expect"], ["-- tx: own", "tx"]] as const)
    has(errs("x.sql", pg("x", "-- sessions: A, B", h, "-- window A", "SELECT 1")), `q x: a \`-- sessions:\` block has no \`-- ${name}\``);
});

test("BL6 windows and waits: each statement of a sessions block runs in a declared window; neither appears elsewhere", () => {
  const b = block("d4-wait.sql", pg("d4-wait", "-- sessions: A, B", "-- window A", "BEGIN;", "UPDATE t SET m = 7 WHERE id = 1;", "-- window B", "BEGIN;", "-- waits: A holds the row lock", "UPDATE t SET m = 8 WHERE id = 1;", "-- window A", "ROLLBACK;", "-- window B", "SELECT m FROM t WHERE id = 1;", "ROLLBACK;"));
  assert.deepEqual(b.sessions, ["A", "B"]);
  assert.deepEqual(b.windows, ["A", "A", "B", "B", "A", "B", "B"]);
  assert.deepEqual(b.waits, [undefined, undefined, undefined, "A holds the row lock", undefined, undefined, undefined]);
  has(errs("x.sql", pg("x", "-- sessions: A, B", "SELECT 1;", "-- window A", "SELECT 2")), "q x: statement 1 has no `-- window <name>` before it");
  has(errs("x.sql", pg("x", "-- sessions: A, B", "-- window C", "SELECT 1")), 'q x: statement 1: window "C" isn\'t in `-- sessions:`');
  has(errs("x.sql", pg("x", "-- window A", "SELECT 1")), "q x: statement 1: `-- window` is for `-- sessions:` blocks");
  has(errs("x.sql", pg("x", "-- tx: own", "-- waits: lock", "SELECT 1")), "q x: statement 1: `-- waits:` is for `-- sessions:` blocks");
  has(errs("x.sql", pg("x", "-- sessions: A, B", "-- window A", "-- waits:", "SELECT 1")), "q x: statement 1: `-- waits:` needs the reason it waits");
  has(errs("x.sql", pg("x", "-- sessions: A, B", "-- window A", "SELECT 1")), 'q x: session "B" runs no statement');
  const fails = block("x.sql", pg("x", "-- sessions: A, B", "-- window A", "BEGIN;", "-- window B", "-- fails: could not serialize", "UPDATE t SET m = 2;", "-- window A", "ROLLBACK"));
  assert.deepEqual(fails.fails, [undefined, "could not serialize", undefined]);
  assert.deepEqual(errs("u.sql", sql("u", "-- status: untested: needs two sessions", "-- engine: postgis", "-- window A", "BEGIN;", "-- window B", "SELECT 1")), [], "an untested block's windows aren't linted");
});

test("BL7 a sessions block can't be named in `-- after:`", () => {
  const s = block("s.sql", pg("s", "-- sessions: A, B", "-- window A", "SELECT 1;", "-- window B", "SELECT 2"));
  has(lintPage([s, block("t.sql", pg("t", "-- after: s", "SELECT 1"))]), 'q t: `-- after`: "s" runs in sessions A, B');
});

test("BL8 Power BI blocks: `// q:`, the fixed status, star inputs, code; never a SQL header", () => {
  const m = (...lines: string[]) => lines.join("\n") + "\n";
  const ok = block("pbi-smoke.m", m("// q: pbi-smoke", `// status: ${PBI_STATUS}`, "// input: star/dim_country.csv, star/dim_year.csv", "let", "  x = 1", "in", "  x"));
  assert.deepEqual([ok.engine, ok.status, ok.reason, ok.inputs, ok.code], ["powerbi", "untested", "Power BI is Windows-only", ["star/dim_country.csv", "star/dim_year.csv"], "let\n  x = 1\nin\n  x\n"]);
  has(errs("p.dax", m("// q: p", "// status: ran", "// input: star/x.csv", "M = 1")), "q p: Power BI can't run here; its status is `// status: untested: Power BI is Windows-only`");
  has(errs("p.dax", m("// q: p", `// status: ${PBI_STATUS}`, "M = 1")), "q p: no `// input:` header (the star files it reads)");
  has(errs("p.dax", m("// q: p", `// status: ${PBI_STATUS}`, "// input: dim_year.csv, star/a.csv, star/a.csv", "M = 1")), 'q p: input "dim_year.csv" isn\'t star/<file>.csv', 'q p: input "star/a.csv" named twice');
  has(errs("p.dax", m("// q: p", `// status: ${PBI_STATUS}`, "// input: star/a.csv", "// after: q", "M = 1")), "p.dax: line 4: unknown header `// after:` (q, status, input)");
  has(errs("p.dax", m("// q: p", `// status: ${PBI_STATUS}`, "// input: star/a.csv")), "q p: no code");
  has(errs("p.m", m("-- q: p", "SELECT 1")), "p.m: no `// q:` header");
});

test("BL9 a page's lint passes a valid page", () => {
  const page = [
    block("pg-session.sql", pg("pg-session", "SET search_path = learn_curriculum, public;", "SHOW search_path;")),
    block("d1-a.sql", pg("d1-a", "CREATE TABLE t (id int);", "SELECT 1 AS a")),
    block("d1-b.sql", pg("d1-b", "-- after: d1-a", "SELECT count(*) AS n FROM t")),
    block("d1-c.sql", sql("d1-c", "-- status: ran", "SELECT 1 AS a")),
  ];
  assert.deepEqual(lintPage(page), []);
});
