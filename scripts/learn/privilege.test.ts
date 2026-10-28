// PV1–PV8 and CL1–CL9: privilege.ts, the one module of rules on what a block may run and what it leaves behind (spike
// test/privilege.test.ts and test/cleanup-lint.test.ts, ported; plan D2). Then the static cases S1 moved here (RQ15's
// PostGIS half, RQ18's functions, RP5, RP12, RP14), through the page lint that calls it. Written before the code, seen
// failing first. Failure modes: a block grants or drops a role or schema outside learn_ (the learner's own database,
// or critwire_dev's other users); a block names learn_spatial; a block changes the server, the database or a setting
// that outlives it; a result depends on the clock or chance; a block leaves a role, a schema or a SET ROLE behind as a
// learner runs it, hidden by the runner's ROLLBACK; a keyword in a comment or a string trips a rule.
import { test } from "node:test";
import assert from "node:assert/strict";
import { splitStatements } from "../build/learn/sql.ts";
import { lintPage, parseBlock, type Block } from "./blocks.ts";
import { blockRuleErrors, roleStatement, type RuleBlock } from "./privilege.ts";

const rule = (sql: string, over: Partial<RuleBlock> = {}): RuleBlock => ({ id: "b", engine: "postgis", status: "ran", txOwn: false, sessions: [], code: sql, statements: splitStatements(sql), ...over });
const errs = (sql: string, over: Partial<RuleBlock> = {}, chain: string[] = []) => blockRuleErrors(rule(sql, over), chain.flatMap((c) => splitStatements(c)));
const ok = (sql: string, over: Partial<RuleBlock> = {}, chain: string[] = []) => assert.deepEqual(errs(sql, over, chain), [], sql);
const bad = (sql: string, re: RegExp, over: Partial<RuleBlock> = {}, chain: string[] = []) => {
  const e = errs(sql, over, chain);
  assert.ok(e.some((x) => re.test(x)), `${sql}\nwant ${re}\ngot ${e.join("\n") || "(none)"}`);
};

test("PV1 role and schema statements pass in PostGIS blocks when every name starts with learn_; unquoted names fold to lower case", () => {
  ok("CREATE ROLE learn_a NOLOGIN; DROP ROLE learn_a");
  ok("CREATE ROLE LEARN_A; DROP ROLE IF EXISTS Learn_A");
  ok('CREATE ROLE "learn_a"; DROP ROLE "learn_a"');
  ok("CREATE USER learn_u IN ROLE learn_g; DROP USER learn_u");
  ok("ALTER ROLE learn_a SET work_mem = '8MB'");
  ok("ALTER ROLE learn_a RENAME TO learn_b");
  ok("GRANT USAGE ON SCHEMA learn_curriculum TO learn_a");
  ok("GRANT SELECT ON ALL TABLES IN SCHEMA learn_curriculum TO learn_a, learn_b WITH GRANT OPTION");
  ok("GRANT SELECT (id, slug) ON species TO learn_a");
  ok("GRANT SELECT ON learn_curriculum.species, countries TO GROUP learn_a");
  ok("GRANT EXECUTE ON FUNCTION learn_x.f(integer, text) TO learn_a");
  ok("GRANT learn_a TO learn_b WITH ADMIN OPTION");
  ok("GRANT learn_a TO learn_b WITH INHERIT FALSE, SET TRUE");
  ok("REVOKE GRANT OPTION FOR SELECT ON species FROM learn_a CASCADE");
  ok("REVOKE learn_a FROM learn_b");
  ok("ALTER DEFAULT PRIVILEGES FOR ROLE learn_a IN SCHEMA learn_x GRANT SELECT ON TABLES TO learn_b");
  ok("DROP OWNED BY learn_a, learn_b CASCADE");
  ok("REASSIGN OWNED BY learn_a TO learn_b");
  ok("SET ROLE learn_a; RESET ROLE");
  ok("SET LOCAL ROLE learn_a; SET ROLE NONE");
  ok("CREATE SCHEMA learn_x; DROP SCHEMA learn_x");
  ok("CREATE SCHEMA IF NOT EXISTS learn_x AUTHORIZATION learn_a; DROP SCHEMA IF EXISTS learn_x, learn_y CASCADE");
  ok("CREATE SCHEMA AUTHORIZATION learn_a");
  ok("ALTER SCHEMA learn_x OWNER TO learn_a");
  ok("ALTER TABLE species OWNER TO learn_a");
  ok("CREATE POLICY p ON species FOR SELECT TO learn_a USING (id < 10)");
  const r = roleStatement('GRANT SELECT ON learn_x.t, "Odd".u TO learn_a, "learn_B", PUBLIC GRANTED BY learn_c');
  assert.deepEqual(r && { kind: r.kind, roles: r.roles, schemas: r.schemas, public: r.public }, { kind: "GRANT", roles: ["learn_a", "learn_B", "learn_c"], schemas: ["learn_x", "Odd"], public: true });
  assert.equal(roleStatement("SELECT 1"), undefined);
  assert.equal(roleStatement("CREATE TABLE t (id int)"), undefined);
  for (const sql of ["CREATE ROLE learn_a", "GRANT USAGE ON SCHEMA learn_x TO learn_a", "CREATE SCHEMA learn_x", "SET ROLE learn_a", "DROP OWNED BY learn_a", "ALTER DEFAULT PRIVILEGES FOR ROLE learn_a GRANT SELECT ON TABLES TO learn_b"])
    bad(sql, /is for engine postgis/, { engine: "duckdb" });
});

