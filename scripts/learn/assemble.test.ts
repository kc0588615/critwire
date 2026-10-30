// assemble.ts: the lab downloads, /learn/labs/<page>.sql (plan D7; 004 §7.3). Written before the code, seen failing
// first. Failure modes:
// - the download runs a block differently from learn:check (no BEGIN … ROLLBACK, its `-- after:` blocks missing, a
//   `-- tx: own` block wrapped), so the learner's run and the recorded result disagree → each form exactly as written;
// - pg-session missing or wrapped, so every block runs on the wrong search_path → first, as written;
// - an untested or two-session block runs from the file (d4's windows in one session) → commented out under its reason;
// - a boot block missing (a table the file needs isn't there on a fresh load), repeated, pulled in by a name in prose
//   or a string, or by an untested block → once, right after pg-session, only for a whole-word name in runnable code;
// - the setup page's file clashes with setup.sql (the browser's schema) → pg-checks.sql;
// - the announced errors out of order, so the ERROR-line rule (check.ts) can't match psql's output → page order,
//   each block's `-- fails:` then its `-- expect: error`.
// The Python downloads (L4 plan §5; AS11–AS17 = the architecture's AS1–AS7, AS13 in notebook.test.ts):
// - adding Python blocks changes a page's .sql → the .sql byte-identical;
// - the .py runs a block before connect() exists, or a boot table isn't there → py-connect first, then the boot setup;
// - a boot block pulled in by a comment, or by an untested block, or missed when a string names its table → the
//   Python word test: whole word outside `#` lines;
// - an untested block runs from the .py (e1-submit would submit a GBIF download) → commented out under its reason;
// - boot SQL that a Python """ string changes (`"""`, `\`) → refused;
// - a page whose only Python block is py-connect gets an empty .py; setup's .py clashes → setup.py / setup.ipynb;
// - one page → name map keeps one download per page (finding 1) → pageDownloads by kind, one name each;
// - a block line `# %%` splits a cell in two (the .py's cell marker) → refused.
import assert from "node:assert/strict";
import { test } from "node:test";
import { assembleDownloads, downloadName, pageDownloads, type Download } from "./assemble.ts";
import { parseBlock, type Block } from "./blocks.ts";
import type { CoursePage } from "./course.ts";

function block(id: string, ...lines: string[]): Block {
  const { block: b, errors } = parseBlock(`site/learn/sql/${id}.sql`, lines.join("\n") + "\n");
  assert.deepEqual(errors, [], id);
  return b!;
}
const pg = (id: string, headers: string[], ...code: string[]) => block(id, `-- q: ${id}`, ...headers, "-- engine: postgis", ...code);
const page = (id: string, ...blocks: Block[]): CoursePage => ({ page: { id, file: `site/learn/modules/${id}.html`, html: "" }, slots: [], blocks });

const session = pg("pg-session", ["-- status: ran"], "SET search_path = learn_curriculum, public;", "SHOW search_path;");
const smoke = pg("pg-smoke", ["-- status: ran"], "SELECT count(*) AS n FROM species;");
const setup = page("setup", block("setup-counts", "-- q: setup-counts", "-- status: ran", "SELECT 1 AS one;"), session, smoke);

test("AS1 page → file: setup → pg-checks.sql, a module → <id>.sql", () => {
  assert.equal(downloadName("setup"), "pg-checks.sql");
  assert.equal(downloadName("d3"), "d3.sql");
});

test("AS2 a page with no PostGIS block but pg-session gets no download", () => {
  const only = page("setup", session, block("f1-a", "-- q: f1-a", "-- status: ran", "SELECT 1 AS one;"));
  assert.deepEqual(assembleDownloads([only]), []);
  assert.deepEqual(assembleDownloads([setup, page("f1", block("f1-b", "-- q: f1-b", "-- status: ran", "SELECT 2 AS two;"))]).map((d) => d.name), ["pg-checks.sql"]);
});

