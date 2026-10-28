// The read-only E2E test hook (plan D11): window.critwireLearn.result(blockId) is the block's last result, its cells as
// scripts/learn/cell.ts's cellText, or its error; undefined before the first run and after a restart.
import { cellText } from "../../../scripts/learn/cell.ts";
import type { Result } from "./query-result.ts";

type HookResult = { columns: string[]; rows: string[][]; truncated: boolean } | { error: string };

const results = new Map<string, HookResult>();

/** Records a block's last outcome; undefined forgets it. */
export function setHookResult(blockId: string, outcome: Result | Error | undefined): void {
  if (outcome === undefined) results.delete(blockId);
  else if (outcome instanceof Error) results.set(blockId, { error: outcome.message });
  else results.set(blockId, { columns: outcome.columns, rows: outcome.rows.map((r) => r.map(cellText)), truncated: outcome.truncated === true });
}

export function installHook(): void {
  Object.defineProperty(window, "critwireLearn", { value: Object.freeze({ result: (blockId: string) => structuredClone(results.get(blockId)) }) });
}
