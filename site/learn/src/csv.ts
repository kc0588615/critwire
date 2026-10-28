// A result as CSV, for the playground's Download CSV (plan D12): as DuckDB's COPY writes it, a header row, `\n` line
// ends, a field quoted only when it holds a comma, a quote, CR or LF, NULL as an empty field and an empty string as "".
// Cells as the page shows them (scripts/learn/cell.ts). Pure. Tests: scripts/learn/result-csv.test.ts.
import { cellText } from "../../../scripts/learn/cell.ts";
import type { Result } from "./query-result.ts";

function field(v: unknown): string {
  if (v === null || v === undefined) return "";
  const text = cellText(v);
  return text === "" || /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function csvText(result: Pick<Result, "columns" | "rows">): string {
  return [result.columns, ...result.rows].map((row) => `${row.map(field).join(",")}\n`).join("");
}