test("AS3 head comment, then pg-session as written and unwrapped, then a ran block in BEGIN … ROLLBACK with its after blocks", () => {
  const load = pg("d1-load", ["-- status: ran"], "CREATE TABLE t (id int);", "INSERT INTO t VALUES (1);");
  const read = pg("d1-read", ["-- status: ran", "-- after: d1-load"], "SELECT id FROM t;");
  const [d] = assembleDownloads([setup, page("d1", load, read)]).filter((x) => x.page === "d1");
  assert.equal(d!.name, "d1.sql");
  const [head, ...rest] = d!.text.split("\n-- q: pg-session\n");
  assert.match(head!, /^-- critwire Learn: \/learn\/labs\/d1\.sql/);
  assert.match(head!, /psql -X -d <your database> -f d1\.sql/);
  assert.match(head!, /ON_ERROR_STOP/);
  assert.doesNotMatch(head!, /BEGIN;/);
  assert.equal(
    "-- q: pg-session\n" + rest.join(""),
    [
      "-- q: pg-session", "-- status: ran", "-- engine: postgis", "SET search_path = learn_curriculum, public;", "SHOW search_path;", "",
      "BEGIN;", "-- q: d1-load", "-- status: ran", "-- engine: postgis", "CREATE TABLE t (id int);", "INSERT INTO t VALUES (1);", "ROLLBACK;", "",
      "BEGIN;", "-- runs first: d1-load", "CREATE TABLE t (id int);", "INSERT INTO t VALUES (1);",
      "-- q: d1-read", "-- status: ran", "-- after: d1-load", "-- engine: postgis", "SELECT id FROM t;", "ROLLBACK;", "",
    ].join("\n"),
  );
});

test("AS4 pg-session isn't repeated at its page position; a tx: own block is verbatim", () => {
  const own = pg("pg-tx", ["-- status: ran", "-- tx: own"], "BEGIN;", "CREATE TABLE x (id int);", "ROLLBACK;", "SELECT 1 AS one;");
  const [d] = assembleDownloads([page("setup", session, smoke, own)]);
  assert.equal(d!.text.split("-- q: pg-session").length, 2);
  assert.ok(d!.text.endsWith("\n-- q: pg-tx\n-- status: ran\n-- tx: own\n-- engine: postgis\nBEGIN;\nCREATE TABLE x (id int);\nROLLBACK;\nSELECT 1 AS one;\n"), d!.text);
});

test("AS5 untested and sessions blocks are commented out under their reason, headers as written, and announce nothing", () => {
  const untested = pg("d5-database", ["-- status: untested: needs CREATEDB"], "CREATE DATABASE learn_x;", "", "SELECT 1/0;");
  const windows = pg("d4-wait", ["-- status: untested: two sessions", "-- sessions: A, B"], "-- window A", "BEGIN;", "-- window B", "SELECT 1/0;");
  const [d] = assembleDownloads([setup, page("d4", untested, windows)]).filter((x) => x.page === "d4");
  assert.ok(d!.text.includes([
    "-- not run from this file: needs CREATEDB. Run it by hand, as its page says.",
    "-- q: d5-database", "-- status: untested: needs CREATEDB", "-- engine: postgis", "-- CREATE DATABASE learn_x;", "--", "-- SELECT 1/0;", "",
  ].join("\n")), d!.text);
  assert.ok(d!.text.includes([
    "-- not run from this file: two sessions. Run it by hand, as its page says.",
    "-- q: d4-wait", "-- status: untested: two sessions", "-- sessions: A, B", "-- engine: postgis", "-- -- window A", "-- BEGIN;", "-- -- window B", "-- SELECT 1/0;", "",
  ].join("\n")), d!.text);
  assert.doesNotMatch(d!.text, /^(BEGIN|ROLLBACK);$/m);
  assert.deepEqual(d!.announced, []);
});

