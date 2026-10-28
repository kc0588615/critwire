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
import { createIntent, deleteIntent, intentFile, lockFile, namedState, readIntent, stateDir, withLock } from "./state.ts";

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

// Named state (plan D8), used by the sample download (D6) and the second registration target. Failure modes first:
// L4: two names share a lock or an intent, so one run blocks or overwrites the other → each name has its own files,
//     and the default (gbif:register's) names stay gbif-register.lock and gbif-register-intent.json.
// L5: replaceIntent writes in place (a crash leaves half an intent) or invents an intent that was never created →
//     it refuses when none exists, and leaves no temp file.
test("L4 named states don't share a lock or an intent; gbif:register keeps its file names", async () => {
  const sample = namedState<{ key: string | null }>("gbif-sample-download", "ingest gbif-sample");
  assert.equal(lockFile(), join(home, "critwire", "gbif-register.lock"));
  assert.equal(intentFile(), join(home, "critwire", "gbif-register-intent.json"));
  assert.equal(sample.lockFile(), join(home, "critwire", "gbif-sample-download.lock"));
  assert.equal(sample.intentFile(), join(home, "critwire", "gbif-sample-download-intent.json"));
  await withLock(async () => {
    assert.equal(await sample.withLock(async () => 1), 1);
    await sample.withLock(async () => {
      await assert.rejects(sample.withLock(async () => 2), (error: Error) =>
        error.message.startsWith("ingest gbif-sample is running") && error.message.includes(sample.lockFile()));
    });
  });
  await sample.createIntent({ key: null });
  assert.equal(await readIntent(), null);
  await createIntent(intent("3"));
  assert.deepEqual(await sample.readIntent(), { key: null });
  await deleteIntent();
  assert.deepEqual(await sample.readIntent(), { key: null });
  await sample.deleteIntent();
  assert.deepEqual(readdirSync(stateDir()), []);
});

test("L5 replaceIntent replaces an existing intent whole, refuses when there is none, and leaves no temp file", async () => {
  const sample = namedState<{ key: string | null }>("gbif-sample-download", "ingest gbif-sample");
  await assert.rejects(sample.replaceIntent({ key: "k" }), (error: Error) =>
    error.message.includes("no intent") && error.message.includes(sample.intentFile()));
  assert.deepEqual(readdirSync(stateDir()), []);
  await sample.createIntent({ key: null });
  await sample.replaceIntent({ key: "0000001-000000000000001" });
  assert.deepEqual(await sample.readIntent(), { key: "0000001-000000000000001" });
  assert.deepEqual(readdirSync(stateDir()), ["gbif-sample-download-intent.json"]);
  await sample.deleteIntent();
});
