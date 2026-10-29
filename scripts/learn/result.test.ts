// RR1–RR8 (plan D2, 004 §0 "Result blocks"): the one rendering of a result, shared by learn:check, learn:port and E2E;
// RQ20 and RQ18's ORDER BY half from the spike. Written before the code, seen failing first. Failure modes: two
// results that differ past row 5 hash alike; a cut cell or a `|` inside a cell changes what is hashed; NULL, lists or
// BigInt print differently in two places; an ORDER BY inside a comment passes the determinism check; a diff hides a
// missing line.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cellText } from "./cell.ts";
import { lineDiff, renderError, renderPython, renderResult, rowsOrdered } from "./result.ts";

test("RR1 header line, columns, then up to 5 rows; 1 row is singular", () => {
  assert.equal(renderResult("x", { columns: ["a", "b"], rows: [[1, "p"]] }), "-- result: x · 1 row · sha256 " + sha("a | b\n1 | p") + "\na | b\n1 | p");
  assert.match(renderResult("x", { columns: ["a"], rows: [] }), /^-- result: x · 0 rows · sha256 [0-9a-f]{12}\na$/);
});

const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 12);

test("RQ20 the sha256 covers the full result: results differing only in row 6 hash differently; '… n more rows'", () => {
  const rows = (last: string) => [1, 2, 3, 4, 5, 6].map((n) => [n, n === 6 ? last : "p"]);
  const a = renderResult("x", { columns: ["n", "v"], rows: rows("p") }).split("\n");
  const b = renderResult("x", { columns: ["n", "v"], rows: rows("q") }).split("\n");
  assert.notEqual(a[0], b[0]);
  assert.deepEqual(a.slice(1), b.slice(1));
  assert.match(a[0]!, /^-- result: x · 6 rows · sha256 [0-9a-f]{12}$/);
  assert.equal(a.at(-1), "… 1 more row");
  assert.equal(renderResult("x", { columns: ["n"], rows: [1, 2, 3, 4, 5, 6, 7].map((n) => [n]) }).split("\n").at(-1), "… 2 more rows");
});

test("RR2 cells over 60 characters are cut with … when shown, hashed uncut", () => {
  const long = "x".repeat(61);
  const out = renderResult("x", { columns: ["s"], rows: [[long]] }).split("\n");
  assert.equal(out[2], "x".repeat(60) + "…");
  assert.equal(out[0], `-- result: x · 1 row · sha256 ${sha("s\n" + long)}`);
  assert.equal(renderResult("x", { columns: ["s"], rows: [["é".repeat(60)]] }).split("\n")[2], "é".repeat(60), "60 characters, not bytes");
});

test("RR3 | and newlines inside a cell or a column name are escaped", () => {
  assert.equal(renderResult("x", { columns: ["a|b"], rows: [["1|2\n3"]] }).split("\n").slice(1).join("\n"), "a\\|b\n1\\|2\\n3");
});

test("RR4 cellText: NULL, lists, BigInt, booleans, dates and structs print one way", () => {
  assert.equal(cellText(null), "NULL");
  assert.equal(cellText(undefined), "NULL");
  assert.equal(cellText([1, null, "a"]), "[1, NULL, a]");
  assert.equal(cellText(12345678901234567890n), "12345678901234567890");
  assert.equal(cellText(true), "true");
  assert.equal(cellText(new Date(Date.UTC(2020, 0, 2))), "2020-01-02T00:00:00.000Z");
  assert.equal(cellText({ k: 1, v: [2] }), "{k: 1, v: [2]}");
});

test("RR5 an error result is one line: the message's first line", () => {
  assert.equal(renderError("x", "statement 1 of 1: Constraint Error: dup\nLINE 1: …"), "-- result: x · error: statement 1 of 1: Constraint Error: dup");
});

test("RR6 lineDiff lists each differing line as - recorded / + now, extra and missing lines included", () => {
  assert.deepEqual(lineDiff("a\nb\nc", "a\nB\nc"), ["- b", "+ B"]);
  assert.deepEqual(lineDiff("a", "a\nb"), ["+ b"]);
  assert.deepEqual(lineDiff("a\nb", "a"), ["- b"]);
  assert.deepEqual(lineDiff("same", "same"), []);
});

test("RQ18 rowsOrdered: ORDER BY in code, or an EXPLAIN; not an ORDER BY in a comment or a string", () => {
  assert.equal(rowsOrdered("SELECT id FROM t ORDER  BY id"), true);
  assert.equal(rowsOrdered("explain (analyze) SELECT id FROM t"), true);
  assert.equal(rowsOrdered("SELECT id FROM t -- ORDER BY id"), false);
  assert.equal(rowsOrdered("SELECT 'order by' FROM t"), false);
  assert.equal(rowsOrdered("SELECT id FROM t"), false);
});

// PY10 (L4 plan §2): a Python block's result. Failure modes: two outputs that differ only in a final newline record
// alike; an empty output renders an empty line that 004's fence doesn't have.
test("PY10 renderPython: `-- result: <id> · python · sha256 <12 of stdout>`, then stdout less one final newline", () => {
  assert.equal(renderPython("x", "a\nb\n"), `-- result: x · python · sha256 ${sha("a\nb\n")}\na\nb`);
  assert.equal(renderPython("x", ""), "-- result: x · python · sha256 e3b0c44298fc", "nothing printed: the header alone (004's py-connect)");
  assert.notEqual(renderPython("x", "a"), renderPython("x", "a\n"), '"a" and "a\\n" differ');
  assert.equal(renderPython("x", "a\n\n"), `-- result: x · python · sha256 ${sha("a\n\n")}\na\n`, "only one final newline is dropped");
});
