// The Python engine (plan L4 §3): offline, no database. Its process tests run /usr/bin/python3.12 (no venv needed; the
// db half, PY4, is python.dbtest.ts). Written before the code, seen failing first. Failure modes:
// PY0: without /usr/bin/python3.12 every process test fails on spawn ENOENT, one confusing error per test → one
//      failing test naming the missing interpreter, and no process test.
// PY2: a block imports a planted module (json.py in its cwd or beside its code), reads a dotfile from the real HOME,
//      or sees files from an earlier block → -I, an empty cwd, the code outside it, its own empty HOME.
// PY3: a secret (.env's GBIF_*, DATABASE_URL, LEARN_PG_URL) reaches block code; a block's session (or a process it
//      starts) carries no run name, so cleanup can't find it; matplotlib writes its cache into the block's cwd or HOME
//      → the environment is exactly the listed variables, PGAPPNAME inherited by children, MPLCONFIGDIR elsewhere.
// PY7: a failing block is reported without why → its exit and stderr's last 5 lines.
// PY8: a block over its time (or a process it started) runs on, or leaves its temp folder → the group is SIGKILLed,
//      nothing left (pgrep), the folder gone; the same after a normal exit (a background straggler) and an abort; a
//      child that left the group (start_new_session) holds the pipes, so the run never returns → after a short grace
//      the pipes are dropped, the run marked pipesHeld and failed, the folder gone.
// blockCode: `# after:` code runs in the order named instead of page order, or py-connect after a page block, or an
//      unknown id is skipped silently → course page order, py-connect first, unknown ids throw.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";
import { parseBlock, type Block } from "./blocks.ts";
import type { CoursePage } from "./course.ts";
import type { PgTarget } from "./pg.ts";
import { blockCode, PY_APP_PREFIX, pythonApp, pythonEnv, pythonFailure, runPython, type PyRun } from "./python.ts";
import { VENV_PYTHON } from "../venv.ts";

const PYTHON = "/usr/bin/python3.12";
const target: PgTarget = { host: "/var/run/postgresql", port: 5433, user: "learner", password: "pw", database: "lab_db", source: "test" };
const scratch = mkdtempSync(join(tmpdir(), "critwire-python-test-"));
after(() => rmSync(scratch, { recursive: true, force: true }));
const mplConfig = join(scratch, "mpl");
const app = pythonApp();
const env = (t: PgTarget = target) => pythonEnv(t, { learnBase: "file:///srv/dist", app, mplConfig });
const run = (code: string, timeoutMs = 30_000, signal?: AbortSignal) => runPython(code, { python: PYTHON, env: env(), timeoutMs, signal });
const lines = (...l: string[]) => l.join("\n") + "\n";
const gone = (pattern: string) => spawnSync("pgrep", ["-f", pattern], { encoding: "utf8" });

function pyBlock(id: string, ...l: string[]): Block {
  const { block, errors } = parseBlock(`site/learn/sql/${id}.py`, lines(`# q: ${id}`, "# status: ran", ...l));
  assert.deepEqual(errors, [], id);
  return block!;
}
const page = (id: string, blocks: Block[]): CoursePage => ({ page: { id, file: `site/learn/modules/${id}.html`, html: "" }, slots: [], blocks });

test("pythonApp: the run's name, critwire-learn-check-py-<12 hex>, new each call, under 63 bytes", () => {
  assert.match(app, /^critwire-learn-check-py-[0-9a-f]{12}$/);
  assert.ok(app.startsWith(PY_APP_PREFIX));
  assert.notEqual(pythonApp(), pythonApp());
  assert.ok(Buffer.byteLength(app) < 63);
});

test("PY3 pythonEnv: exactly PATH (venv bin first), the target's PG*, PGOPTIONS, PGAPPNAME, MPLCONFIGDIR, LEARN_BASE", () => {
  const saved = { ...process.env };
  Object.assign(process.env, { GBIF_PASSWORD: "py3-secret", DATABASE_URL: "postgresql:///py3-db", LEARN_PG_URL: "postgresql:///py3-lab" });
  try {
    assert.deepEqual(env(), {
      PATH: `${dirname(VENV_PYTHON)}:/usr/bin:/bin`,
      PGHOST: "/var/run/postgresql", PGPORT: "5433", PGUSER: "learner", PGDATABASE: "lab_db", PGPASSWORD: "pw",
      PGOPTIONS: "-c search_path=pg_catalog", PGAPPNAME: app, MPLCONFIGDIR: mplConfig, LEARN_BASE: "file:///srv/dist",
    });
    assert.equal("PGPASSWORD" in env({ ...target, password: undefined }), false, "no password in the URL: no PGPASSWORD");
  } finally {
    process.env = saved;
  }
});

