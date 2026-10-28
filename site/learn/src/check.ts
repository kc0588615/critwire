// Exercise checks (plan D11; A1's src/check.ts). A Check runs the reference answer and the learner's SQL isolated, after
// the exercise's `-- after:` blocks, on an unchanged generation only (pristine data: a playground change refuses until
// Reset), and compares them:
// - result: the learner's rows against the reference's, by position (column names ignored), as a multiset unless the
//   exercise is "in order"; hints name what differs;
// - then each probe (an `-- expect: error` block whose `-- after:` names the exercise) runs isolated after the
//   learner's SQL, in the exercise's place, and must fail on its last statement with its text.
// The compares are pure; Checker drives them on the engine. Tests: scripts/learn/exercise.test.ts.
import { cellText } from "../../../scripts/learn/cell.ts";
import { ScriptError } from "../../../scripts/build/learn/sql.ts";
import type { Result } from "./query-result.ts";
import type { Script } from "./isolation.ts";

export interface Verdict {
  ok: boolean;
  hint: string;
}

/** 002's message when Check meets a changed generation. */
export const CHANGED_TABLES = "Changed the tables? Reset database brings them back.";

export interface Probe {
  id: string;
  sql: string;
  /** The text its last statement's error contains. */
  expect: string;
  /** Its `-- after:` blocks; the exercise's entry is replaced by the learner's SQL. */
  after: readonly Script[];
}

export interface Exercise {
  id: string;
  /** The reference answer's SQL. */
  answer: string;
  ordered: boolean;
  after: readonly Script[];
  probes: readonly Probe[];
}

/** What Checker needs of the engine (engine.ts Engine). */
export interface CheckEngine {
  readonly changed: boolean;
  readonly generation: number;
  isolated(after: readonly Script[], sql: string): Promise<Result>;
}

const REL = 1e-9;

function numeric(v: unknown): v is number | bigint {
  return typeof v === "number" || typeof v === "bigint";
}

function numEq(a: number | bigint, b: number | bigint): boolean {
  if (typeof a === "bigint" || typeof b === "bigint") {
    const ints = [a, b].every((x) => typeof x === "bigint" || Number.isInteger(x));
    if (ints) return BigInt(a) === BigInt(b);
  }
  const x = Number(a);
  const y = Number(b);
  return x === y || Math.abs(x - y) <= REL * Math.max(Math.abs(x), Math.abs(y));
}

export function cellEq(a: unknown, b: unknown): boolean {
  if (a === null || a === undefined || b === null || b === undefined) return (a ?? null) === (b ?? null);
  if (numeric(a) && numeric(b)) return numEq(a, b);
  if (Array.isArray(a) || Array.isArray(b)) return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((x, i) => cellEq(x, b[i]));
  if (a instanceof Date || b instanceof Date) return a instanceof Date && b instanceof Date && a.getTime() === b.getTime();
  if (typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a);
    return ka.length === Object.keys(b).length && ka.every((k) => cellEq((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]));
  }
  return a === b;
}

const rowEq = (a: unknown[], b: unknown[]) => a.length === b.length && a.every((x, i) => cellEq(x, b[i]));

/** Every row of `a` pairs with its own equal row of `b` (duplicates count). */
function sameMultiset(a: unknown[][], b: unknown[][]): boolean {
  const used = new Array<boolean>(b.length).fill(false);
  return a.every((row) => {
    const j = b.findIndex((other, i) => !used[i] && rowEq(row, other));
    if (j < 0) return false;
    used[j] = true;
    return true;
  });
}

const sortedCells = (rows: unknown[][]) => rows.map((r) => [...r].sort((x, y) => cellText(x).localeCompare(cellText(y))));
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function checkResult(learner: Result, reference: Result, ordered: boolean): Verdict {
  const want = reference.rows;
  const got = learner.rows;
  const wantCols = reference.columns.length || (want[0]?.length ?? 0);
  if (learner.columns.length !== wantCols)
    return { ok: false, hint: `Your result has ${plural(learner.columns.length, "column")}; the answer has ${wantCols}.` };
  if (got.length !== want.length) return { ok: false, hint: `Your result has ${plural(got.length, "row")}; the answer has ${want.length}.` };
  if (ordered ? got.every((r, i) => rowEq(r, want[i]!)) : sameMultiset(got, want)) return { ok: true, hint: "Correct." };
  if (ordered && sameMultiset(got, want)) return { ok: false, hint: "The right rows, but in another row order: check your ORDER BY." };
  if (sameMultiset(sortedCells(got), sortedCells(want)))
    return { ok: false, hint: "The right values, but in another column order: list the columns in the order the question asks." };
  return { ok: false, hint: "Some rows differ from the answer." };
}

/** A run's result, or the ScriptError its own SQL threw. */
export interface Outcome {
  result?: Result;
  error?: ScriptError;
}

export function checkProbe(probe: Pick<Probe, "id" | "expect">, o: Outcome): Verdict {
  const should = `${probe.id} should fail after your answer with "${probe.expect}"`;
  if (!o.error) return { ok: false, hint: `${should}, but it ran without an error.` };
  if (o.error.statement !== o.error.total || !o.error.detail.includes(probe.expect)) return { ok: false, hint: `${should}, but it failed with: ${o.error.message}` };
  return { ok: true, hint: "Correct." };
}

/** Runs `sql` isolated; its own SQL failing is an outcome, anything else (a restart, an after block) is thrown. */
async function outcome(engine: CheckEngine, after: readonly Script[], sql: string): Promise<Outcome> {
  try {
    return { result: await engine.isolated(after, sql) };
  } catch (e) {
    if (e instanceof ScriptError) return { error: e };
    throw e;
  }
}

/** Checks exercises on one engine, keeping each reference result for the generation it was computed on. */
export class Checker {
  readonly #engine: CheckEngine;
  readonly #references = new Map<string, Result>();

  constructor(engine: CheckEngine) {
    this.#engine = engine;
  }

  async #reference(ex: Exercise): Promise<Result> {
    const key = `${this.#engine.generation}:${ex.id}`;
    let reference = this.#references.get(key);
    if (!reference) {
      reference = await this.#engine.isolated(ex.after, ex.answer);
      this.#references.set(key, reference);
    }
    return reference;
  }

  async check(ex: Exercise, sql: string): Promise<Verdict> {
    if (this.#engine.changed) return { ok: false, hint: CHANGED_TABLES };
    const reference = await this.#reference(ex);
    const mine = await outcome(this.#engine, ex.after, sql);
    if (mine.error) return { ok: false, hint: `Your SQL failed: ${mine.error.message}` };
    const verdict = checkResult(mine.result!, reference, ex.ordered);
    if (!verdict.ok) return verdict;
    for (const probe of ex.probes) {
      const after = probe.after.map((a) => (a.id === ex.id ? { id: ex.id, sql } : a));
      const v = checkProbe(probe, await outcome(this.#engine, after, probe.sql));
      if (!v.ok) return v;
    }
    return verdict;
  }
}
