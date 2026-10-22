// gbif:register state tests (plan §6, §12), in a temp XDG_STATE_HOME. Failure modes first:
// L1: a second run while the first holds the lock proceeds, or breaks the lock (two runs can both POST) → throws naming
//     the pid and the lock file, and the first lock stays.
// L2: a run that throws leaves its lock, so every later run refuses → the lock is gone after fn throws.
// L3: a second intent overwrites the first, erasing the record of a POST that may have minted a DOI → throws. An
//     unreadable intent reads as none → throws naming the file (it counts as present).
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";
import { createIntent, deleteIntent, intentFile, lockFile, readIntent, stateDir, withLock } from "./state.ts";

let home: string;
before(() => {
  home = mkdtempSync(join(tmpdir(), "critwire-state-"));
  process.env.XDG_STATE_HOME = home;
});
after(() => rmSync(home, { recursive: true, force: true }));

const intent = (hash: string) => ({
  contributionsSha256: hash, startedAt: "2026-10-21T07:00:00.000Z",
  request: { title: "t", description: `contributions-sha256: ${hash}`, sourceUrl: "https://example.org", relatedDatasets: { a: 1 } },
});

test("L1 a second withLock while the first holds it throws naming the pid, and the first lock stays", async () => {
  assert.equal(stateDir(), join(home, "critwire"));
  await withLock(async () => {
    await assert.rejects(withLock(async () => assert.fail("ran inside a held lock")), (error: Error) =>
      error.message.includes(`pid ${process.pid}`) && error.message.includes(lockFile()));
    assert.ok(existsSync(lockFile()));
  });
  assert.ok(!existsSync(lockFile()));
});

test("L2 the lock is gone after fn throws", async () => {
  await assert.rejects(withLock(async () => { throw new Error("boom"); }), /boom/);
  assert.ok(!existsSync(lockFile()));
  assert.equal(await withLock(async () => 42), 42);
});

test("L3 createIntent when an intent exists throws, and the first intent stays", async () => {
  assert.equal(await readIntent(), null);
  await createIntent(intent("1"));
  await assert.rejects(createIntent(intent("2")), /intent.*exists/);
  assert.deepEqual(await readIntent(), intent("1"));
  await deleteIntent();
  assert.equal(await readIntent(), null);
  writeFileSync(intentFile(), "{\"contributionsSha2");
  await assert.rejects(readIntent(), (error: Error) => error.message.includes("unreadable") && error.message.includes(intentFile()));
  await deleteIntent();
  assert.deepEqual(readdirSync(stateDir()), []);
});
