// learn:check's PostGIS block runner (plan D3 step 4, S3; spike pg-engine.ts, run-queries.ts runBlock), on critwire_dev
// as critwire_lab, under the lab lock (withLabSchema). Written before the code, seen failing first. Fixture blocks only;
// §0's real blocks run from S5. Failure modes:
// PC1: the session isn't pg-session's (search_path, the 60 s timeout, the lab role) → assertSession refuses it; the
//      pg-session block as 004 §0 has it shows the runner's search_path, with 004's hash.
// RP1: a session that can't start → openSession rejects before any block runs.
// RP2: a geometry, geography, raster or bytea column → the block fails naming the column and the fix.
// RP3: values render as DuckDB's do (int8 digits, numeric text, float8, NULL, bool, date text), with the spike's hash.
// RP6/RQ12: a statement error without `-- expect: error` → fails naming the statement; the next block runs clean.
//      A server WARNING fails the block.
// RP7: a block over its time → cancelled, fails naming the time; the session still runs the next block.
// RP12: several rows without ORDER BY → fails; an EXPLAIN's lines are ordered; EXPLAIN in a comment doesn't count.
// SC6: a `-- plan:` assertion the plan breaks → fails naming the header line.
// RQ13: `-- expect: error` that doesn't hold (it ran, another error, an earlier statement failed) → fails; one that
//       holds renders the error.
// RQ14: a block's changes reach the next block → every block runs in BEGIN … ROLLBACK; `-- after:` blocks run first,
//       in the same transaction.
// RQ21: the result isn't the last statement's → it is.
// LK1–LK3, LK5: a learn_ role or schema a block would leave a learner's psql → fails naming it (after an expected
//       error too); a DROP ROLE with privileges left fails; learn_curriculum and learn_spatial never count.
// RQ23: recorded results: --update runs each block twice and writes checked/<id>.txt only when both agree and every
//       block passed; check mode then passes; a second --update changes nothing; a missing file and a differing one
//       fail (the latter with a line diff); a plan whose text moved passes on its assertions, with a note.
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import type postgres from "postgres";
import { loadEnv, requireEnv } from "../env.ts";
import { withLabSchema } from "../test-db.ts";
import { parseBlock, type Block } from "./blocks.ts";
import { LAB_ROLE, urlTarget } from "./pg.ts";
import { assertSession, learnObjects, openSession, runBlock, runBlocks, type LabSession } from "./runner.ts";

loadEnv();
const target = urlTarget(requireEnv("LEARN_PG_URL"), "LEARN_PG_URL");
const dir = mkdtempSync(join(tmpdir(), "critwire-runner-"));

// The fixtures run while withLabSchema holds the lab lock and a learn_t_ schema; `session` is the runner's own.
let session: LabSession;
let schema: string;
let known: Set<string>;
let release: () => void;
let done: Promise<void>;
before(async () => {
  await new Promise<void>((ready) => {
    done = withLabSchema(async (_sql: postgres.Sql, s: string) => {
      schema = s;
      session = await openSession(target);
      known = new Set(await learnObjects(session.sql));
      ready();
      await new Promise<void>((r) => (release = r));
      await session.end();
    });
  });
});
after(async () => {
  release();
  await done;
  rmSync(dir, { recursive: true, force: true });
});

function block(id: string, body: string, headers: string[] = []): Block {
  const { block, errors } = parseBlock(`${id}.sql`, [`-- q: ${id}`, "-- status: ran", "-- engine: postgis", ...headers, body].join("\n"));
  assert.deepEqual(errors, [], `fixture ${id}`);
  return block!;
}
const run = (b: Block, page: Block[] = [b], timeoutMs?: number) => runBlock(session, b, new Map(page.map((x) => [x.id, x])), { known, timeoutMs });

