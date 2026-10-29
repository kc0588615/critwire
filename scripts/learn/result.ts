// A block's result as text (004 §0 "Result blocks"; spike plan-queries.ts): the one rendering learn:check records in
// site/learn/labs/checked/<id>.txt, E2E compares with its snapshots, and learn:port seeds from 004. Pure.
// Tests: result.test.ts.
import { createHash } from "node:crypto";
import { codeOnly } from "../build/learn/sql.ts";
import { cellText } from "./cell.ts";

export interface Result {
  columns: string[];
  rows: unknown[][];
}

const MAX_CELL = 60;
const SHOWN_ROWS = 5;
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
const escapeCell = (s: string) => s.replaceAll("|", "\\|").replaceAll("\n", "\\n");
const cut = (s: string) => {
  const chars = [...s];
  return chars.length > MAX_CELL ? chars.slice(0, MAX_CELL).join("") + "…" : s;
};
const rowLine = (row: unknown[], shorten: boolean) => row.map((v) => escapeCell(shorten ? cut(cellText(v)) : cellText(v))).join(" | ");

// `-- result: <id> · <n> rows · sha256 <12 hex>`, the column names, the first 5 rows (cells cut at 60 characters) and
// how many more. The hash covers the column names and every row, uncut. No final newline.
export function renderResult(id: string, r: Result): string {
  const header = r.columns.map(escapeCell).join(" | ");
  const full = [header, ...r.rows.map((row) => rowLine(row, false))].join("\n");
  const sha = createHash("sha256").update(full).digest("hex").slice(0, 12);
  const more = r.rows.length - SHOWN_ROWS;
  return [
    `-- result: ${id} · ${plural(r.rows.length, "row")} · sha256 ${sha}`,
    header,
    ...r.rows.slice(0, SHOWN_ROWS).map((row) => rowLine(row, true)),
    ...(more > 0 ? [`… ${plural(more, "more row")}`] : []),
  ].join("\n");
}

// A Python block's result (L4 plan §2; PY10): `-- result: <id> · python · sha256 <12 hex of stdout>`, then stdout less
// one final newline. The hash covers stdout as printed, so "a" and "a\n" differ.
export function renderPython(id: string, stdout: string): string {
  const sha = createHash("sha256").update(stdout).digest("hex").slice(0, 12);
  return [`-- result: ${id} · python · sha256 ${sha}`, ...(stdout ? [stdout.replace(/\n$/, "")] : [])].join("\n");
}

// An `-- expect: error` block's result: the error message's first line.
export const renderError = (id: string, message: string) => `-- result: ${id} · error: ${message.split("\n")[0]}`;

// Positional line diff: `- recorded` / `+ now` for each line that differs.
export function lineDiff(recorded: string, now: string): string[] {
  const a = recorded.split("\n");
  const b = now.split("\n");
  const out: string[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i] === b[i]) continue;
    if (a[i] !== undefined) out.push(`- ${a[i]}`);
    if (b[i] !== undefined) out.push(`+ ${b[i]}`);
  }
  return out;
}

// A multi-row result is deterministic only in a known order: an ORDER BY in the code, or an EXPLAIN's plan lines.
export const rowsOrdered = (statement: string) => /\border\s+by\b|^\s*explain\b/i.test(codeOnly(statement));