test("blockCode: `# after:` texts in course page order, py-connect first, then its own, blank lines between", () => {
  const connect = pyBlock("py-connect", "def connect(): pass");
  const a = pyBlock("s4-a", "# after: py-connect", "A = 1");
  const b = pyBlock("s4-b", "B = 2");
  const c = pyBlock("s4-c", "# after: s4-b, py-connect, s4-a", "print(A, B)");
  const course = [page("setup", [connect]), page("s4", [a, b, c])];
  assert.equal(blockCode(c, course), [connect.text, a.text, b.text, c.text].map((t) => t.replace(/\n+$/, "")).join("\n\n") + "\n");
  assert.equal(blockCode(b, course), b.text, "no `# after:`: its own text");
  assert.throws(() => blockCode(pyBlock("s4-d", "# after: s4-zz", "pass"), course), /s4-d: `# after`: no block s4-zz in the course/);
});

test("PY7 pythonFailure: a timeout; a non-zero exit (or a signal) quoting stderr's last 5 lines; exit 0 none", () => {
  const r = (over: Partial<PyRun>): PyRun => ({ stdout: "", stderr: "", exit: 0, timedOut: false, pipesHeld: false, ...over });
  assert.equal(pythonFailure(r({}), 60), undefined);
  assert.match(pythonFailure(r({ pipesHeld: true }), 60)!, /^a process the block started left its process group/);
  assert.equal(pythonFailure(r({ exit: null, timedOut: true }), 7), "timed out after 7 s");
  const stderr = lines("1", "2", "3", "4", "5", "6", "7");
  assert.equal(pythonFailure(r({ exit: 3, stderr }), 60), "python exited with code 3; stderr ends:\n3\n4\n5\n6\n7");
  assert.equal(pythonFailure(r({ exit: null, stderr: "killed\n" }), 60), "python exited with a signal; stderr ends:\nkilled");
});

