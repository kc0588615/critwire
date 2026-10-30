// PT1–PT9 (plan D16): `pnpm learn:port` writes a page's block files and seeds their recorded results from 004's
// fences; `--check` compares them with 004. Written before the code, seen failing first. Failure modes: a page picks
// up another section's blocks (or a fence inside a fence); a block or result is written differently from 004; a hand
// edit is overwritten; a ran block without a result, or a result for another block, is seeded silently; `--check`
// misses a difference or doesn't say where it is. PT10–PT12 (L4 plan S10): a Python fence is written differently from
// 004, or its result goes elsewhere; a ran one without a result, or one its parse refuses, passes or isn't placed in 004.
// PT13 (L4 plan S14): setup's §3.3 and §3.4 blocks (gpkg-export, arcpy-moran) are left out, another §3 section's are
// taken, or §3.3's requirements file (a text fence) is read as a block or an orphan result.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { renderResult } from "./result.ts";
import { checkPort, docPages, portedPages, portPage, writePort, type PortFile } from "./port.ts";

const DOC = readFileSync(new URL("../fixtures/learn-port-004.md", import.meta.url), "utf8");
const SETUP = "CREATE TABLE t (a int);\n";
const paths = (files: PortFile[]) => files.map((f) => f.path);
const file = (files: PortFile[], path: string) => files.find((f) => f.path === path)?.text;

