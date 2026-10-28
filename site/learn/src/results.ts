// A result region (plan D11; 002 §8): a one-line summary ("N rows changed" for a write), a large count for one number,
// then the result as cards (`-- show: cards` and the card rule, cards.ts) with a Table tab, or as a table of the first
// DRAWN rows (cells as scripts/learn/cell.ts's cellText) with the reason cards were refused; or the error. The region
// is aria-busy while its query runs.
import { cellText } from "../../../scripts/learn/cell.ts";
import { cardsHtml, countOf, display, rowsChanged, type SpeciesInfo } from "./cards.ts";
import type { Result } from "./query-result.ts";

/** Rows drawn in the table; the result keeps up to ROW_CAP. */
export const DRAWN = 200;

const n = (x: number) => x.toLocaleString("en-US");

function summary(sql: string, result: Result): string {
  const changed = rowsChanged(sql, result);
  if (changed !== null) return changed === 1 ? "1 row changed." : `${n(changed)} rows changed.`;
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

function table(result: Result): HTMLElement {
  const head = el("tr", {}, ...result.columns.map((c) => el("th", { scope: "col", textContent: c })));
  const body = result.rows.slice(0, DRAWN).map((r) => el("tr", {}, ...r.map((v) => el("td", { textContent: cellText(v) }))));
  return el("div", { className: "table-wrap" }, el("table", {}, el("thead", {}, head), el("tbody", {}, ...body)));
}

/** Cards and Table tabs over their two panels, Cards first; the region's id names the panels. */
function tabs(region: HTMLElement, cards: HTMLElement, rows: HTMLElement): Node[] {
  const panels = [cards, rows];
  const buttons = ["Cards", "Table"].map((name, i) => {
    panels[i]!.id = `${region.id}-${name.toLowerCase()}`;
    panels[i]!.setAttribute("role", "tabpanel");
    const b = el("button", { type: "button", textContent: name, id: `${panels[i]!.id}-tab` });
    b.setAttribute("role", "tab");
    b.setAttribute("aria-controls", panels[i]!.id);
    panels[i]!.setAttribute("aria-labelledby", b.id);
    return b;
  });
  const select = (i: number) =>
    buttons.forEach((b, j) => {
      b.setAttribute("aria-selected", String(i === j));
      panels[j]!.hidden = i !== j;
    });
  buttons.forEach((b, i) => b.addEventListener("click", () => select(i)));
  select(0);
  const list = el("div", { className: "tabs" }, ...buttons);
  list.setAttribute("role", "tablist");
  list.setAttribute("aria-label", "Show the result as");
  return [list, ...panels];
}

export function showResult(region: HTMLElement, sql: string, result: Result, species: ReadonlyMap<number, SpeciesInfo>): void {
  const parts: Node[] = [el("p", { className: "result-summary", textContent: summary(sql, result) })];
  const count = rowsChanged(sql, result) === null ? countOf(result) : null;
  if (count !== null) parts.push(el("p", { className: "result-count", textContent: n(count) }));
  const shown = display(sql, result, species);
  if (shown.kind === "cards") {
    const cards = el("div", { className: "cards-panel" });
    cards.innerHTML = cardsHtml(shown);
    parts.push(...tabs(region, cards, el("div", { className: "table-panel" }, table(result))));
  } else {
    if (shown.reason) parts.push(el("p", { className: "result-reason", textContent: shown.reason }));
    parts.push(table(result));
  }
  region.replaceChildren(...parts);
}