test("AS6 a ran sessions block is commented out too, its reason the windows it needs", () => {
  const ran = pg("d4-iso", ["-- status: ran", "-- sessions: A, B"], "-- window A", "SELECT 1 AS one;", "-- window B", "SELECT 2 AS two;");
  const [d] = assembleDownloads([setup, page("d4", ran)]).filter((x) => x.page === "d4");
  assert.match(d!.text, /^-- not run from this file: it needs one psql window per session \(A, B\)\. Run it by hand, as its page says\.$/m);
  assert.match(d!.text, /^-- SELECT 1 AS one;$/m);
});

test("AS7 a boot block comes once, right after pg-session, committed, for a whole-word name in a block's or its after block's code; its own page has it", () => {
  const boot = pg("s4-cells", ["-- status: ran", "-- boot"], "DROP TABLE IF EXISTS s4_cells;", "CREATE TABLE s4_cells AS SELECT 1 AS id;");
  const other = pg("s4-other", ["-- status: ran", "-- boot"], "CREATE OR REPLACE VIEW s4_view AS SELECT 1 AS id;");
  const loads = pg("s2-load", ["-- status: ran"], "CREATE TEMP TABLE w AS SELECT id FROM S4_CELLS;");
  const uses = pg("s2-use", ["-- status: ran", "-- after: s2-load"], "SELECT count(*) AS n FROM w;");
  const again = pg("s2-again", ["-- status: ran"], "SELECT count(*) AS n FROM s4_cells;");
  const course = [setup, page("s4", boot, other), page("s2", loads, uses, again), page("s3", pg("s3-a", ["-- status: ran"], "SELECT 1 AS one;"))];
  const byPage = new Map(assembleDownloads(course).map((d) => [d.page, d.text]));
  const s2 = byPage.get("s2")!;
  assert.equal(s2.split("-- q: s4-cells").length, 2, "once");
  assert.ok(s2.includes("SHOW search_path;\n\nBEGIN;\n-- q: s4-cells\n-- status: ran\n-- boot\n-- engine: postgis\nDROP TABLE IF EXISTS s4_cells;\nCREATE TABLE s4_cells AS SELECT 1 AS id;\nCOMMIT;\n\nBEGIN;\n-- q: s2-load"), s2);
  assert.doesNotMatch(s2, /s4-other/);
  const s4 = byPage.get("s4")!;
  assert.equal(s4.split("-- q: s4-cells").length, 2, "not again at its page position");
  assert.match(s4, /-- q: s4-other/);
  assert.doesNotMatch(s4, /ROLLBACK;/);
  assert.doesNotMatch(byPage.get("s3") ?? "", /s4-cells/);
});

test("AS8 a name only in a comment or a string, or in an untested block, pulls no boot block in; a part of a word neither", () => {
  const boot = pg("s4-cells", ["-- status: ran", "-- boot"], "CREATE TABLE s4_cells (id int);");
  const prose = pg("s2-prose", ["-- status: ran"], "-- reads s4_cells later", "SELECT 's4_cells' AS name, 1 AS s4_cells_n /* s4_cells */;");
  const untested = pg("s2-later", ["-- status: untested: later"], "SELECT * FROM s4_cells;");
  const [d] = assembleDownloads([page("s4", boot), page("s2", prose, untested)]
    .map((p, i) => (i === 0 ? { ...p, blocks: [session, ...p.blocks] } : p))).filter((x) => x.page === "s2");
  assert.doesNotMatch(d!.text, /-- q: s4-cells/);
});

test("AS9 announced errors in page order: each block's -- fails: texts, then its -- expect: error", () => {
  const a = pg("d5-a", ["-- status: ran", "-- expect: error permission denied for table species"], "SET LOCAL ROLE learn_x;", "SELECT 1 FROM species;");
  const b = pg("d5-b", ["-- status: ran", "-- tx: own"], "-- fails: already exists", "CREATE ROLE learn_y;", "-- fails: does not exist", "DROP ROLE learn_z;", "SELECT 1 AS one;");
  const c = pg("d5-c", ["-- status: ran", "-- expect: error division by zero"], "SELECT 1/0;");
  const [d] = assembleDownloads([setup, page("d5", a, b, c)]).filter((x) => x.page === "d5");
  assert.deepEqual(d!.announced, [
    { block: "d5-a", text: "permission denied for table species" },
    { block: "d5-b", text: "already exists" },
    { block: "d5-b", text: "does not exist" },
    { block: "d5-c", text: "division by zero" },
  ]);
});

