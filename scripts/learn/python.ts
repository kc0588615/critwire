// The lab's Python engine (plan L4 §3): one block's code, run as `python -I <tmp>/code/block.py` from an empty cwd with
// its own empty HOME and only pythonEnv's variables. The block leads its own process group, which is SIGKILLed on a
// timeout, an abort and after it exits (stragglers); a process that left the group and still holds the pipes
// PIPE_GRACE_MS after the exit fails the run (pipesHeld); its temp folder goes on every path. The venv check is venv.ts's.
// scripts/ingest/python.ts's runPython (progress on stderr, no isolation) is the ingests'. Tests: python.test.ts.
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { VENV_PYTHON } from "../venv.ts";
import type { Block } from "./blocks.ts";
import type { CoursePage } from "./course.ts";
import { childEnv, type PgTarget } from "./pg.ts";

/** Every lab session a learn:check run's Python starts is named this plus the run id (§4.4(b), §4.6). */
export const PY_APP_PREFIX = "critwire-learn-check-py-";
/** How many of stderr's last lines a failure quotes (PY7). */
const STDERR_TAIL = 5;
/** How long the pipes may stay open after the block exits and its group is killed (PY8: a process outside the group). */
const PIPE_GRACE_MS = 1000;

/** A new run's name: PY_APP_PREFIX + 12 hex (36 bytes, under PostgreSQL's 63). */
export const pythonApp = (): string => PY_APP_PREFIX + randomBytes(6).toString("hex");

export interface PythonEnvOptions {
  /** LEARN_BASE: where the blocks read /learn/data/ from. */
  learnBase: string;
  /** PGAPPNAME: the run's name (pythonApp). libpq gives it to every connection of the block and its children. */
  app: string;
  /** MPLCONFIGDIR: one folder per run, outside every block's cwd and HOME. */
  mplConfig: string;
}

/** A run's environment (PY3), all of it but HOME, which runPython sets to each process's own folder. */
export function pythonEnv(target: PgTarget, { learnBase, app, mplConfig }: PythonEnvOptions): NodeJS.ProcessEnv {
  const { HOME: _, ...env } = childEnv(target, {}, "-c search_path=pg_catalog");
  return { ...env, PATH: `${dirname(VENV_PYTHON)}:/usr/bin:/bin`, PGAPPNAME: app, MPLCONFIGDIR: mplConfig, LEARN_BASE: learnBase };
}

/** What block `b` runs: its `# after:` blocks' texts in course page order (py-connect first), then its own (004 §0). */
export function blockCode(b: Block, course: readonly CoursePage[]): string {
  const all = course.flatMap((p) => p.blocks);
  for (const id of b.after) if (!all.some((x) => x.id === id)) throw new Error(`q ${b.id}: \`# after\`: no block ${id} in the course`);
  return [...all.filter((x) => b.after.includes(x.id)), b].map((x) => x.text.replace(/\n+$/, "")).join("\n\n") + "\n";
}

export interface PyRun {
  stdout: string;
  stderr: string;
  /** The exit code; null when a signal ended it. */
  exit: number | null;
  timedOut: boolean;
  /** A process outside the block's group held stdout or stderr PIPE_GRACE_MS after the exit; the pipes were dropped. */
  pipesHeld: boolean;
}

export interface RunPythonOptions {
  python: string;
  /** pythonEnv's; HOME is added. */
  env: NodeJS.ProcessEnv;
  timeoutMs: number;
  signal?: AbortSignal;
}

/** Runs `code` isolated (PY2, PY8). Resolves when the block and its pipes are done, at most PIPE_GRACE_MS after its
 *  exit; an abort rejects with its reason. */
export async function runPython(code: string, { python, env, timeoutMs, signal }: RunPythonOptions): Promise<PyRun> {
  signal?.throwIfAborted();
  const tmp = mkdtempSync(join(tmpdir(), "critwire-learn-py-"));
  try {
    const [codeDir, cwd, home] = ["code", "cwd", "home"].map((d) => join(tmp, d)) as [string, string, string];
    for (const d of [codeDir, cwd, home]) mkdirSync(d);
    const file = join(codeDir, "block.py");
    writeFileSync(file, code);
    return await new Promise<PyRun>((resolve, reject) => {
      // detached: the block leads its own process group, so a kill reaches whatever it started.
      const child = spawn(python, ["-I", file], { cwd, env: { ...env, HOME: home }, detached: true, stdio: ["ignore", "pipe", "pipe"] });
      const killGroup = () => {
        try {
          if (child.pid !== undefined) process.kill(-child.pid, "SIGKILL");
        } catch (e) {
          if ((e as NodeJS.ErrnoException).code !== "ESRCH") throw e;
        }
      };
      const out: Buffer[] = [];
      const err: Buffer[] = [];
      child.stdout.on("data", (d: Buffer) => out.push(d));
      child.stderr.on("data", (d: Buffer) => err.push(d));
      let timedOut = false;
      let pipesHeld = false;
      let grace: NodeJS.Timeout | undefined;
      const timer = setTimeout(() => {
        timedOut = true;
        killGroup();
      }, timeoutMs);
      const onAbort = () => killGroup();
      signal?.addEventListener("abort", onAbort, { once: true });
      const done = () => {
        clearTimeout(timer);
        clearTimeout(grace);
        signal?.removeEventListener("abort", onAbort);
      };
      child.once("error", (e) => {
        done();
        reject(e);
      });
      // A straggler holding the pipes would delay "close": kill the group once the block itself has exited. One that
      // left the group survives that: drop the pipes after the grace, so "close" comes, and fail the run.
      child.once("exit", () => {
        clearTimeout(timer);
        killGroup();
        grace = setTimeout(() => {
          pipesHeld = true;
          child.stdout.destroy();
          child.stderr.destroy();
        }, PIPE_GRACE_MS);
      });
      child.once("close", (exit) => {
        done();
        killGroup();
        if (signal?.aborted) reject(signal.reason);
        else resolve({ stdout: Buffer.concat(out).toString("utf8"), stderr: Buffer.concat(err).toString("utf8"), exit, timedOut, pipesHeld });
      });
    });
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** Why a finished run failed (a timeout, held pipes, a non-zero exit), or undefined if it exited 0 (PY7, PY8). */
export function pythonFailure(r: PyRun, timeoutS: number): string | undefined {
  if (r.timedOut) return `timed out after ${timeoutS} s`;
  if (r.pipesHeld)
    return `a process the block started left its process group and held its output ${PIPE_GRACE_MS / 1000} s after the block exited (start_new_session or setsid): it may still run; end it`;
  if (r.exit === 0) return undefined;
  const tail = r.stderr.trimEnd().split("\n").slice(-STDERR_TAIL).join("\n");
  return `python exited with ${r.exit === null ? "a signal" : `code ${r.exit}`}; stderr ends:\n${tail}`;
}
