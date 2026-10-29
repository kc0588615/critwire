// learn:check's one result path (plan L4 §4.3; PY6, PY9), on a temp checked dir. Written before the code, seen failing
// first. Failure modes:
// - PY6: a result that differs from checked/<id>.txt passes, or fails without showing where → failed with a line diff;
//   a block with no recorded result passes silently → failed, "run pnpm learn:check --update";
// - PY9: with update, two runs that differ get one of them written (a result nobody can reproduce) → failed, nothing
//   written; a run with any failed block writes the others (a partial update) → nothing written; agreeing runs of
//   passing blocks are written once each, an unchanged result left alone;
// - an update run hands over a block run once (an engine forgot its second run), and passes as if both agreed →
//   refused (a boot block runs once, by design).
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, test } from "node:test";
import { settleResults, type BlockRuns } from "./record.ts";

let dir = "";
let lines: string[] = [];
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "critwire-record-"));
  lines = [];
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const opts = (update: boolean) => ({ update, checkedDir: dir, log: (l: string) => lines.push(l) });
const block = (id: string, boot = false) => ({ id, boot, plan: [] });
const out = (id: string, rendered?: string, failures: string[] = []) => ({ id, failures, rendered });
const ran = (id: string, first?: string, second?: string): BlockRuns =>
  ({ block: block(id), first: out(id, first), ...(second === undefined ? {} : { second: out(id, second) }) });
const record = (id: string, text: string) => writeFileSync(join(dir, `${id}.txt`), text);
const files = () => readdirSync(dir).sort();

test("PY6 a result that differs from its recorded one fails with a line diff", async () => {
  record("x", "-- result: x · python · sha256 aaa\na\nb");
  await assert.rejects(settleResults([ran("x", "-- result: x · python · sha256 bbb\na\nc")], opts(false)),
    /^Error: blocks: 1 failure\(s\):\nq x: result differs from .*x\.txt:\n  - -- result: x · python · sha256 aaa\n  \+ -- result: x · python · sha256 bbb\n  - b\n  \+ c$/);
});

test("PY6 a block with no recorded result fails, naming --update", async () => {
  await assert.rejects(settleResults([ran("x", "r")], opts(false)), /q x: no recorded result: run pnpm learn:check --update/);
});

test("PY6 an equal result passes, logged ok, nothing written", async () => {
  record("x", "r");
  await settleResults([ran("x", "r")], opts(false));
  assert.deepEqual(lines, ["learn:check: q x: ok"]);
  assert.deepEqual(files(), ["x.txt"]);
});

test("PY6 an engine's own failures are reported with the comparisons", async () => {
  record("y", "r");
  const failed: BlockRuns = { block: block("x"), first: out("x", undefined, ["q x: exit 1"]) };
  await assert.rejects(settleResults([failed, ran("y", "s")], opts(false)), /blocks: 2 failure\(s\):\nq x: exit 1\nq y: result differs/);
});

test("PY9 with update, two runs that differ fail and nothing is written", async () => {
  await assert.rejects(settleResults([ran("a", "r1", "r1"), ran("x", "r1", "r2")], opts(true)),
    /q x: two runs differ, so its result isn't reproducible:\n  - r1\n  \+ r2/);
  assert.deepEqual(files(), []);
});

test("PY9 with update, one failed block keeps every result unwritten", async () => {
  const failed: BlockRuns = { block: block("x"), first: out("x", "r"), second: out("x", undefined, ["q x: timed out"]) };
  await assert.rejects(settleResults([ran("a", "r", "r"), failed], opts(true)), /q x: timed out/);
  assert.deepEqual(files(), []);
});

test("PY9 with update, agreeing runs are written once each; an unchanged result is left alone; a boot block runs once", async () => {
  record("same", "s");
  const boot: BlockRuns = { block: block("b", true), first: out("b", "boot") };
  await settleResults([boot, ran("same", "s", "s"), ran("new", "n", "n")], opts(true));
  assert.deepEqual(files(), ["b.txt", "new.txt", "same.txt"]);
  assert.equal(readFileSync(join(dir, "new.txt"), "utf8"), "n");
  assert.equal(readFileSync(join(dir, "b.txt"), "utf8"), "boot");
  assert.deepEqual(lines, [`learn:check: wrote ${join(dir, "b.txt")}`, `learn:check: wrote ${join(dir, "new.txt")}`]);
});

test("PY9 with update, a non-boot block run once is refused", async () => {
  await assert.rejects(settleResults([ran("x", "r")], opts(true)), /q x: --update needs two runs, the engine gave one/);
  assert.deepEqual(files(), []);
});
