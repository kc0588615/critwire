// A result region (plan D11): a one-line summary and a table of the first DRAWN rows (cells as scripts/learn/cell.ts's cellText),
// or the error. The region is aria-busy while its query runs. Cards and the Table tab build on this (S12).
import type { Result } from "./engine.ts";
import { cellText } from "../../../scripts/learn/cell.ts";

/** Rows drawn in the table; the result keeps up to ROW_CAP. */
export const DRAWN = 200;

const n = (x: number) => x.toLocaleString("en-US");

function summary(result: Result): string {
  const shown = Math.min(result.rows.length, DRAWN);
  if (result.truncated) return `The first ${n(result.rows.length)} rows were kept; the rest were cut. Showing ${n(shown)}.`;
  const rows = result.rows.length === 1 ? "1 row." : `${n(result.rows.length)} rows.`;
  return shown < result.rows.length ? `${rows} Showing ${n(shown)}.` : rows;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Partial<HTMLElementTagNameMap[K]> = {}, ...children: Node[]): HTMLElementTagNameMap[K] {
  const e = Object.assign(document.createElement(tag), props);
  e.append(...children);
  return e;
}

export function setBusy(region: HTMLElement, busy: boolean): void {
  if (busy) region.setAttribute("aria-busy", "true");
  else region.removeAttribute("aria-busy");
}

/** Replaces the region's content with `text` alone (Reset, Stop). */
export function showNote(region: HTMLElement, text: string): void {
  region.replaceChildren(el("p", { className: "result-summary", textContent: text }));
}

export function showError(region: HTMLElement, error: Error): void {
  region.replaceChildren(el("p", { className: "result-error", textContent: error.message }));
}

export function showResult(region: HTMLElement, result: Result): void {
  const head = el("tr", {}, ...result.columns.map((c) => el("th", { scope: "col", textContent: c })));
  const body = result.rows.slice(0, DRAWN).map((r) => el("tr", {}, ...r.map((v) => el("td", { textContent: cellText(v) }))));
  region.replaceChildren(
    el("p", { className: "result-summary", textContent: summary(result) }),
    el("div", { className: "table-wrap" }, el("table", {}, el("thead", {}, head), el("tbody", {}, ...body))),
  );
}
