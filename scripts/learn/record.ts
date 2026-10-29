// learn:check's one result path for every engine (plan L4 §4.3): each engine hands over its blocks' runs (the first,
// and with `update` the second; a `-- boot` block runs once), and settleResults compares each with its recorded result
// (site/learn/labs/checked/<id>.txt) or, with `update`, requires the two runs to agree and writes the results once
// every block passed. Tests: record.test.ts (PY6, PY9).
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { CHECKED_DIR, type Block } from "./blocks.ts";
import { lineDiff } from "./result.ts";

/** One run of a block. */
export interface Outcome {
  id: string;
  failures: string[];
  /** The result as checked/<id>.txt records it, when the block ran as it should. */
  rendered?: string;
}

/** A block's runs: the first, and with `update` the second (none for a `-- boot` block, which runs once). */
export interface BlockRuns {
  block: Pick<Block, "id" | "boot" | "plan">;
  first: Outcome;
  second?: Outcome;
}

export interface SettleOptions {
  /** Write the recorded results (each block run twice) instead of checking them. */
  update: boolean;
  /** Where the recorded results live (default site/learn/labs/checked). */
  checkedDir?: string;
  log?: (line: string) => void;
}

async function readRecorded(file: string): Promise<string | undefined> {
  try {
    return await readFile(file, "utf8");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw e;
  }
}

/**
 * The runs against their recorded results: each must equal it (an EXPLAIN block's text difference is only logged: its
 * `-- plan:` assertions hold); with `update`, a block's two runs must agree, and once every block passed each result
 * is written where it changed. Throws naming every failure, writing nothing.
 */
export async function settleResults(runs: readonly BlockRuns[], { update, checkedDir = CHECKED_DIR, log = console.log }: SettleOptions): Promise<void> {
  const failures: string[] = [];
  const writes: [file: string, text: string][] = [];
  for (const { block: b, first, second } of runs) {
    const q = `q ${b.id}`;
    const file = join(checkedDir, `${b.id}.txt`);
    failures.push(...first.failures);
    if (first.rendered === undefined) continue;
    const recorded = await readRecorded(file);
    if (update) {
      if (!b.boot && !second) throw new Error(`${q}: --update needs two runs, the engine gave one`);
      const again = second ?? first;
      if (second) failures.push(...second.failures);
      if (again.rendered === undefined) continue;
      if (!b.plan.length && again.rendered !== first.rendered) {
        failures.push(`${q}: two runs differ, so its result isn't reproducible:\n  ${lineDiff(first.rendered, again.rendered).join("\n  ")}`);
        continue;
      }
      if (recorded !== first.rendered) writes.push([file, first.rendered]);
    } else if (recorded === undefined) failures.push(`${q}: no recorded result: run pnpm learn:check --update`);
    else if (recorded !== first.rendered) {
      const diff = lineDiff(recorded, first.rendered).join("\n  ");
      if (b.plan.length) log(`learn:check: ${q}: the plan's text differs from ${file} (its assertions hold):\n  ${diff}`);
      else failures.push(`${q}: result differs from ${file}:\n  ${diff}`);
    } else if (!first.failures.length) log(`learn:check: ${q}: ok`);
  }
  if (failures.length) throw new Error(`blocks: ${failures.length} failure(s):\n${failures.join("\n")}`);
  if (writes.length) await mkdir(checkedDir, { recursive: true });
  for (const [file, text] of writes) {
    await writeFile(file, text);
    log(`learn:check: wrote ${file}`);
  }
}
