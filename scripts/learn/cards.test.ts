// CR1–CR12: the card rule and cards (site/learn/src/cards.ts; ported from the spike, plan S12). CR13–CR14: 002 §8's
// "N rows changed" and large count. Written before the code, seen failing first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CARD_LIMIT, cardsHtml, countOf, display, rowsChanged, wantsCards, type SpeciesInfo } from "../../site/learn/src/cards.ts";
import { LICENSE_URLS } from "../build/licenses.ts";
const sp = (id: number, photo = true): SpeciesInfo => ({
  id,
  common_name: `Animal ${id}`,
  scientific_name: `Genus species${id}`,
  photo_url: photo ? `https://thumb.wikimedia.org/${id}.jpg` : null,
  photo_credit: photo ? `Author <${id}>` : null,
  photo_license: photo ? "CC BY-SA 4.0" : null,
  photo_page: photo ? `https://commons.wikimedia.org/wiki/File:${id}.jpg` : null,
});
const SPECIES = new Map([1, 2, 3, 7, 19].map((id) => [id, sp(id, id !== 19)]));
for (let id = 100; id < 400; id++) SPECIES.set(id, sp(id));
const CARDS = "-- show: cards\nSELECT id FROM species";
const REASON = /Cards need one row per animal, with its id in `id` or `species_id`/;
const res = (columns: string[], rows: unknown[][]) => ({ columns, rows });

test("CR1 without the directive the result is a table, even with a valid id column", () => {
  assert.equal(display("SELECT id FROM species", res(["id"], [[1], [2]]), SPECIES).kind, "table");
});

test("CR2 the directive counts only as the first non-blank line, exactly", () => {
  assert.equal(wantsCards("-- show: cards\nSELECT 1"), true);
  assert.equal(wantsCards("\n  \n-- show: cards\nSELECT 1"), true);
  assert.equal(wantsCards("SELECT 1\n-- show: cards"), false);
  assert.equal(wantsCards("-- note\n-- show: cards\nSELECT 1"), false);
  assert.equal(wantsCards("-- show: cards please\nSELECT 1"), false);
  assert.equal(wantsCards("--show: cards\nSELECT 1"), false);
  assert.equal(wantsCards("SELECT 1 -- show: cards"), false);
});

test("CR3 with both species_id and id, the key is species_id", () => {
  const d = display(CARDS, res(["id", "species_id"], [[999, 1], [998, 2]]), SPECIES);
  assert.equal(d.kind, "cards");
  assert.equal(d.kind === "cards" && d.key, "species_id");
  assert.deepEqual(d.kind === "cards" && d.cards.map((c) => c.species.id), [1, 2]);
});

const tableWithReason = (columns: string[], rows: unknown[][]) => {
  const d = display(CARDS, res(columns, rows), SPECIES);
  assert.equal(d.kind, "table");
  assert.match(d.kind === "table" ? (d.reason ?? "") : "", REASON);
};

test("CR4 no key column: table, plus the reason line", () => tableWithReason(["common_name"], [["Jaguar"]]));
test("CR5 a NULL key: table, plus the reason line", () => tableWithReason(["id"], [[1], [null]]));
test("CR6 duplicate keys: table, plus the reason line", () => tableWithReason(["id"], [[1], [1]]));
test("CR7 a key that isn't a known species id: table, plus the reason line", () => {
  tableWithReason(["id"], [[999]]);
  tableWithReason(["id"], [[0]]);
});
test("CR8 a non-integer key: table, plus the reason line; a safe BigInt is accepted", () => {
  tableWithReason(["id"], [[1.5]]);
  tableWithReason(["id"], [["7"]]);
  tableWithReason(["id"], [[2n ** 60n]]);
  const d = display(CARDS, res(["id"], [[7n]]), SPECIES);
  assert.equal(d.kind, "cards");
  assert.equal(d.kind === "cards" && d.cards[0]!.species.id, 7);
});

test("CR9 zero rows with the directive: an empty state, not an error", () => {
  const d = display(CARDS, res(["id"], []), SPECIES);
  assert.equal(d.kind, "cards");
  assert.match(cardsHtml(d as Extract<typeof d, { kind: "cards" }>), /No animals match/);
});