test("PV2 any other name is refused, naming it; PUBLIC only as a grantee on objects in a learn_ schema", () => {
  bad("CREATE ROLE reporter", /names role reporter/);
  bad('CREATE ROLE "Learn_x"', /names role Learn_x/);
  bad("CREATE ROLE learn_a IN ROLE pg_read_all_data", /names role pg_read_all_data/);
  bad("ALTER ROLE current_user SET work_mem = '8MB'", /names role current_user/);
  bad("ALTER ROLE learn_a RENAME TO reporter", /names role reporter/);
  bad("DROP ROLE learn_a, critwire", /names role critwire/);
  bad("GRANT USAGE ON SCHEMA public TO learn_a", /names schema public/);
  bad("GRANT SELECT ON public.spatial_ref_sys TO learn_a", /names schema public/);
  bad("GRANT SELECT ON species TO reporter", /names role reporter/);
  bad("GRANT pg_read_all_data TO learn_a", /names role pg_read_all_data/);
  bad("GRANT SELECT ON species TO learn_a GRANTED BY postgres", /names role postgres/);
  bad("CREATE SCHEMA reporting", /names schema reporting/);
  bad("CREATE SCHEMA AUTHORIZATION reporter", /names role reporter/);
  bad("DROP SCHEMA learn_x, public CASCADE", /names schema public/);
  bad("ALTER SCHEMA learn_x RENAME TO reporting", /names schema reporting/);
  bad("SET ROLE critwire", /names role critwire/);
  bad("DROP OWNED BY critwire", /names role critwire/);
  bad("ALTER TABLE species OWNER TO reporter", /names role reporter/);
  bad("CREATE POLICY p ON species TO reporter USING (true)", /names role reporter/);
  bad("ALTER DEFAULT PRIVILEGES FOR ROLE critwire GRANT SELECT ON TABLES TO learn_a", /names role critwire/);
  bad("ALTER DEFAULT PRIVILEGES IN SCHEMA learn_x GRANT SELECT ON TABLES TO learn_a", /without FOR ROLE learn_/);
  bad("SET SESSION AUTHORIZATION learn_a", /SESSION AUTHORIZATION/);
  // PUBLIC
  ok("GRANT USAGE ON SCHEMA learn_x TO PUBLIC");
  ok("GRANT SELECT ON ALL TABLES IN SCHEMA learn_curriculum TO public");
  ok("REVOKE ALL ON learn_curriculum.species FROM PUBLIC");
  ok("ALTER DEFAULT PRIVILEGES FOR ROLE learn_a IN SCHEMA learn_x GRANT SELECT ON TABLES TO PUBLIC");
  bad("GRANT SELECT ON species TO PUBLIC", /PUBLIC/);
  bad("GRANT USAGE ON SCHEMA public TO PUBLIC", /names schema public/);
  bad("GRANT learn_a TO PUBLIC", /PUBLIC/);
  bad("ALTER DEFAULT PRIVILEGES FOR ROLE learn_a GRANT SELECT ON TABLES TO PUBLIC", /PUBLIC/);
  bad('GRANT USAGE ON SCHEMA learn_x TO "PUBLIC"', /names role PUBLIC/);
});

