// PT1–PT9 (plan D16): `pnpm learn:port` writes a page's block files and seeds their recorded results from 004's
// fences; `--check` compares them with 004. Written before the code, seen failing first. Failure modes: a page picks
// up another section's blocks (or a fence inside a fence); a block or result is written differently from 004; a hand
// edit is overwritten; a ran block without a result, or a result for another block, is seeded silently; Python (L4's)
// blocks leak in; `--check` misses a difference or doesn't say where it is.
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

test("PT1 the setup page: §0 and §3.1, 3.2, 3.5; Python skipped (L4); setup compared, not written", () => {
  const p = portPage(DOC, "setup", SETUP);
  assert.deepEqual(p.errors, []);
  assert.deepEqual(paths(p.files), [
    "site/learn/sql/pg-session.sql",
    "site/learn/labs/checked/pg-session.txt",
    "site/learn/sql/setup-counts.sql",
    "e2e/__snapshots__/setup-counts.txt",
    "site/learn/sql/pbi-smoke.m",
  ]);
  assert.deepEqual(p.skipped, ["py-connect: python blocks are L4's"]);
  assert.equal(file(p.files, "site/learn/sql/pg-session.sql"), "-- q: pg-session\n-- status: ran\n-- engine: postgis\nSET search_path = learn_curriculum, public;\nSHOW search_path;\n");
  assert.equal(file(p.files, "site/learn/labs/checked/pg-session.txt"), "-- result: pg-session · 1 row · sha256 791623fd72db\nsearch_path\nlearn_curriculum, public");
});

test("PT2 a module page: its own section only; sh fences and fences inside fences ignored; results by engine", () => {
  const p = portPage(DOC, "f1", SETUP);
  assert.deepEqual(p.errors, []);
  assert.deepEqual(paths(p.files), [
    "site/learn/sql/f1-one.sql",
    "e2e/__snapshots__/f1-one.txt",
    "site/learn/sql/f1-later.sql",
    "site/learn/sql/f1-dup.sql",
    "e2e/__snapshots__/f1-dup.txt",
    "site/learn/sql/f1-pg.sql",
    "site/learn/labs/checked/f1-pg.txt",
  ]);
  assert.deepEqual(p.skipped, ["f1-py: python blocks are L4's"]);
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

test("PT5 (RQ11) a ran block without a result, a result for another block, an orphan result, a block that fails its lint", () => {
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
    'm1-d.sql: q m1-d: unknown status "maybe" (ran or untested: <reason>)',
    '004:27: orphan result block "m1-c"',
  ]);
});

test("PT6 the setup block must equal site/learn/sql/setup.sql", () => {
  assert.deepEqual(portPage(DOC, "setup", "CREATE TABLE t (a int, b int);\n").errors, ["004:7: q setup: differs from site/learn/sql/setup.sql at line 1"]);
});

test("PT7 writePort writes missing files, leaves equal ones, and refuses (writing nothing) when one differs", () => withRoot((root) => {
  const { files } = portPage(DOC, "f1", SETUP);
  put(root, "site/learn/sql/f1-one.sql", file(files, "site/learn/sql/f1-one.sql")!);
  assert.deepEqual(writePort(files, root), { written: 6, unchanged: 1 });
  for (const f of files) assert.equal(readFileSync(join(root, f.path), "utf8"), f.text);
  assert.deepEqual(writePort(files, root), { written: 0, unchanged: 7 });

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