test("CR10 over 200 rows: 200 cards and 'showing 200 of N'", () => {
  const rows = Array.from({ length: 250 }, (_, i) => [100 + i]);
  const d = display(CARDS, res(["id"], rows), SPECIES);
  assert.equal(CARD_LIMIT, 200);
  assert.equal(d.kind === "cards" && d.cards.length, 200);
  assert.equal(d.kind === "cards" && d.total, 250);
  const html = cardsHtml(d as Extract<typeof d, { kind: "cards" }>);
  assert.equal(html.match(/<article/g)?.length, 200);
  assert.match(html, /showing 200 of 250/);
});

test("CR11 no photo: placeholder, no <img>, no credit; a photo: credit, license deed and page links", () => {
  const none = display(CARDS, res(["id"], [[19]]), SPECIES);
  const noneHtml = cardsHtml(none as Extract<typeof none, { kind: "cards" }>);
  assert.match(noneHtml, /No photo yet/);
  assert.doesNotMatch(noneHtml, /<img/);
  assert.doesNotMatch(noneHtml, /Photo:/);

  const one = display(CARDS, res(["id"], [[1]]), SPECIES);
  const html = cardsHtml(one as Extract<typeof one, { kind: "cards" }>);
  assert.match(html, /<img [^>]*src="https:\/\/thumb\.wikimedia\.org\/1\.jpg"/);
  assert.match(html, /alt="Photo of Animal 1"/);
  assert.match(html, /Photo: Author &lt;1&gt;/); // credit text escaped
  assert.ok(html.includes(`href="${LICENSE_URLS["CC BY-SA 4.0"]}"`));
  assert.ok(html.includes('href="https://commons.wikimedia.org/wiki/File:1.jpg"'));
  assert.match(html, /<h3[^>]*>Animal 1<\/h3>/);
  assert.match(html, /<i>Genus species1<\/i>/);

  const pd = new Map([[1, { ...sp(1), photo_license: "Public domain" }]]);
  const pdD = display(CARDS, res(["id"], [[1]]), pd);
  assert.match(cardsHtml(pdD as Extract<typeof pdD, { kind: "cards" }>), /Public domain/);

  const bad = new Map([[1, { ...sp(1), photo_license: "CC BY-NC 4.0" }]]);
  const badD = display(CARDS, res(["id"], [[1]]), bad);
  assert.throws(() => cardsHtml(badD as Extract<typeof badD, { kind: "cards" }>), /unknown license "CC BY-NC 4.0"/);
});

test("CR12 other columns show as 'column: value', NULL as NULL", () => {
  const d = display(CARDS, res(["id", "country_code", "note", "common_name"], [[1, "BR", null, "Animal 1"]]), SPECIES);
  assert.equal(d.kind, "cards");
  assert.deepEqual(d.kind === "cards" && d.cards[0]!.extras, [
    ["country_code", "BR"],
    ["note", "NULL"],
  ]);
  const html = cardsHtml(d as Extract<typeof d, { kind: "cards" }>);
  assert.match(html, /country_code: BR/);
  assert.match(html, /note: NULL/);
});

test("CR13 a last statement that writes rows (INSERT, UPDATE, DELETE) reads as N rows changed; anything else doesn't", () => {
  const count = (n: unknown) => res(["Count"], [[n]]);
  assert.equal(rowsChanged("CREATE TABLE t (a INT); INSERT INTO t VALUES (1), (2)", count(2n)), 2);
  assert.equal(rowsChanged("-- note\nupdate t SET a = 1", count(5)), 5);
  assert.equal(rowsChanged("DELETE FROM t", count(0)), 0);
  assert.equal(rowsChanged("DELETE FROM t; SELECT count(*) AS Count FROM t", count(3)), null);
  assert.equal(rowsChanged("INSERT INTO t VALUES (1) RETURNING a", res(["a"], [[1]])), null);
  assert.equal(rowsChanged("SELECT 1", count(1)), null);
});

test("CR14 one row with one number is also a large count; anything else isn't", () => {
  assert.equal(countOf(res(["n"], [[42]])), 42);
  assert.equal(countOf(res(["n"], [[42n]])), 42);
  assert.equal(countOf(res(["n"], [["42"]])), null);
  assert.equal(countOf(res(["n", "m"], [[1, 2]])), null);
  assert.equal(countOf(res(["n"], [[1], [2]])), null);
});