test("PC1 the session is pg-session's, as the lab role; the pg-session block shows its search_path with 004's hash", async () => {
  const [shown] = await session.sql.unsafe("SELECT current_setting('search_path') AS search_path, current_setting('statement_timeout') AS statement_timeout, current_user::text AS role, current_user = session_user AS own_role");
  assertSession(shown!);
  assert.equal(shown!.role, LAB_ROLE);
  assert.throws(() => assertSession({ ...shown, search_path: "public" }), /search_path = public, expected learn_curriculum, public/);
  assert.throws(() => assertSession({ ...shown, statement_timeout: "0" }), /statement_timeout = 0, expected 1min/);
  assert.throws(() => assertSession({ ...shown, own_role: false }), /current_user = .*, not the session's own role/);
  const o = await run(block("pg-session", "SET search_path = learn_curriculum, public;\nSHOW search_path;"));
  assert.deepEqual(o.failures, []);
  assert.equal(o.rendered, "-- result: pg-session · 1 row · sha256 791623fd72db\nsearch_path\nlearn_curriculum, public");
});

test("RP1 a session that can't start rejects before any block", async () => {
  await assert.rejects(openSession({ ...target, port: 1 }), /ECONNREFUSED|connect/);
});

test("RP2 geometry, geography, raster and bytea columns fail, naming the column; rendered in SQL they pass", async () => {
  const cases: [string, string, string[]][] = [
    ["p2a", "SELECT ST_Point(1, 2) AS geom", []],
    ["p2b", "SELECT ST_Point(1, 2)::geography AS geog", []],
    ["p2c", "SELECT ST_MakeEmptyRaster(1, 1, 0, 0, 1) AS rast", ["-- needs: raster"]],
    ["p2d", "SELECT '\\x00ff'::bytea AS b", []],
  ];
  for (const [id, sql, headers] of cases) {
    const o = await run(block(id, sql, headers));
    const column = /AS (\w+)$/.exec(sql)![1];
    assert.match(o.failures.join("\n"), new RegExp(`^q ${id}: column ${column} is (geometry|geography|raster|bytea): render it in SQL \\(ST_AsText, round\\)$`), id);
  }
  const ok = await run(block("p2e", "SELECT ST_AsText(ST_Point(1, 2)) AS wkt"));
  assert.deepEqual(ok.failures, []);
  assert.match(ok.rendered!, /^-- result: p2e · 1 row · sha256 [0-9a-f]{12}\nwkt\nPOINT\(1 2\)$/);
});

test("RP3 values render as DuckDB's: int8 digits, numeric text, float8, NULL, bool, date; the spike's hash", async () => {
  const o = await run(block("p3a", "SELECT 1::int8 AS i, 1.50::numeric AS n, 0.1::float8 AS f, NULL::int AS z, true AS t, DATE '2026-10-20' AS d"));
  assert.deepEqual(o.failures, []);
  assert.equal(o.rendered, "-- result: p3a · 1 row · sha256 5c8d9b046b0e\ni | n | f | z | t | d\n1 | 1.50 | 0.1 | NULL | true | 2026-10-20");
});

test("RP6 RQ12 a statement error fails naming the statement; a WARNING fails; the next block runs clean", async () => {
  const a = await run(block("p6a", "SELECT 1 AS a;\nSELECT 1 / 0 AS a;\nSELECT 3 AS c"));
  assert.deepEqual(a.failures, ["q p6a: statement 2 of 3: division by zero"]);
  assert.equal(a.rendered, undefined);
  const b = await run(block("p6b", "SELECT 2 AS b"));
  assert.deepEqual(b.failures, []);
  assert.equal(b.rendered, "-- result: p6b · 1 row · sha256 cfaef02af973\nb\n2");
  const c = await run(block("p6c", "SELECT pg_advisory_unlock(424242) AS released"));
  assert.deepEqual(c.failures, ["q p6c: the server warned: WARNING: you don't own a lock of type ExclusiveLock"]);
});

test("RP7 a block over its time is cancelled and fails; the session runs the next block", async () => {
  const started = Date.now();
  const o = await run(block("p7a", "SELECT pg_sleep(30) IS NULL AS slept"), undefined, 1000);
  assert.deepEqual(o.failures, ["q p7a: timed out after 1 s (cancelled)"]);
  assert.ok(Date.now() - started < 10_000, "cancelled, not waited out");
  const next = await run(block("p7b", "SELECT 2 AS b"));
  assert.deepEqual(next.failures, []);
});

test("RP12 several rows need ORDER BY; an EXPLAIN's lines are ordered; EXPLAIN in a comment doesn't count", async () => {
  const g = await run(block("p12g", "SELECT x FROM generate_series(1, 3) AS g (x)"));
  assert.deepEqual(g.failures, ["q p12g: the last statement returns 3 rows without ORDER BY"]);
  const h = await run(block("p12h", "SELECT x FROM generate_series(1, 3) AS g (x) ORDER BY x"));
  assert.deepEqual(h.failures, []);
  assert.equal(h.rendered, "-- result: p12h · 3 rows · sha256 db7cfa416d2d\nx\n1\n2\n3");
  const k = await run(block("p12k", "/* EXPLAIN */ SELECT 'EXPLAIN' AS x FROM generate_series(1, 3) AS g (n)"));
  assert.deepEqual(k.failures, ["q p12k: the last statement returns 3 rows without ORDER BY"]);
  const plan = ["-- plan: rows 2", "-- plan: Function Scan on generate_series g", "-- plan: no Sort"];
  const j = await run(block("p12j", "SELECT 1 AS one;\nexplain (analyze, costs off, timing off, summary off)\nSELECT x FROM generate_series(1, 3) AS g (x) WHERE x > 1", plan));
  assert.deepEqual(j.failures, []);
  assert.equal(j.rendered, "-- result: p12j · 3 rows · sha256 061603b8f886\nQUERY PLAN\nFunction Scan on generate_series g (actual rows=2 loops=1)\n  Filter: (x > 1)\n  Rows Removed by Filter: 1");
});

test("SC6 a `-- plan:` assertion the plan breaks fails, naming its header line", async () => {
  const sql = "explain (analyze, costs off, timing off, summary off)\nSELECT x FROM generate_series(1, 3) AS g (x) WHERE x > 1";
  const o = await run(block("p12m", sql, ["-- plan: rows 3", "-- plan: Index Scan", "-- plan: no Filter"]));
  assert.deepEqual(o.failures, [
    "q p12m: line 4: `-- plan: rows 3`: the top node has actual rows=2",
    "q p12m: line 5: `-- plan: Index Scan`: no plan line has it",
    'q p12m: line 6: `-- plan: no Filter`: plan line 2 has it: "  Filter: (x > 1)"',
  ]);
});

test("RQ13 `-- expect: error` holds only for the last statement's error with its text", async () => {
  const t = `CREATE TABLE ${schema}.t13 (id int PRIMARY KEY);\nINSERT INTO ${schema}.t13 VALUES (1);\n`;
  const pass = await run(block("r13", `${t}INSERT INTO ${schema}.t13 VALUES (1)`, ["-- expect: error duplicate key"]));
  assert.deepEqual(pass.failures, []);
  assert.equal(pass.rendered, '-- result: r13 · error: statement 3 of 3: duplicate key value violates unique constraint "t13_pkey"');
  const ran = await run(block("r13a", "SELECT 1 AS a", ["-- expect: error duplicate key"]));
  assert.deepEqual(ran.failures, ['q r13a: expected an error containing "duplicate key", but it ran']);
  const other = await run(block("r13b", "SELECT no_such_column FROM pg_class", ["-- expect: error duplicate key"]));
  assert.deepEqual(other.failures, ['q r13b: the error lacks "duplicate key": statement 1 of 1: column "no_such_column" does not exist']);
  const early = await run(block("r13c", `${t}INSERT INTO ${schema}.t13 VALUES (1);\nSELECT 1 AS a`, ["-- expect: error duplicate key"]));
  assert.match(early.failures.join("\n"), /^q r13c: statement 3 of 4 failed; only the last statement may: statement 3 of 4: duplicate key/);
});

test("RQ14 every block runs in BEGIN … ROLLBACK; `-- after:` blocks run first in the same transaction; RQ21 last result", async () => {
  const a = block("r14a", `CREATE TABLE ${schema}.t14 (id int);\nINSERT INTO ${schema}.t14 VALUES (1), (2);\nSELECT count(*) AS n FROM ${schema}.t14`);
  const b = block("r14b", `CREATE TABLE ${schema}.t14 (id int);\nSELECT count(*) AS n FROM ${schema}.t14`);
  const c = block("r14c", `INSERT INTO ${schema}.t14 VALUES (3);\nSELECT count(*) AS n FROM ${schema}.t14`, ["-- after: r14a"]);
  const page = [a, b, c];
  const ra = await run(a, page);
  assert.deepEqual(ra.failures, []);
  assert.match(ra.rendered!, /\nn\n2$/);
  const rb = await run(b, page);
  assert.deepEqual(rb.failures, [], "r14a's table was rolled back");
  assert.match(rb.rendered!, /\nn\n0$/);
  const rc = await run(c, page);
  assert.deepEqual(rc.failures, []);
  assert.match(rc.rendered!, /\nn\n3$/);
  const [{ exists }] = await session.sql`select to_regclass(${`${schema}.t14`}) is not null as exists`;
  assert.equal(exists, false);
  const failing = block("r14d", "SELECT 1 / 0 AS x");
  const rd = await run(block("r14e", "SELECT 1 AS one", ["-- after: r14d"]), [failing, block("r14e", "SELECT 1 AS one", ["-- after: r14d"])]);
  assert.deepEqual(rd.failures, ["q r14e: after r14d: statement 1 of 1: division by zero"]);
});

test("LK1–LK3 LK5 a learn_ role or schema left for a learner's psql fails the block; ours never count", async () => {
  const lk1 = await run(block("lk1", "DO $$ BEGIN EXECUTE 'CREATE ROLE learn_t_lk1'; END $$;\nSELECT 1 AS a"));
  assert.match(lk1.failures.join("\n"), /^q lk1: leaves role learn_t_lk1 behind: the runner's ROLLBACK hides it, but a learner's psql keeps it; drop it in the block$/);
  const lk1e = await run(block("lk1e", "DO $$ BEGIN EXECUTE 'CREATE ROLE learn_t_lk1e'; END $$;\nSELECT 1 / 0 AS a", ["-- expect: error division by zero"]));
  assert.match(lk1e.failures.join("\n"), /^q lk1e: leaves role learn_t_lk1e behind/);
  const lk2 = await run(block("lk2", "DO $$ BEGIN EXECUTE 'CREATE SCHEMA learn_t_lk2'; END $$;\nSELECT 1 AS a"));
  assert.match(lk2.failures.join("\n"), /^q lk2: leaves schema learn_t_lk2 behind/);
  const lk3 = await run(block("lk3", "DO $$ BEGIN EXECUTE 'CREATE ROLE learn_t_lk3'; EXECUTE 'GRANT USAGE ON SCHEMA learn_curriculum TO learn_t_lk3'; EXECUTE 'DROP ROLE learn_t_lk3'; END $$;\nSELECT 1 AS a"));
  assert.match(lk3.failures.join("\n"), /^q lk3: statement 1 of 2: role "learn_t_lk3" cannot be dropped because some objects depend on it/);
  const lk5 = await run(block("lk5", "SELECT count(*) AS n FROM pg_namespace WHERE nspname IN ('learn_curriculum')"));
  assert.deepEqual(lk5.failures, []);
  const clean = await run(block("lkc", "CREATE ROLE learn_t_lkc;\nGRANT USAGE ON SCHEMA learn_curriculum TO learn_t_lkc;\nDROP OWNED BY learn_t_lkc;\nDROP ROLE learn_t_lkc;\nSELECT 1 AS a"));
  assert.deepEqual(clean.failures, []);
  assert.deepEqual((await learnObjects(session.sql)).filter((o) => !known.has(o)), [], "the ROLLBACK removed every leak");
});

test("RQ23 --update writes agreed results; check mode passes; a missing, edited or unstable result fails", async () => {
  const checked = join(dir, "checked");
  const page = [block("u1", "SELECT 1 AS a"), block("u2", "SELECT x FROM generate_series(1, 2) AS g (x) ORDER BY x")];
  const notes: string[] = [];
  const opts = (update: boolean) => ({ update, checkedDir: checked, known, log: (l: string) => notes.push(l) });
  await assert.rejects(runBlocks(session, page, opts(false)), /q u1: no recorded result: run pnpm learn:check --update[^]*q u2: no recorded result/);

  await runBlocks(session, page, opts(true));
  const file = join(checked, "u1.txt");
  assert.equal(readFileSync(file, "utf8"), "-- result: u1 · 1 row · sha256 4f395a2e9ea1\na\n1");
  const mtime = statSync(file).mtimeMs;
  await runBlocks(session, page, opts(false));
  await runBlocks(session, page, opts(true));
  assert.equal(statSync(file).mtimeMs, mtime, "a second --update leaves an equal file untouched");

  writeFileSync(file, "-- result: u1 · 1 row · sha256 000000000000\na\n2");
  await assert.rejects(runBlocks(session, page, opts(false)), /q u1: result differs from \S*checked\/u1\.txt[^]*- -- result: u1 · 1 row · sha256 000000000000\n\s*\+ -- result: u1 · 1 row · sha256 4f395a2e9ea1\n\s*- 2\n\s*\+ 1/);

  const unstable = block("u3", "SELECT clock_timestamp()::text AS t");
  await assert.rejects(runBlocks(session, [unstable], opts(true)), /q u3: two runs differ/);
  const failing = [block("u4", "SELECT 4 AS a"), block("u5", "SELECT 1 / 0 AS a")];
  await assert.rejects(runBlocks(session, failing, opts(true)), /q u5: statement 1 of 1: division by zero/);
  assert.throws(() => statSync(join(checked, "u4.txt")), /ENOENT/, "nothing written when a block failed");

  const plan = block("u6", "explain (analyze, costs off, timing off, summary off)\nSELECT x FROM generate_series(1, 3) AS g (x) WHERE x > 1", ["-- plan: rows 2", "-- plan: Filter"]);
  await runBlocks(session, [plan], opts(true));
  writeFileSync(join(checked, "u6.txt"), "-- result: u6 · 1 row · sha256 000000000000\nQUERY PLAN\nSeq Scan on elsewhere");
  notes.length = 0;
  await runBlocks(session, [plan], opts(false));
  assert.match(notes.join("\n"), /q u6: the plan's text differs from \S*checked\/u6\.txt \(its assertions hold\)/);
});