test("AS10 a course with PostGIS blocks but no pg-session block is refused", () => {
  assert.throws(() => assembleDownloads([page("setup", smoke)]), /no pg-session block/);
});

function pyFile(id: string, ...lines: string[]): Block {
  const { block: b, errors } = parseBlock(`site/learn/sql/${id}.py`, lines.join("\n") + "\n");
  assert.deepEqual(errors, [], id);
  return b!;
}
const connect = pyFile("py-connect", "# q: py-connect", "# status: ran", "import psycopg", "", "", "def connect():",
  '    return psycopg.connect(options="-c search_path=learn_curriculum,public")');
const pySmoke = pyFile("py-smoke", "# q: py-smoke", "# status: ran", "# after: py-connect", "with connect() as conn:",
  '    print(conn.execute("SHOW search_path").fetchone()[0])');
const cells = pg("s4-cells", ["-- status: ran", "-- boot"], "DROP TABLE IF EXISTS s4_cells;", "CREATE TABLE s4_cells AS SELECT 1 AS id;");
const pySetup = page("setup", session, smoke, connect, pySmoke);
const byName = (ds: Download[]) => new Map(ds.map((d) => [d.name, d]));

test("AS11 adding Python blocks to a page leaves its .sql byte-identical", () => {
  const geo = pg("s4-geo", ["-- status: ran"], "SELECT count(*) AS n FROM s4_cells;");
  const before = assembleDownloads([setup, page("s4", cells, geo)]);
  const after = assembleDownloads([page("setup", ...setup.blocks, connect, pySmoke),
    page("s4", cells, geo, pyFile("s4-moran", "# q: s4-moran", "# status: ran", "# after: py-connect", 'print("s4_cells")'))]);
  const sql = (ds: Download[]) => ds.filter((d) => d.kind === "sql").map((d) => [d.name, d.text, d.announced]);
  assert.deepEqual(sql(after), sql(before));
  assert.deepEqual(before.map((d) => d.kind), ["sql", "sql"]);
  assert.deepEqual(after.map((d) => d.name), ["pg-checks.sql", "setup.py", "setup.ipynb", "s4.sql", "s4.py", "s4.ipynb"]);
});