test("PV3 ALTER SYSTEM, ALTER DATABASE and GRANT ON PARAMETER (and other database-wide objects) are refused in every engine", () => {
  for (const engine of ["postgis", "duckdb"] as const) {
    bad("ALTER SYSTEM SET work_mem = '1GB'", /ALTER SYSTEM/, { engine });
    bad("alter database critwire_dev set search_path = x", /ALTER DATABASE/, { engine });
    bad("GRANT SET ON PARAMETER postgis.enable_outdb_rasters TO learn_a", /ON PARAMETER/, { engine });
    bad("REVOKE SET ON PARAMETER work_mem FROM learn_a", /ON PARAMETER/, { engine });
  }
  bad("GRANT CONNECT ON DATABASE critwire_dev TO learn_a", /ON DATABASE/);
  bad("GRANT USAGE ON LANGUAGE plpgsql TO learn_a", /ON LANGUAGE/);
  // an untested block never runs: it may show a learner's one-time setup (RP14)
  ok("GRANT SET ON PARAMETER postgis.enable_outdb_rasters TO my_role;\nALTER DATABASE my_db SET postgis.gdal_enabled_drivers = 'GTiff COG'", { status: "untested" });
  ok("CREATE ROLE reporter LOGIN; BEGIN; SET ROLE reporter; COMMIT", { status: "untested" });
});

test("PV4 any mention of learn_spatial, in any engine, status, case or position, is refused", () => {
  for (const [engine, status] of [["postgis", "ran"], ["duckdb", "ran"], ["postgis", "untested"]] as const) {
    bad("SELECT count(*) AS n FROM learn_spatial.occurrences", /learn_spatial/, { engine, status });
    bad("SELECT 'LEARN_SPATIAL' AS s", /learn_spatial/, { engine, status });
    bad("-- see Learn_Spatial\nSELECT 1 AS a", /learn_spatial/, { engine, status });
  }
  bad('let s = Csv.Document(Web.Contents("learn_spatial"))', /learn_spatial/, { engine: "powerbi", status: "untested", statements: [] });
  bad("SELECT 'learn_spatially' AS s", /learn_spatial/); // any substring: no word-boundary loophole
});

test("PV5 SET and SET LOCAL pass in PostGIS blocks; set_config is refused in DuckDB blocks (SET there is the isolated run's refusal); a SET that would outlive a `-- tx: own` COMMIT is refused", () => {
  ok("SET work_mem = '64MB'; SELECT 1 AS a");
  ok("SET LOCAL enable_seqscan = off; SELECT 1 AS a");
  ok("RESET work_mem; SELECT 1 AS a");
  ok("SELECT set_config('work_mem', '64MB', true) AS v");
  // DuckDB SET, RESET and transaction control: refused once, by parseBlock's isolatedRefusal (blocks.test.ts RQ15)
  ok("SET threads = 1; SELECT 1 AS a", { engine: "duckdb" });
  ok("BEGIN; SELECT 1 AS a", { engine: "duckdb" });
  bad("SELECT set_config('x.y', '1', false) AS v", /set_config/, { engine: "duckdb" });
  bad("BEGIN; SET work_mem = '64MB'; COMMIT", /outlives .*COMMIT/, { txOwn: true });
  bad("BEGIN; SELECT set_config('work_mem', '64MB', false); COMMIT", /set_config/, { txOwn: true });
  ok("BEGIN; SET LOCAL work_mem = '64MB'; SET ROLE learn_a; RESET ROLE; COMMIT", { txOwn: true });
});

