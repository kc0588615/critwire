// The Python engine's tests that need .venv-learn (plan L4 §1, §3; pnpm learn:venv first). Failure modes first:
// V1 (probe): venvState reports a pin the venv can't have (its marker is false here) and so refuses a correct venv; or
//     misses a missing or wrong-version pin; or reports packages the file doesn't list (rasterio for the labs file,
//     an editor-installed ipykernel) and so refuses a valid labs-only venv → a false-marker pin doesn't appear, a
//     missing pin appears with installed null, a wrong one with the real version, an unlisted package never.
// V4: ingest shapes/habitat start a 12-minute download on a venv without the ingest file's rasterio pin →
//     assertVenv refuses a file whose rasterio pin isn't installed, naming it; passes on the synced venv.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { assertVenv, INGEST_REQUIREMENTS, LABS_REQUIREMENTS, venvState } from "../venv.ts";

const dir = mkdtempSync(join(tmpdir(), "critwire-venv-"));
after(() => rmSync(dir, { recursive: true, force: true }));
const fixture = (name: string, text: string): string => {
  const file = join(dir, name);
  writeFileSync(file, text);
  return file;
};

test("V1 probe: markers evaluated, missing and wrong pins reported, unlisted packages absent", async () => {
  const { pins: labs } = await venvState(LABS_REQUIREMENTS);
  const numpy = labs.find((p) => p.name === "numpy");
  assert.ok(numpy?.installed, "numpy is a labs pin, installed");
  const file = fixture("probe.txt", [
    "# a comment",
    `numpy==${numpy.installed}`,
    "    # via -r requirements.in",
    "pywin32==311 ; sys_platform == 'win32'",
    "critwire-not-a-package==1.0",
    "esda==0.0.1",
    "",
  ].join("\n"));
  const state = await venvState(file);
  assert.match(state.python, /^3\.12\.\d+$/);
  assert.equal(state.file, file);
  assert.deepEqual(state.pins, [
    { name: "numpy", pin: numpy.installed, installed: numpy.installed },
    { name: "critwire-not-a-package", pin: "1.0", installed: null },
    { name: "esda", pin: "0.0.1", installed: labs.find((p) => p.name === "esda")?.installed },
  ]);
  assert.ok(!labs.some((p) => p.name === "rasterio" || p.name === "ipykernel"), "the labs file lists neither");
  assert.ok(labs.every((p) => p.installed === p.pin), "the synced venv matches the labs file");
});

test("V1 probe: a file that isn't pins is refused", async () => {
  await assert.rejects(venvState(fixture("range.txt", "numpy>=2\n")), /range\.txt: not a pin: numpy>=2/);
});

test("V4: assertVenv refuses an ingest file whose rasterio pin isn't installed, passes on the synced venv", async () => {
  await assert.rejects(assertVenv(fixture("ingest.txt", "rasterio==0.9.0\n"), "ingest habitat"),
    /^Error: ingest habitat: \.venv-learn doesn't match .*ingest\.txt: rasterio==0\.9\.0 has 1\.5\.2 installed: run pnpm learn:venv$/);
  await assertVenv(INGEST_REQUIREMENTS, "ingest habitat");
  await assertVenv(LABS_REQUIREMENTS, "learn:check");
});

test("V4: a venv the probe can't run in is refused, naming pnpm learn:venv", async () => {
  await assert.rejects(assertVenv(LABS_REQUIREMENTS, "learn:check", join(dir, "no-python")),
    /^Error: learn:check: \.venv-learn: the venv check couldn't run \(.*\): run pnpm learn:venv$/);
});
