// How a query result is shown as cards (plan D11; the spike's src/cards.ts). Pure: the card rule decides cards or a
// table, and the renderer returns HTML, so Node tests see exactly what the page draws. Tests: scripts/learn/cards.test.ts.
// - Cards only when the SQL's first non-blank line is exactly `-- show: cards`; nothing is inferred.
// - The card key is `species_id` if the result has it, else `id`: non-null, integer, unique, known species ids.
// - A card's title, scientific name and photo come from the species lookup built at boot, never from the row.
import { licenseUrl } from "../../../scripts/build/licenses.ts";
import { firstWord, scriptStatements } from "../../../scripts/build/learn/sql.ts";
import { cellText } from "../../../scripts/learn/cell.ts";
import type { Result } from "./query-result.ts";
import { esc } from "./format.ts";

export const CARDS_DIRECTIVE = "-- show: cards";
export const CARD_LIMIT = 200;
export const CARD_RULE = "Cards need one row per animal, with its id in `id` or `species_id`";

/** One row of the boot-time lookup: `SELECT id, common_name, scientific_name, photo_* FROM species`. */
export interface SpeciesInfo {
  id: number;
  common_name: string;
  scientific_name: string;
  photo_url: string | null;
  photo_credit: string | null;
  photo_license: string | null;
  photo_page: string | null;
}

/** The boot-time lookup's query, run after every setup. */
export const SPECIES_LOOKUP = "SELECT id, common_name, scientific_name, photo_url, photo_credit, photo_license, photo_page FROM species";

export function speciesMap(lookup: Result): Map<number, SpeciesInfo> {
  return new Map(lookup.rows.map((r) => [Number(r[0]), Object.fromEntries(lookup.columns.map((c, i) => [c, r[i]])) as unknown as SpeciesInfo]));
}

/** Columns a card already shows through the lookup; the row's other columns become "column: value" lines. */
const CARD_FIELDS = new Set<string>(["common_name", "scientific_name", "photo_url", "photo_credit", "photo_license", "photo_page"]);

export interface Card {
  species: SpeciesInfo;
  extras: [column: string, value: string][];
}

export type Display =
  | { kind: "table"; reason?: string }
  | { kind: "cards"; key: string; cards: Card[]; total: number };

export function wantsCards(sql: string): boolean {
  const first = sql.split("\n").find((l) => l.trim() !== "");
  return first?.trim() === CARDS_DIRECTIVE;
}

/** A species id from a key cell, or null when it isn't a safe integer. */
function keyId(v: unknown): number | null {
  if (typeof v === "number") return Number.isInteger(v) ? v : null;
  if (typeof v === "bigint") return v >= BigInt(Number.MIN_SAFE_INTEGER) && v <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(v) : null;
  return null;
}

/** The card rule: cards, or a table with the reason cards were refused. */
export function display(sql: string, result: Result, species: ReadonlyMap<number, SpeciesInfo>): Display {
  if (!wantsCards(sql)) return { kind: "table" };
  const key = result.columns.includes("species_id") ? "species_id" : result.columns.includes("id") ? "id" : null;
  const refuse = (why: string): Display => ({ kind: "table", reason: `${CARD_RULE} (${why}).` });
  if (!key) return refuse("no `id` or `species_id` column");
  const k = result.columns.indexOf(key);
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const row of result.rows) {
    const id = keyId(row[k]);
    if (id === null) return refuse(`\`${key}\` ${cellText(row[k])} is not a whole number`);
    if (seen.has(id)) return refuse(`\`${key}\` ${id} appears twice`);
    if (!species.has(id)) return refuse(`\`${key}\` ${id} is not an animal's id`);
    seen.add(id);
    ids.push(id);
  }
  const extraCols = result.columns.flatMap((c, i) => (c === key || CARD_FIELDS.has(c) ? [] : [i]));
  const cards = ids.slice(0, CARD_LIMIT).map((id, r) => ({
    species: species.get(id)!,
    extras: extraCols.map((i): [string, string] => [result.columns[i]!, cellText(result.rows[r]![i])]),
  }));
  return { kind: "cards", key, cards, total: ids.length };
}

/** "Photo: {credit}, {license linked to its deed}, via Wikimedia Commons" (linked to the file page). Throws on an unknown license. */
function creditHtml(s: SpeciesInfo): string {
  const deed = licenseUrl(s.photo_license!);
  const license = deed ? `<a href="${esc(deed)}" rel="license">${esc(s.photo_license!)}</a>` : esc(s.photo_license!);
  return `Photo: ${esc(s.photo_credit ?? "unknown")}, ${license}, via <a href="${esc(s.photo_page!)}">Wikimedia Commons</a>`;
}

export function cardHtml({ species: s, extras }: Card): string {
  const photo = s.photo_url
    ? `<img src="${esc(s.photo_url)}" alt="Photo of ${esc(s.common_name)}" loading="lazy" referrerpolicy="no-referrer" crossorigin="anonymous">`
    : `<div class="no-photo" role="img" aria-label="No photo yet of ${esc(s.common_name)}">No photo yet</div>`;
  return [
    `<article class="card" data-species-id="${s.id}">`,
    `<div class="photo">${photo}</div>`,
    `<h3 class="name">${esc(s.common_name)}</h3>`,
    `<p class="sci"><i>${esc(s.scientific_name)}</i></p>`,
    ...extras.map(([c, v]) => `<p class="extra">${esc(c)}: ${esc(v)}</p>`),
    s.photo_url ? `<p class="credit">${creditHtml(s)}</p>` : "",
    `</article>`,
  ].join("");
}

export function cardsHtml(d: Extract<Display, { kind: "cards" }>): string {
  if (d.total === 0) return `<p class="empty">No animals match.</p>`;
  const more = d.total > d.cards.length ? `<p class="more">showing ${d.cards.length} of ${d.total}</p>` : "";
  return `<div class="cards" role="list">${d.cards.map((c) => `<div role="listitem">${cardHtml(c)}</div>`).join("")}</div>${more}`;
}

/** One row with one number also shows as a large count (002 §8). */
export function countOf(r: Result): number | null {
  if (r.rows.length !== 1 || r.columns.length !== 1) return null;
  const v = r.rows[0]![0];
  return typeof v === "number" || typeof v === "bigint" ? Number(v) : null;
}

/** Rows the script's last statement wrote, when it is an INSERT, UPDATE or DELETE that returned DuckDB's `Count` (002 §8). */
export function rowsChanged(sql: string, r: Result): number | null {
  const word = firstWord(scriptStatements(sql).at(-1)!.text);
  if (!word || !["INSERT", "UPDATE", "DELETE"].includes(word) || r.columns.length !== 1 || r.columns[0] !== "Count") return null;
  return countOf(r);
}