function withRoot(fn: (root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), "critwire-port-"));
  try {
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
const put = (root: string, path: string, text: string) => {
  mkdirSync(dirname(join(root, path)), { recursive: true });
  writeFileSync(join(root, path), text);
};

test("PT1 the setup page: §0 and §3.1–3.5; setup compared, not written", () => {
  const p = portPage(DOC, "setup", SETUP);
  assert.deepEqual(p.errors, []);
  assert.deepEqual(paths(p.files), [
    "site/learn/sql/pg-session.sql",
    "site/learn/labs/checked/pg-session.txt",
    "site/learn/sql/py-connect.py",
    "site/learn/labs/checked/py-connect.txt",
    "site/learn/sql/setup-counts.sql",
    "e2e/__snapshots__/setup-counts.txt",
    "site/learn/sql/gpkg-export.py",
    "site/learn/labs/checked/gpkg-export.txt",
    "site/learn/sql/arcpy-moran.py",
    "site/learn/sql/pbi-smoke.m",
  ]);
  assert.equal(file(p.files, "site/learn/sql/pg-session.sql"), "-- q: pg-session\n-- status: ran\n-- engine: postgis\nSET search_path = learn_curriculum, public;\nSHOW search_path;\n");
  assert.equal(file(p.files, "site/learn/labs/checked/pg-session.txt"), "-- result: pg-session · 1 row · sha256 791623fd72db\nsearch_path\nlearn_curriculum, public");
});

test("PT2 a module page: its own section only; sh fences and fences inside fences ignored; results by engine; py-connect is course-wide", () => {
  const p = portPage(DOC, "f1", SETUP);
  assert.deepEqual(p.errors, []);
  assert.deepEqual(paths(p.files), [
    "site/learn/sql/f1-one.sql",
    "e2e/__snapshots__/f1-one.txt",
    "site/learn/sql/f1-py.py",
    "site/learn/labs/checked/f1-py.txt",
    "site/learn/sql/f1-later.sql",
    "site/learn/sql/f1-dup.sql",
    "e2e/__snapshots__/f1-dup.txt",
    "site/learn/sql/f1-pg.sql",
    "site/learn/labs/checked/f1-pg.txt",
  ]);
  assert.equal(file(p.files, "e2e/__snapshots__/f1-dup.txt"), '-- result: f1-dup · error: statement 1 of 1: Constraint Error: Duplicate key "a: 1"');
});

test("PT3 a seeded result is renderResult's text, with no final newline", () => {
  const p = portPage(DOC, "f1", SETUP);
  assert.equal(file(p.files, "e2e/__snapshots__/f1-one.txt"), renderResult("f1-one", { columns: ["a"], rows: [[1]] }));
  assert.equal(file(p.files, "site/learn/labs/checked/f1-pg.txt"), renderResult("f1-pg", { columns: ["a"], rows: [[2]] }));
});

test("PT4 the pages are setup and every `#### <id> · <slug>` module", () => {
  assert.deepEqual(docPages(DOC), ["setup", "f1", "f2"]);
  assert.deepEqual(portPage(DOC, "f9", SETUP).errors, ['no page "f9" in 004 (setup, f1, f2)']);
});

test("PT5 (RQ11) a ran block without a result, a result for another block, an orphan result, a block that fails its parse (at its 004 line)", () => {
  const doc = (body: string) => `# x\n\n## 5. Modules\n\n#### m1 · m\n\n${body}\n`;
  const fence = (lang: string, ...lines: string[]) => ["```" + lang, ...lines, "```", ""].join("\n");
  const r = portPage(
    doc(
      fence("sql", "-- q: m1-a", "-- status: ran", "SELECT 1 AS a") +
        fence("sql", "-- q: m1-b", "-- status: ran", "SELECT 1 AS a") +
        fence("text", "-- result: m1-x · 1 row · sha256 4f395a2e9ea1", "a", "1") +
        fence("sql", "-- q: m1-c", "-- status: untested: shown only", "SELECT 1") +
        fence("text", "-- result: m1-c · 1 row · sha256 4f395a2e9ea1", "a", "1") +
        fence("sql", "-- q: m1-d", "-- status: maybe", "SELECT 1"),
    ),
    "m1",
    SETUP,
  );
  assert.deepEqual(r.errors, [
    "004:7: q m1-a: no result block after it",
    '004:12: q m1-b: the result block after it is for "m1-x"',
    '004:32: m1-d.sql: q m1-d: unknown status "maybe" (ran or untested: <reason>)',
    '004:27: orphan result block "m1-c"',
  ]);
});

test("PT6 the setup block must equal site/learn/sql/setup.sql", () => {
  assert.deepEqual(portPage(DOC, "setup", "CREATE TABLE t (a int, b int);\n").errors, ["004:7: q setup: differs from site/learn/sql/setup.sql at line 1"]);
});

test("PT7 writePort writes missing files, leaves equal ones, and refuses (writing nothing) when one differs", () => withRoot((root) => {
  const { files } = portPage(DOC, "f1", SETUP);
  put(root, "site/learn/sql/f1-one.sql", file(files, "site/learn/sql/f1-one.sql")!);
  assert.deepEqual(writePort(files, root), { written: 8, unchanged: 1 });
  for (const f of files) assert.equal(readFileSync(join(root, f.path), "utf8"), f.text);
  assert.deepEqual(writePort(files, root), { written: 0, unchanged: 9 });

  withRoot((other) => {
    put(other, "site/learn/sql/f1-pg.sql", "-- q: f1-pg\n-- hand edit\n");
    assert.throws(() => writePort(files, other), /site\/learn\/sql\/f1-pg\.sql differs from 004: not overwritten \(learn:port --check f1 shows how\)/);
    assert.equal(existsSync(join(other, "site/learn/sql/f1-one.sql")), false, "nothing written");
  });
}));

test("PT8 checkPort names each missing or differing file, with a line diff", () => withRoot((root) => {
  const { files } = portPage(DOC, "f1", SETUP);
  writePort(files, root);
  assert.deepEqual(checkPort(files, root), []);
  put(root, "e2e/__snapshots__/f1-one.txt", "-- result: f1-one · 1 row · sha256 000000000000\na\n1");
  rmSync(join(root, "site/learn/sql/f1-later.sql"));
  assert.deepEqual(checkPort(files, root), [
    "site/learn/sql/f1-later.sql: missing (004 has it)",
    "e2e/__snapshots__/f1-one.txt differs from 004:\n  - -- result: f1-one · 1 row · sha256 4f395a2e9ea1\n  + -- result: f1-one · 1 row · sha256 000000000000",
  ].sort());
}));

test("PT9 `--check all` checks the pages with any block file written", () => withRoot((root) => {
  assert.deepEqual(portedPages(DOC, SETUP, root), []);
  writePort(portPage(DOC, "f2", SETUP).files, root);
  put(root, "site/learn/sql/pg-session.sql", "x");
  assert.deepEqual(portedPages(DOC, SETUP, root), ["setup", "f2"]);
}));

const pyDoc = (...fences: string[][]) => ["# x", "", "## 5. Modules", "", "#### m1 · m", "", ...fences.flatMap((f) => [...f, ""])].join("\n");
const fence = (lang: string, ...lines: string[]) => ["```" + lang, ...lines, "```"];

test("PT10 a python fence becomes site/learn/sql/<id>.py byte for byte, its result checked/<id>.txt without its final newline", () => {
  const p = portPage(DOC, "setup", SETUP);
  assert.equal(file(p.files, "site/learn/sql/py-connect.py"), '# q: py-connect\n# status: ran\nprint("L4\'s")\n');
  assert.equal(file(p.files, "site/learn/labs/checked/py-connect.txt"), "-- result: py-connect · python · sha256 000000000000\nL4's");
  const f1 = portPage(DOC, "f1", SETUP);
  assert.equal(file(f1.files, "site/learn/sql/f1-py.py"), "# q: f1-py\n# status: ran\n# after: py-connect\n#### f9 · not a heading\nprint(1)\n");
});

test("PT11 a ran python fence needs its result after it; an untested one needs none", () => {
  const r = portPage(
    pyDoc(
      fence("python", "# q: m1-a", "# status: ran", "print(1)"),
      fence("python", "# q: m1-b", "# status: untested: it submits a download", "print(2)"),
    ),
    "m1",
    SETUP,
  );
  assert.deepEqual(r.errors, ["004:7: q m1-a: no result block after it"]);
  assert.deepEqual(paths(r.files), ["site/learn/sql/m1-a.py", "site/learn/sql/m1-b.py"]);
});

test("PT12 (PY1) a python fence its parse refuses is an error naming 004's line", () => {
  const r = portPage(
    pyDoc(
      fence("python", "# q: m1-a", "# status: ran", "# timeout: soon", "print(1)"),
      fence("text", "-- result: m1-a · python · sha256 4355a46b19d3", "1"),
      fence("python", "print(2)"),
    ),
    "m1",
    SETUP,
  );
  assert.deepEqual(r.errors, [
    "004:7: m1-a.py: line 3: q m1-a: `# timeout:` takes whole seconds above 0",
    "004:19: block.py: line 1: no `# q:` header",
  ]);
});

test("PT13 setup's §3.3 and §3.4 are setup sections; §3.3's text fence is neither a block nor an orphan result", () => {
  const p = portPage(DOC, "setup", SETUP);
  assert.deepEqual(p.errors, []);
  assert.equal(file(p.files, "site/learn/sql/gpkg-export.py"), '# q: gpkg-export\n# status: ran\n# after: py-connect\nprint("rows: 1")\n');
  assert.equal(file(p.files, "site/learn/labs/checked/gpkg-export.txt"), "-- result: gpkg-export · python · sha256 000000000000\nrows: 1");
  assert.equal(file(p.files, "site/learn/sql/arcpy-moran.py"), "# q: arcpy-moran\n# status: untested: ArcGIS Pro (Windows, licensed)\nimport arcpy\n");
  assert.ok(!paths(p.files).some((f) => /not-setup|requirements/.test(f)));
});

// Cross-page `-- after:` (L5 plan T1, S1). Failure modes: learn:port refuses a page whose PostGIS block names a
// prerequisite page's block (p2–p4's twins, c1's feed), so it can't port; or it takes any page's block, so a block
// that names a page the learner may not have opened is ported and fails only at learn:check.
const twoPages = [
  "# x", "", "## 5. Modules", "",
  "#### m1 · one", "", ...fence("sql", "-- q: m1-a", "-- status: ran", "-- engine: postgis", "CREATE TEMP TABLE a AS SELECT 1 AS id;"),
  "", ...fence("text", "-- result: m1-a · 0 rows · sha256 000000000000"), "",
  "#### m2 · two", "", ...fence("sql", "-- q: m2-a", "-- status: ran", "-- engine: postgis", "-- after: m1-a", "SELECT id FROM a;"),
  "", ...fence("text", "-- result: m2-a · 1 row · sha256 000000000000", "id", "1"), "",
].join("\n");

test("PT14 a block naming a prerequisite page's ran PostGIS block ports; naming another page's is an error naming 004's line", () => {
  const p = portPage(twoPages, "m2", SETUP, ["m1"]);
  assert.deepEqual(p.errors, []);
  assert.deepEqual(paths(p.files), ["site/learn/sql/m2-a.sql", "site/learn/labs/checked/m2-a.txt"]);
  const line = twoPages.split("\n").indexOf("-- q: m2-a");
  assert.deepEqual(portPage(twoPages, "m2", SETUP).errors, [`004:${line}: m2-a.sql: q m2-a: \`-- after\`: unknown block "m1-a" (not on this page or a prerequisite's)`]);
});

// A JSON fence published as a lab file (L5 plan T4, S4; PT15–PT16): c1's feed schema. Failure modes: the published
// schema drifts from 004's fence (or never leaves it); any json fence (an example doc) is written somewhere or refused;
// two fences claim the same file and one silently wins.
const SCHEMA_ID = "https://critwire.com/learn/labs/m1-feed.schema.json";
const schemaFence = (title: string) => fence("json", "{", `  "$id": "${SCHEMA_ID}",`, `  "title": "${title}"`, "}");
const withJson = (...extra: string[][]) => [
  "# x", "", "## 5. Modules", "",
  "#### m1 · one", "", ...schemaFence("feed"), "", ...fence("json", '{"cells": []}'), "",
  ...fence("json", "not json"), "", ...extra.flatMap((f) => [...f, ""]),
  "#### m2 · two", "", "text", "",
].join("\n");

test("PT15 a json fence whose $id is critwire.com/learn/labs/<name>.json ports to site/learn/labs/<name>.json byte for byte; other json fences are neither blocks nor errors", () => withRoot((root) => {
  const doc = withJson();
  const p = portPage(doc, "m1", SETUP);
  assert.deepEqual(p.errors, []);
  assert.deepEqual(paths(p.files), ["site/learn/labs/m1-feed.schema.json"]);
  assert.equal(file(p.files, "site/learn/labs/m1-feed.schema.json"), `{\n  "$id": "${SCHEMA_ID}",\n  "title": "feed"\n}\n`);
  assert.deepEqual(checkPort(p.files, root), ["site/learn/labs/m1-feed.schema.json: missing (004 has it)"]);
  writePort(p.files, root);
  assert.deepEqual(checkPort(p.files, root), []);
  put(root, "site/learn/labs/m1-feed.schema.json", `{\n  "$id": "${SCHEMA_ID}",\n  "title": "edited"\n}\n`);
  assert.match(checkPort(p.files, root).join("\n"), /site\/learn\/labs\/m1-feed\.schema\.json differs from 004:\n {2}- {3}"title": "feed"\n {2}\+ {3}"title": "edited"/);
}));

test("PT16 two json fences with the same $id are refused, naming both 004 lines", () => {
  const doc = withJson(schemaFence("again"));
  const lines = doc.split("\n");
  const at = lines.flatMap((l, i) => (l === "```json" && lines[i + 2]?.includes(SCHEMA_ID) ? [i + 1] : []));
  assert.equal(at.length, 2);
  assert.deepEqual(portPage(doc, "m1", SETUP).errors, [`004:${at[0]}, 004:${at[1]}: two json fences with $id ${SCHEMA_ID}`]);
});