test("AS12 the .py: head, py-connect, the boot setup a string needs (not a comment), each block once; untested commented out", () => {
  const note = pyFile("s2-note", "# q: s2-note", "# status: ran", "# after: py-connect", "# reads s4_cells later", 'print("note")');
  const kde = pyFile("s2-kde", "# q: s2-kde", "# status: ran", "# after: py-connect, s2-note", "# timeout: 90", "with connect() as conn:",
    '    print(conn.execute("SELECT count(*) FROM s4_cells").fetchone()[0])');
  const later = pyFile("s2-later", "# q: s2-later", "# status: untested: submits a download", "# after: s2-kde", "import s4_cells", "", "submit()");
  const plain = [pySetup, page("s4", cells), page("s2", note)];
  assert.doesNotMatch(byName(assembleDownloads(plain)).get("s2.py")!.text, /s4-cells/, "a comment pulls no boot block in");
  const untested = [pySetup, page("s4", cells), page("s2", note, later)];
  assert.doesNotMatch(byName(assembleDownloads(untested)).get("s2.py")!.text, /boot: s4-cells/, "nor an untested block");
  const d = byName(assembleDownloads([pySetup, page("s4", cells), page("s2", note, kde, later)])).get("s2.py")!;
  assert.equal(d.kind, "py");
  assert.equal(d.page, "s2");
  assert.deepEqual(d.announced, []);
  assert.equal(d.timeoutMs, (60 + 60 + 90) * 1000 + 60_000, "its ran blocks' timeouts (py-connect's too) + 60 s per boot block");
  const [head, ...parts] = d.text.split(/\n\n(?=# %% )/);
  assert.match(head!, /^# critwire Learn: \/learn\/labs\/s2\.py\n/);
  assert.match(head!, /^#   python s2\.py$/m);
  for (const w of ["learn_curriculum.sql", "requirements.txt", "PGDATABASE", "LEARN_BASE", "https://critwire.com"]) assert.ok(head!.includes(w), w);
  assert.ok(head!.split("\n").every((l) => l.startsWith("#")), "the head is comments");
  assert.deepEqual(parts, [
    `# %% py-connect\n${connect.text.trimEnd()}`,
    ["# %% boot: s4-cells", "with connect() as conn:", '    conn.execute("""', cells.text.trimEnd(), '""")'].join("\n"),
    `# %% s2-note\n${note.text.trimEnd()}`,
    `# %% s2-kde\n${kde.text.trimEnd()}`,
    ["# %% s2-later", "# not run from this file: submits a download. Run it by hand, as its page says.",
      "# q: s2-later", "# status: untested: submits a download", "# after: s2-kde", "# import s4_cells", "#", "# submit()\n"].join("\n"),
  ]);
});

test("AS14 a .py refuses boot SQL a Python string would change, and a block line that starts a cell", () => {
  const reads = pyFile("s2-a", "# q: s2-a", "# status: ran", "# after: py-connect", 'print("s4_cells")');
  for (const bad of ['SELECT \'"""\' AS q;', "SELECT E'\\n' AS q;"]) {
    const boot = pg("s4-cells", ["-- status: ran", "-- boot"], "CREATE TABLE s4_cells AS SELECT 1 AS id;", bad);
    assert.throws(() => assembleDownloads([pySetup, page("s4", boot), page("s2", reads)]), /s2\.py: boot block s4-cells: its SQL holds """ or \\/);
  }
  const marker = pyFile("s2-b", "# q: s2-b", "# status: ran", "x = 1", "# %% two", "print(x)");
  assert.throws(() => assembleDownloads([pySetup, page("s2", marker)]), /s2\.py: q s2-b: line 4 starts with "# %%"/);
});

test("AS15 a page whose only Python block is py-connect gets no .py; Python blocks without py-connect in the course are refused", () => {
  assert.deepEqual(assembleDownloads([page("setup", session, smoke, connect)]).map((d) => d.name), ["pg-checks.sql"]);
  assert.throws(() => assembleDownloads([page("setup", session, smoke), page("s2", pyFile("s2-a", "# q: s2-a", "# status: ran", 'print("a")'))]),
    /site\/learn\/modules\/s2\.html: Python blocks, but the course has no py-connect block to start its download/);
});

test("AS16 setup's downloads: pg-checks.sql, setup.py and setup.ipynb", () => {
  assert.deepEqual(assembleDownloads([pySetup]).map((d) => [d.name, d.kind]), [["pg-checks.sql", "sql"], ["setup.py", "py"], ["setup.ipynb", "ipynb"]]);
  assert.equal(downloadName("setup", "py"), "setup.py");
  assert.equal(downloadName("s4", "ipynb"), "s4.ipynb");
});

test("AS17 pageDownloads: each page's name per kind, none replacing another", () => {
  const s4 = page("s4", cells, pg("s4-geo", ["-- status: ran"], "SELECT 1 AS one;"), pyFile("s4-m", "# q: s4-m", "# status: ran", 'print("m")'));
  const map = pageDownloads(assembleDownloads([pySetup, s4, page("d1", pg("d1-a", ["-- status: ran"], "SELECT 1 AS one;"))]));
  assert.deepEqual(map.get("s4"), { sql: "s4.sql", py: "s4.py", ipynb: "s4.ipynb" });
  assert.deepEqual(map.get("setup"), { sql: "pg-checks.sql", py: "setup.py", ipynb: "setup.ipynb" });
  assert.deepEqual(map.get("d1"), { sql: "d1.sql" });
  const one = assembleDownloads([pySetup])[0]!;
  assert.throws(() => pageDownloads([one, { ...one, text: "" }]), /setup: two sql downloads \(pg-checks\.sql, pg-checks\.sql\)/);
});

// Cross-page `-- after:` (L5 plan T1, S1). Failure modes: a download inlines a cross-page helper's own `-- after:`
// blocks, so it runs more than learn:check did (or throws, the helper not being on the page); boot detection misses a
// table only the helper's code names, so the file fails on a fresh load; an existing download's bytes move.
const star = pg("d6-dim", ["-- status: ran"], "CREATE TEMP TABLE dim AS SELECT 1 AS id;");
const fact = pg("d6-fact", ["-- status: ran", "-- after: d6-dim"], "CREATE TEMP TABLE fact AS SELECT id FROM dim;");
const twin = pg("p3-twin", ["-- status: ran", "-- after: d6-dim, d6-fact"], "SELECT count(*) AS n FROM fact;");

test("AS18 a cross-page `-- after:` block's own statements run first, in the listed order, inside BEGIN … ROLLBACK; never its own after blocks", () => {
  const only = pg("p3-only", ["-- status: ran", "-- after: d6-fact"], "SELECT 1 AS one;");
  const byPage = new Map(assembleDownloads([setup, page("d6", star, fact), page("p3", twin, only)]).map((d) => [d.page, d.text]));
  const p3 = byPage.get("p3")!;
  assert.ok(p3.includes([
    "BEGIN;", "-- runs first: d6-dim", "CREATE TEMP TABLE dim AS SELECT 1 AS id;", "-- runs first: d6-fact", "CREATE TEMP TABLE fact AS SELECT id FROM dim;",
    "-- q: p3-twin", "-- status: ran", "-- after: d6-dim, d6-fact", "-- engine: postgis", "SELECT count(*) AS n FROM fact;", "ROLLBACK;",
  ].join("\n")), p3);
  assert.ok(p3.includes(["BEGIN;", "-- runs first: d6-fact", "CREATE TEMP TABLE fact AS SELECT id FROM dim;", "-- q: p3-only"].join("\n")), "d6-fact alone, without d6-dim");
  assert.doesNotMatch(p3, /^-- q: d6-/m, "the helpers aren't blocks of p3's file");
});

test("AS19 boot detection sees a cross-page helper's code: s4-cells comes after pg-session in the dependent page's .sql", () => {
  const boot = pg("s4-cells", ["-- status: ran", "-- boot"], "CREATE TABLE s4_cells AS SELECT 1 AS id;");
  const gistar = pg("s5-gistar", ["-- status: ran"], "CREATE TEMP VIEW g AS SELECT id FROM s4_cells;");
  const feed = pg("c1-feed", ["-- status: ran", "-- after: s5-gistar"], "SELECT count(*) AS n FROM g;");
  const [c1] = assembleDownloads([setup, page("s4", boot), page("s5", gistar), page("c1", feed)]).filter((d) => d.page === "c1");
  assert.ok(c1!.text.includes("SHOW search_path;\n\nBEGIN;\n-- q: s4-cells\n-- status: ran\n-- boot\n-- engine: postgis\nCREATE TABLE s4_cells AS SELECT 1 AS id;\nCOMMIT;\n\nBEGIN;\n-- runs first: s5-gistar\n"), c1!.text);
});

test("AS20 an existing download is byte-identical with a cross-page page in the course", () => {
  const load = pg("d1-load", ["-- status: ran"], "CREATE TABLE t (id int);");
  const read = pg("d1-read", ["-- status: ran", "-- after: d1-load"], "SELECT id FROM t;");
  const base = [setup, page("d1", load, read), page("d6", star, fact)];
  const before = assembleDownloads(base);
  const after = assembleDownloads([...base, page("p3", twin)]);
  assert.deepEqual(after.filter((d) => d.page !== "p3"), before);
});
