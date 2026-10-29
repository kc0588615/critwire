// The Python engine's tests that need .venv-learn (plan L4 §1, §3; pnpm learn:venv first). Failure modes first:
// V1 (probe): venvState reports a pin the venv can't have (its marker is false here) and so refuses a correct venv; or
//     misses a missing or wrong-version pin; or reports packages the file doesn't list (rasterio for the labs file,
//     an editor-installed ipykernel) and so refuses a valid labs-only venv → a false-marker pin doesn't appear, a
//     missing pin appears with installed null, a wrong one with the real version, an unlisted package never.
// V4: ingest shapes/habitat start a 12-minute download on a venv without the ingest file's rasterio pin →
//     assertVenv refuses a file whose rasterio pin isn't installed, naming it; passes on the synced venv.
// PY4: a block finds the lab tables without the helper (PGOPTIONS' search_path not applied), so a download that
//      forgets py-connect passes here and fails for a learner; or the helper's path isn't 004's → without the helper,
//      `relation "species" does not exist`; through 004's py-connect, SHOW search_path prints learn_curriculum,public.
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";
import { readFileSync } from "node:fs";
import { loadEnv, requireEnv } from "../env.ts";
import { assertVenv, INGEST_REQUIREMENTS, LABS_REQUIREMENTS, VENV_PYTHON, venvState } from "../venv.ts";
import { parseBlock } from "./blocks.ts";
import type { CoursePage } from "./course.ts";
import { urlTarget } from "./pg.ts";
import { blockCode, pythonApp, pythonEnv, runPython } from "./python.ts";

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

// 004's py-connect, as its fence holds it (the setup page's port, S10, writes the same text to site/learn/sql/).
const PY_CONNECT = /```python\n(# q: py-connect\n[^]*?)```/.exec(readFileSync(new URL("../../plans/004-learn-curriculum.md", import.meta.url), "utf8"))![1]!;

test("PY4 without the helper the lab tables aren't found; through py-connect the search path is learn_curriculum,public", async () => {
  loadEnv();
  const env = pythonEnv(urlTarget(requireEnv("LEARN_PG_URL"), "LEARN_PG_URL"), { learnBase: "file:///nowhere", app: pythonApp(), mplConfig: join(dir, "mpl") });
  const run = (code: string) => runPython(code, { python: VENV_PYTHON, env, timeoutMs: 30_000 });
  const bare = await run(`import psycopg\nwith psycopg.connect() as conn:\n    conn.execute("SELECT count(*) FROM species")\n`);
  assert.equal(bare.exit, 1);
  assert.match(bare.stderr, /relation "species" does not exist/);
  const block = (file: string, text: string) => {
    const { block: b, errors } = parseBlock(file, text);
    assert.deepEqual(errors, []);
    return b!;
  };
  const connect = block("site/learn/sql/py-connect.py", PY_CONNECT);
  const show = block("site/learn/sql/t-show.py", `# q: t-show\n# status: ran\n# after: py-connect\nwith connect() as conn:\n    print(conn.execute("SHOW search_path").fetchone()[0])\n`);
  const course: CoursePage[] = [{ page: { id: "setup", file: "", html: "" }, slots: [], blocks: [connect, show] }];
  const through = await run(blockCode(show, course));
  assert.equal(through.stderr, "");
  assert.equal(through.stdout, "learn_curriculum,public\n");
});
