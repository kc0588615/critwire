// CAP1–CAP3 (plan D9.9, 004 §4.4; raised by the owner, L3 H5): the 120 MB cap on dist/learn/data/ and on the committed lab data. Written before the
// code, seen failing first. Failure modes: a total above the cap is published, or the refusal doesn't say which tree,
// its total and the cap; the total at the cap is refused (the cap is inclusive); a file in a subfolder (postgis/) isn't
// counted; a symlink is counted (or followed) instead of refused.
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { assertCap, fileSizes, LEARN_CAP, totalBytes } from "./cap.ts";

test("CAP1 a total at or under the cap passes", () => {
  assert.equal(LEARN_CAP, 120_000_000);
  assert.doesNotThrow(() => assertCap("dist/learn/data/", { "a.csv": 30_000_000, "b.sql": 90_000_000 }));
  assert.doesNotThrow(() => assertCap("x", { a: 9 }, 10));
  assert.doesNotThrow(() => assertCap("x", {}, 10));
});

test("CAP2 one byte over refuses, naming the tree, its total, the cap and its largest files", () => {
  assert.throws(() => assertCap("dist/learn/data/", { "a.csv": 30_000_000, "b.sql": 90_000_001, "c.json": 1 }),
    (e: Error) => /dist\/learn\/data\/: 120,000,002 bytes, over the 120,000,000-byte cap/.test(e.message)
      && /b\.sql 90,000,001.*a\.csv 30,000,000/s.test(e.message)
      && /004 §4\.4/.test(e.message));
  assert.throws(() => assertCap("x", { a: 11 }, 10), /x: 11 bytes, over the 10-byte cap/);
});

test("CAP3 fileSizes counts every file below a folder, subfolders included, and refuses a symlink", async () => {
  const dir = mkdtempSync(join(tmpdir(), "critwire-cap-"));
  try {
    mkdirSync(join(dir, "postgis"));
    writeFileSync(join(dir, "a.csv"), "x".repeat(10));
    writeFileSync(join(dir, "postgis", "l.sql"), "y".repeat(20));
    const sizes = await fileSizes(pathToFileURL(`${dir}/`));
    assert.deepEqual(sizes, { "a.csv": 10, "postgis/l.sql": 20 });
    assert.equal(totalBytes(sizes), 30);
    assert.throws(() => assertCap("t/", sizes, 29), /t\/: 30 bytes, over the 29-byte cap/);
    symlinkSync(join(dir, "a.csv"), join(dir, "postgis", "link.csv"));
    await assert.rejects(fileSizes(pathToFileURL(`${dir}/`)), /postgis\/link\.csv isn't a regular file/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
