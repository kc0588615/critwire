// learn:check's Python stage (plan L4 §4.3, §4.4; D13): the ran Python blocks, in page order, after the PostGIS ones.
// Each runs isolated (python.ts runPython: its `# after:` code first, the run's environment, `# timeout:`), twice with
// `update`, and its stdout is its result (result.ts renderPython). After each run, each of these fails the block:
// (a) a non-zero exit or the timeout; (b) a session of the run (this database, the lab role, the run's name) still
// there 10 s after the block exited: ended with pg_terminate_backend and named; (c) a committed learn_ object: the lab
// role's dropped, any other named (runner.ts committedLeaks); (d) learn_curriculum differing from its reading at the
// stage's start: the blocks after it would read another lab, so the stage stops there (throws). The runs go to
// record.ts settleResults with the PostGIS ones. An abort kills the running block's group and throws its reason; the
// lock's release then ends the run's sessions and sweeps. Tests: py-runner.dbtest.ts (PYC1–PYC5, PYC9, PY7/PY8).
import { setTimeout as sleep } from "node:timers/promises";
import type postgres from "postgres";
import { VENV_PYTHON } from "../venv.ts";
import type { Block } from "./blocks.ts";
import { endRunSessions, runSessions } from "./cleanup.ts";
import type { CoursePage } from "./course.ts";
import { LAB_SCHEMA, type PgTarget } from "./pg.ts";
import { blockCode, pythonEnv, pythonFailure, runPython } from "./python.ts";
import type { BlockRuns, Outcome } from "./record.ts";
import { renderPython } from "./result.ts";
import { committedLeaks, tablesDiff } from "./runner.ts";

/** How long a block's sessions get to end once it exited (check (b)). */
const SESSIONS_GONE_MS = 10_000;
const POLL_MS = 50;

export interface PyStageOptions {
  /** Where the blocks connect (their PG* variables). */
  lab: PgTarget;
  /** The run's lab connection, as the lab role: checks (b) and (c). */
  sql: postgres.Sql;
  /** The lab database's name (a leak's cleanup command). */
  database: string;
  /** learn_curriculum's reading (check.ts readTables as the admin): check (d). */
  readLab: () => Promise<Map<string, string>>;
  /** The run's name (python.ts pythonApp): every block's PGAPPNAME. */
  app: string;
  /** learn_ objects not the run's: never dropped; one a block committed that the lab role didn't make joins, named once. */
  known: Set<string>;
  /** LEARN_BASE: the built site under test, as a file: URL. */
  learnBase: string;
  /** MPLCONFIGDIR: the run's, outside every block's folders. */
  mplConfig: string;
  /** Run each block twice (settleResults compares the runs). */
  update: boolean;
  /** Print each block's rendered result (--module). */
  show?: boolean;
  log?: (line: string) => void;
  signal?: AbortSignal;
  /** The interpreter (default .venv-learn's). */
  python?: string;
}

// Check (b): the run's sessions once the block exited; any still there after 10 s are ended and named.
async function sessionsLeft(o: PyStageOptions, q: string): Promise<string[]> {
  const deadline = Date.now() + SESSIONS_GONE_MS;
  while ((await runSessions(o.sql, o.app)).length) {
    if (Date.now() >= deadline) {
      const { ended, problems } = await endRunSessions(o.sql, o.app);
      return [
        ...(ended.length ? [`${q}: its session(s) ${ended.join(", ")} still ran ${SESSIONS_GONE_MS / 1000} s after it exited; ended`] : []),
        ...problems.map((p) => `${q}: ${p}`),
      ];
    }
    await sleep(POLL_MS);
  }
  return [];
}

// One run of block `b`, checked by (a)–(c); throws on (d), or with the abort's reason.
async function runPythonBlock(b: Block, course: readonly CoursePage[], before: Map<string, string>, o: PyStageOptions): Promise<Outcome> {
  const q = `q ${b.id}`;
  const started = Date.now();
  const r = await runPython(blockCode(b, course), {
    python: o.python ?? VENV_PYTHON,
    env: pythonEnv(o.lab, { learnBase: o.learnBase, app: o.app, mplConfig: o.mplConfig }),
    timeoutMs: b.timeoutS * 1000,
    signal: o.signal,
  });
  (o.log ?? console.log)(`learn:check: ${q}: python ${((Date.now() - started) / 1000).toFixed(1)} s`);
  const failed = pythonFailure(r, b.timeoutS);
  const failures = [
    ...(failed ? [`${q}: ${failed}`] : []),
    ...(await sessionsLeft(o, q)),
    ...(await committedLeaks(o.sql, o.database, q, o.known)),
  ];
  const changed = tablesDiff(LAB_SCHEMA, before, await o.readLab());
  if (changed.length) {
    throw new Error([`${q}: changed ${LAB_SCHEMA}, so the blocks after it would read another lab; the run stops here:`,
      ...changed, ...failures].join("\n  "));
  }
  return { id: b.id, failures, ...(failures.length ? {} : { rendered: renderPython(b.id, r.stdout) }) };
}

/** The ran Python blocks of `blocks`, in order, each run (twice with `update`) and checked; `course` gives their `# after:` code. */
export async function runPythonBlocks(blocks: readonly Block[], course: readonly CoursePage[], o: PyStageOptions): Promise<BlockRuns[]> {
  const python = blocks.filter((b) => b.engine === "python" && b.status === "ran");
  if (!python.length) return [];
  const before = await o.readLab();
  const runs: BlockRuns[] = [];
  for (const b of python) {
    const first = await runPythonBlock(b, course, before, o);
    if (first.rendered !== undefined && o.show) (o.log ?? console.log)(`learn:check: q ${b.id}:\n  ${first.rendered.split("\n").join("\n  ")}`);
    const second = o.update && first.rendered !== undefined ? await runPythonBlock(b, course, before, o) : undefined;
    runs.push({ block: b, first, ...(second ? { second } : {}) });
  }
  return runs;
}