if (!existsSync(PYTHON)) {
  test("PY0 the engine's process tests", () => {
    assert.fail(`${PYTHON} is missing: the engine's process tests need it (so does pnpm learn:venv)`);
  });
} else {
  test("PY2 -I from an empty cwd, code outside it, its own empty HOME; a planted json.py isn't imported", async () => {
    const r = await run(lines(
      "import importlib, os, sys",
      "here, code, home = os.getcwd(), os.path.dirname(os.path.abspath(__file__)), os.environ['HOME']",
      "print(sys.flags.isolated, os.listdir(here), os.listdir(home), home not in (here, code), not code.startswith(here))",
      "for d in (here, code):",
      "    open(os.path.join(d, 'json.py'), 'w').write('raise SystemExit(\"planted json.py imported\")\\n')",
      "importlib.invalidate_caches()",
      "import json",
      "print(json.dumps([os.path.basename(os.path.dirname(d)) == os.path.basename(os.path.dirname(here)) for d in (code, home)]))",
    ));
    assert.equal(r.stderr, "");
    assert.deepEqual([r.exit, r.timedOut], [0, false]);
    assert.equal(r.stdout, "1 [] [] True True\n[true, true]\n");
  });

  test("PY3 the process sees exactly that environment, HOME its own; a child sees the same PGAPPNAME", async () => {
    const saved = { ...process.env };
    Object.assign(process.env, { GBIF_PASSWORD: "py3-secret", DATABASE_URL: "postgresql:///py3-db", LEARN_PG_URL: "postgresql:///py3-lab" });
    try {
      const r = await run(lines(
        "import json, os, subprocess",
        "start = dict(kv.split('=', 1) for kv in open('/proc/self/environ', 'rb').read().decode().split('\\0') if kv)",
        "child = subprocess.run(['sh', '-c', 'printf %s \"$PGAPPNAME\"'], capture_output=True, text=True).stdout",
        "mpl = start['MPLCONFIGDIR']",
        "print(json.dumps(sorted(start)))",
        "print(child)",
        "print(start['HOME'] == os.environ['HOME'], os.path.basename(start['HOME']), not mpl.startswith(os.getcwd()), not mpl.startswith(start['HOME']))",
        "print(any('py3-' in v for v in start.values()))",
      ));
      assert.equal(r.exit, 0, r.stderr);
      assert.equal(r.stdout, lines(
        JSON.stringify(["HOME", "LEARN_BASE", "MPLCONFIGDIR", "PATH", "PGAPPNAME", "PGDATABASE", "PGHOST", "PGOPTIONS", "PGPASSWORD", "PGPORT", "PGUSER"]).replaceAll(",", ", "),
        app,
        "True home True True",
        "False",
      ));
    } finally {
      process.env = saved;
    }
  });

  test("PY7 a non-zero exit: its code, stdout and stderr kept; the temp folder gone", async () => {
    const r = await run(lines("import os, sys", "print(os.path.dirname(os.getcwd()))", "print('bad thing', file=sys.stderr)", "sys.exit(3)"));
    assert.deepEqual([r.exit, r.timedOut, r.stderr], [3, false, "bad thing\n"]);
    assert.match(r.stdout, /\/critwire-learn-py-[^/]+\n$/);
    assert.equal(existsSync(r.stdout.trim()), false, "temp folder removed");
    assert.match(pythonFailure(r, 60)!, /code 3; stderr ends:\nbad thing$/);
  });

  test("PY8 over timeoutMs: the group is SIGKILLed, no child left, the temp folder gone", async () => {
    const marker = "47.3125";
    const t0 = Date.now();
    const r = await run(lines("import os, subprocess, sys, time", `subprocess.Popen(["sleep", "${marker}"])`, "print(os.path.dirname(os.getcwd()), flush=True)", "time.sleep(30)"), 1000);
    assert.deepEqual([r.timedOut, r.exit], [true, null]);
    assert.ok(Date.now() - t0 < 10_000, `took ${Date.now() - t0} ms`);
    assert.equal(gone(`sleep ${marker}`).status, 1, `child left running: ${gone(`sleep ${marker}`).stdout}`);
    assert.equal(existsSync(r.stdout.trim()), false, "temp folder removed");
    assert.equal(pythonFailure(r, 1), "timed out after 1 s");
  });

  test("PY8 a background straggler after a normal exit is killed; the run returns at once", async () => {
    const marker = "48.3125";
    const t0 = Date.now();
    const r = await run(lines("import subprocess", `subprocess.Popen(["sleep", "${marker}"])`, "print('done')"));
    assert.deepEqual([r.exit, r.timedOut, r.stdout], [0, false, "done\n"]);
    assert.ok(Date.now() - t0 < 10_000, `took ${Date.now() - t0} ms`);
    assert.equal(gone(`sleep ${marker}`).status, 1, "straggler left running");
  });

  test("PY8 a child that left the group holds the pipes: the run returns within the grace, failed, the folder gone", async (t) => {
    const r0 = Date.now();
    const r = await run(lines(
      "import os, subprocess",
      `p = subprocess.Popen(["sleep", "50.3125"], start_new_session=True)`,
      "print(p.pid, os.path.dirname(os.getcwd()), flush=True)",
    ));
    const [pid, folder] = r.stdout.trim().split(" ") as [string, string];
    t.after(() => {
      try {
        process.kill(Number(pid), "SIGKILL");
      } catch {}
    });
    assert.ok(Date.now() - r0 < 2_000 + 1_000, `took ${Date.now() - r0} ms`);
    assert.deepEqual([r.exit, r.timedOut, r.pipesHeld], [0, false, true]);
    assert.match(pythonFailure(r, 60)!, /left its process group and held its output/);
    assert.equal(existsSync(folder), false, "temp folder removed");
  });

  test("PY8 an abort rejects with its reason after killing the group and removing the temp folder", async () => {
    const marker = "49.3125";
    const ac = new AbortController();
    const seen: string[] = [];
    const p = run(lines("import os, subprocess, time", `subprocess.Popen(["sleep", "${marker}"])`, "print(os.path.dirname(os.getcwd()), flush=True)", "time.sleep(30)"), 30_000, ac.signal);
    const tmps = () => spawnSync("sh", ["-c", `ls -d ${tmpdir()}/critwire-learn-py-* 2>/dev/null`], { encoding: "utf8" }).stdout.split("\n").filter(Boolean);
    for (let i = 0; i < 100 && gone(`sleep ${marker}`).status !== 0; i++) await new Promise((r) => setTimeout(r, 50));
    seen.push(...tmps());
    ac.abort(new Error("stop now"));
    await assert.rejects(p, /stop now/);
    assert.equal(gone(`sleep ${marker}`).status, 1, "child left running");
    assert.ok(seen.length > 0, "the run had a temp folder");
    for (const d of seen) assert.equal(existsSync(d), false, `${d} left`);
    await assert.rejects(run("print(1)", 30_000, AbortSignal.abort(new Error("already"))), /already/);
  });
}