test("PV6 random() is refused unless setseed() comes before it, in the block or its `-- after:` chain", () => {
  bad("SELECT random() AS r", /not deterministic: random\(/);
  bad("SELECT random() AS r; SELECT setseed(0.5)", /not deterministic: random\(/);
  bad("SELECT setseed(0.5), random() AS r", /not deterministic: random\(/);
  ok("SELECT setseed(0.5); SELECT random() AS r");
  ok("SELECT random() AS r", {}, ["SELECT setseed(0.25)"]);
  bad("SELECT setseed(0.5); SELECT random() AS r", /not deterministic: random\(/, { engine: "duckdb" });
  bad("SELECT now() AS t", /not deterministic: now\(/);
});

test("PV7 BEGIN, COMMIT and ROLLBACK are refused unless `-- tx: own`; SAVEPOINT, RELEASE and ROLLBACK TO pass in wrapped blocks", () => {
  for (const [sql, word] of [["BEGIN; SELECT 1 AS a", "BEGIN"], ["SELECT 1 AS a; commit", "COMMIT"], ["ROLLBACK", "ROLLBACK"], ["START TRANSACTION", "START"], ["END", "END"], ["ABORT", "ABORT"]])
    bad(sql, new RegExp(`is transaction control \\(${word}\\)`));
  ok("SAVEPOINT s; INSERT INTO t VALUES (1); ROLLBACK TO SAVEPOINT s; RELEASE SAVEPOINT s; SELECT 1 AS a");
  ok("SAVEPOINT s; ROLLBACK TO s; SELECT 1 AS a");
  ok("BEGIN; SELECT 1 AS a; COMMIT; START TRANSACTION; ROLLBACK", { txOwn: true });
  bad("BEGIN; PREPARE TRANSACTION 'x'", /PREPARE TRANSACTION/, { txOwn: true });
  bad("COMMIT PREPARED 'x'", /PREPARED/, { txOwn: true });
});

test("PV8 role keywords inside comments or string literals don't trigger PV1–PV2", () => {
  ok("-- CREATE ROLE reporter;\nSELECT 'GRANT SELECT ON x TO reporter' AS s");
  ok("/* DROP SCHEMA public */ SELECT 1 AS a", { engine: "duckdb" });
  ok("SELECT 'SET ROLE reporter' AS s", { engine: "duckdb" });
  ok("CREATE ROLE learn_a PASSWORD 'reporter'; DROP ROLE learn_a");
  assert.equal(roleStatement("-- GRANT x TO y\nSELECT 1"), undefined);
});

// ---------------------------------------------------------------------------------------------------------------
// The page lint: block files parsed, then lintPage (privilege and cleanup with each block's `-- after:` chain)

/** A parsed block file; throws on a file error. */
function file(id: string, ...lines: string[]): Block {
  const { block, errors } = parseBlock(`${id}.sql`, [`-- q: ${id}`, ...lines].join("\n") + "\n");
  assert.deepEqual(errors, [], id);
  return block!;
}
const pgFile = (id: string, ...lines: string[]) => file(id, "-- status: ran", "-- engine: postgis", ...lines);
/** Asserts each message appears among the page lint's errors, and none of `not`. */
function page(blocks: Block[], want: string[], not: string[] = []) {
  const e = lintPage(blocks);
  for (const w of want) assert.ok(e.some((x) => x.includes(w)), `missing ${JSON.stringify(w)} in\n${e.join("\n") || "(none)"}`);
  for (const n of not) assert.ok(!e.some((x) => x.includes(n)), `unexpected ${JSON.stringify(n)} in\n${e.join("\n")}`);
}
const clean = (body: string, headers: string[] = []) => assert.deepEqual(lintPage([pgFile("c", ...headers, body)]), [], body);
const fails = (body: string, want: string, headers: string[] = []) => page([pgFile("c", ...headers, body)], [`c.sql: q c: `, want]);

test("CL1 CREATE ROLE learn_a with no later DROP ROLE learn_a in the same block fails, naming it", () => {
  fails("CREATE ROLE learn_a;\nSELECT 1 AS a", "creates role learn_a but doesn't drop it");
  fails("CREATE ROLE learn_a;\nCREATE ROLE learn_b;\nDROP ROLE learn_a;\nSELECT 1 AS a", "creates role learn_b");
  fails("CREATE USER learn_u;\nSELECT 1 AS a", "creates role learn_u");
});

test("CL2 CREATE SCHEMA learn_x with no later DROP SCHEMA learn_x fails", () => {
  fails("CREATE SCHEMA learn_x;\nSELECT 1 AS a", "creates schema learn_x but doesn't drop it");
  fails("CREATE SCHEMA AUTHORIZATION learn_a;\nDROP OWNED BY learn_a;\nSELECT 1 AS a", "creates schema learn_a");
});

test("CL3 a role that was granted anything, or owns anything, needs DROP OWNED BY before its DROP ROLE", () => {
  const want = "DROP OWNED BY learn_a before its DROP ROLE";
  fails("CREATE ROLE learn_a;\nGRANT USAGE ON SCHEMA learn_curriculum TO learn_a;\nDROP ROLE learn_a;\nSELECT 1 AS a", want);
  fails("CREATE ROLE learn_a;\nGRANT USAGE ON SCHEMA learn_curriculum TO learn_a;\nDROP ROLE learn_a;\nDROP OWNED BY learn_a;\nSELECT 1 AS a", want);
  fails("CREATE ROLE learn_a;\nDROP OWNED BY learn_a;\nGRANT SELECT ON species TO learn_a;\nDROP ROLE learn_a;\nSELECT 1 AS a", want);
  fails("CREATE ROLE learn_a;\nCREATE SCHEMA learn_x AUTHORIZATION learn_a;\nDROP SCHEMA learn_x;\nDROP ROLE learn_a;\nSELECT 1 AS a", want);
  fails("CREATE ROLE learn_a;\nALTER TABLE species OWNER TO learn_a;\nDROP ROLE learn_a;\nSELECT 1 AS a", want);
  fails("CREATE ROLE learn_a;\nCREATE POLICY p ON species TO learn_a USING (true);\nDROP ROLE learn_a;\nSELECT 1 AS a", want);
  fails("CREATE ROLE learn_a;\nALTER DEFAULT PRIVILEGES FOR ROLE learn_a IN SCHEMA learn_curriculum GRANT SELECT ON TABLES TO learn_a;\nDROP ROLE learn_a;\nSELECT 1 AS a", want);
  clean("CREATE ROLE learn_a;\nDROP ROLE learn_a;\nSELECT 1 AS a");
});

test("CL4 a SET ROLE with no later RESET ROLE fails", () => {
  fails("CREATE ROLE learn_a;\nSET ROLE learn_a;\nDROP OWNED BY learn_a;\nDROP ROLE learn_a;\nSELECT 1 AS a", "statement 2: SET ROLE with no later RESET ROLE");
  fails("CREATE ROLE learn_a;\nRESET ROLE;\nSET ROLE learn_a;\nDROP OWNED BY learn_a;\nDROP ROLE learn_a;\nSELECT 1 AS a", "statement 3: SET ROLE with no later RESET ROLE");
  clean("CREATE ROLE learn_a;\nSET ROLE learn_a;\nSET ROLE NONE;\nDROP OWNED BY learn_a;\nDROP ROLE learn_a;\nSELECT 1 AS a");
});

test("CL5 a DROP that comes before its CREATE doesn't count", () => {
  fails("DROP ROLE IF EXISTS learn_a;\nCREATE ROLE learn_a;\nSELECT 1 AS a", "creates role learn_a");
  fails("DROP SCHEMA IF EXISTS learn_x;\nCREATE SCHEMA learn_x;\nSELECT 1 AS a", "creates schema learn_x");
});

test("CL6 `-- tx: own` blocks are linted the same way", () => {
  fails("BEGIN;\nCREATE ROLE learn_a;\nCOMMIT;\nSELECT 1 AS a", "creates role learn_a but doesn't drop it", ["-- tx: own"]);
  clean("BEGIN;\nCREATE ROLE learn_a;\nDROP ROLE learn_a;\nCOMMIT;\nSELECT 1 AS a", ["-- tx: own"]);
});

test("CL7 a drop in an `-- after:` block doesn't count: each block cleans up after itself", () => {
  page([pgFile("make", "CREATE ROLE learn_a;\nSELECT 1 AS a"), pgFile("c", "-- after: make", "DROP ROLE learn_a;\nSELECT 1 AS a")], ["make.sql: q make: creates role learn_a but doesn't drop it"]);
});

test("CL8 a correct block passes", () => {
  clean(
    [
      "CREATE ROLE learn_reader NOLOGIN;",
      "CREATE SCHEMA learn_reports AUTHORIZATION learn_reader;",
      "GRANT USAGE ON SCHEMA learn_curriculum TO learn_reader;",
      "GRANT SELECT ON ALL TABLES IN SCHEMA learn_curriculum TO learn_reader;",
      "SET ROLE learn_reader;",
      "SELECT count(*) AS n FROM species;",
      "RESET ROLE;",
      "DROP SCHEMA learn_reports CASCADE;",
      "DROP OWNED BY learn_reader;",
      "DROP ROLE learn_reader;",
      "SELECT count(*) AS left_over FROM pg_roles WHERE rolname = 'learn_reader'",
    ].join("\n"),
  );
});

test("CL9 a `-- fails:` statement doesn't happen: a failing DROP doesn't count as the cleanup (d5)", () => {
  const own = ["-- tx: own"];
  const tried = "-- fails: cannot be dropped because some objects depend on it\nDROP ROLE learn_a;";
  clean(["BEGIN;", "CREATE ROLE learn_a;", "GRANT SELECT ON species TO learn_a;", "SAVEPOINT s;", tried, "ROLLBACK TO SAVEPOINT s;", "DROP OWNED BY learn_a;", "DROP ROLE learn_a;", "SELECT 1 AS a;", "ROLLBACK"].join("\n"), own);
  fails(["BEGIN;", "CREATE ROLE learn_a;", "GRANT SELECT ON species TO learn_a;", tried, "SELECT 1 AS a;", "ROLLBACK"].join("\n"), "creates role learn_a but doesn't drop it", own);
  fails(["BEGIN;", "CREATE ROLE learn_a;", "GRANT SELECT ON species TO learn_a;", "-- fails: x\nDROP OWNED BY learn_a;", "DROP ROLE learn_a;", "SELECT 1 AS a;", "ROLLBACK"].join("\n"), "DROP OWNED BY learn_a before its DROP ROLE", own);
});

test("RQ15 (PostGIS) transaction control in a wrapped PostGIS block is refused before anything runs", () => {
  const bodies: [string, string][] = [["r15a", "BEGIN; SELECT 1 AS a"], ["r15b", "SELECT 1 AS a; commit"], ["r15c", "SELECT 1 AS a;\n-- undo it\nROLLBACK;"], ["r15d", "START TRANSACTION; SELECT 1 AS a"]];
  page(bodies.map(([id, body]) => pgFile(id, body)), [
    "q r15a: statement 1 is transaction control (BEGIN)",
    "q r15b: statement 2 is transaction control (COMMIT)",
    "q r15c: statement 2 is transaction control (ROLLBACK)",
    "q r15d: statement 1 is transaction control (START)",
  ]);
  // S22: a `-- sessions:` block runs unwrapped, as `tx: own` does: its windows' BEGIN … ROLLBACK pass, a plain SET doesn't
  const windows = { sessions: ["A", "B"] };
  ok("BEGIN; UPDATE occurrences SET month = 7 WHERE id = 1; ROLLBACK", windows);
  ok("BEGIN; SET LOCAL lock_timeout = '1s'; ROLLBACK", windows);
  bad("SET lock_timeout = '1s'", /changes a setting \(SET\) that outlives the block's COMMIT/, windows);
});

test("RQ18, RP12 the determinism lint: functions, in either engine; names inside strings and comments don't count", () => {
  const cases: [string, string, string][] = [
    ["r18a", "SELECT RANDOM () AS r", "random("], ["r18b", "SELECT hash(1) AS h", "hash("], ["r18c", "SELECT uuid() AS u", "uuid("],
    ["r18d", "SELECT gen_random_uuid() AS u", "gen_random_uuid("], ["r18e", "SELECT now() AS t", "now("], ["r18f", "SELECT current_date AS d", "current_date"],
    ["r18g", "SELECT CURRENT_TIMESTAMP AS t", "current_timestamp"],
  ];
  page(cases.map(([id, body]) => file(id, "-- status: ran", body)), cases.map(([id, , fn]) => `q ${id}: not deterministic: ${fn}`));
  const pgCases: [string, string, string][] = [
    ["p12a", "SELECT clock_timestamp() AS t", "clock_timestamp("], ["p12b", "SELECT count(*) AS n FROM species TABLESAMPLE SYSTEM (10)", "TABLESAMPLE"],
    ["p12c", "SELECT random() AS r", "random("], ["p12d", "SELECT now() AS t", "now("], ["p12e", "SELECT gen_random_uuid() AS u", "gen_random_uuid("],
    ["p12f", "SELECT statement_timestamp() AS t", "statement_timestamp("],
  ];
  page(pgCases.map(([id, body]) => pgFile(id, body)), pgCases.map(([id, , fn]) => `q ${id}: not deterministic: ${fn}`));
  assert.deepEqual(lintPage([file("r18i", "-- status: ran", "SELECT 'random() now() current_date' AS s -- uuid() hash(")]), []);
});

test("RP5 transaction control, privilege changes outside learn_ names and server or database changes fail statically; SET and RESET pass in PostGIS", () => {
  page(
    [
      pgFile("p5a", "BEGIN;", "SELECT 1 AS a;"),
      pgFile("p5b", "ALTER ROLE current_user SET work_mem = '8MB';", "SELECT 1 AS a;"),
      pgFile("p5c", "GRANT SELECT ON public.spatial_ref_sys TO learn_x;", "SELECT 1 AS a;"),
      pgFile("p5d", "REVOKE ALL ON learn_curriculum.species FROM reporter;", "SELECT 1 AS a;"),
      pgFile("p5e", "ALTER SYSTEM SET work_mem = '8MB';", "SELECT 1 AS a;"),
      pgFile("p5f", "SET work_mem = '8MB';", "SELECT 1 AS a;"),
      pgFile("p5g", "RESET work_mem;", "SELECT 1 AS a;"),
      pgFile("p5h", "GRANT SELECT ON species TO PUBLIC;", "SELECT 1 AS a;"),
      pgFile("p5m", "ALTER DATABASE critwire_dev SET work_mem = '8MB';", "SELECT 1 AS a;"),
    ],
    [
      "q p5a: statement 1 is transaction control (BEGIN)",
      "q p5b: statement 1 names role current_user",
      "q p5c: statement 1 names schema public",
      "q p5d: statement 1 names role reporter",
      "q p5e: statement 1 changes the server or the database (ALTER SYSTEM); never",
      "q p5h: statement 1 grants to PUBLIC on an object outside a named learn_ schema",
      "q p5m: statement 1 changes the server or the database (ALTER DATABASE); never",
    ],
    ["q p5f:", "q p5g:"],
  );
  // DuckDB: one refusal per statement (isolatedRefusal), not a second from the privilege rules
  const p5i = parseBlock("p5i.sql", "-- q: p5i\n-- status: ran\nSET threads = 1;\nSELECT 1 AS a;\n");
  assert.deepEqual([...p5i.errors, ...lintPage([p5i.block!])], ["p5i.sql: q p5i: statement 1: SET isn't run here: this editor's changes are rolled back; use the playground"]);
});

test("RP14 an untested block may show privileged statements (a learner's one-time setup, never run); learn_spatial still fails", () => {
  const p14a = file(
    "p14a",
    "-- status: untested: needs the server's superuser",
    "-- engine: postgis",
    "CREATE EXTENSION IF NOT EXISTS postgis_raster;",
    "GRANT SET ON PARAMETER postgis.enable_outdb_rasters, postgis.gdal_enabled_drivers TO my_role;",
    "ALTER DATABASE my_db SET postgis.gdal_enabled_drivers = 'GTiff COG';",
  );
  assert.deepEqual(lintPage([p14a]), []);
  page([file("p14b", "-- status: untested: shown only", "-- engine: postgis", "SELECT * FROM learn_spatial.x")], ["p14b.sql: q p14b: names learn_spatial"]);
});

test("PV6 through the page: a setseed() in an `-- after:` block seeds the block", () => {
  page([pgFile("seed", "SELECT setseed(0.25) AS s"), pgFile("draw", "-- after: seed", "SELECT random() AS r")], [], ["q draw:"]);
  page([pgFile("draw", "SELECT random() AS r")], ["draw.sql: q draw: not deterministic: random("]);
});
