// Wikidata rule tests (plan §5.1, §7). Failure modes first:
// W1: no item for the name → ids filled from nothing or nothing explained → wikidata, inaturalist, ncbi null + one
//     not-found (blocking) entry on ids.wikidata.
// W2: two items for the name → one picked arbitrarily → the three ids null + one multi-value (blocking) on ids.wikidata.
// W3: two P3151 values (Ailurus) → one picked → ids.inaturalist null + multi-value; the other ids still filled.
//     A missing P3151 or P685 on the item → not-found (info).
// W4: the item's single P627 differs from base → base silently replaced or nothing said → iucn-id (blocking), base kept.
// W5: the base id is P627 of another taxon's item (Rafetus swinhoei 22971 → Vidumelon wattii) → that item used for an
//     id, or not reported → iucn-id naming it; its values never reach any id.
// W6: a P3151, P685 or P846 value that isn't a positive integer, or an item that isn't a Q-id → silently passed → throws.
// W7: raw query differs from wikidataQuery(base) (base renamed or query changed) → stale raw used → throws naming
//     `pnpm ingest wikidata`.
// W8: P846 = {usageKey, acceptedKey} → treated as compatible → multi-value on ids.gbif; both values handed on so the
//     GBIF rule nulls ids.gbif (and with it the countries).
// W9: two P10585 values → one picked → multi-value on ids.col; both handed on so the COL rule keeps base taxonomy.
// W10: two items with different P846 → only one item's values checked → pooled → multi-value on ids.gbif; two items
//     with the same single P846 → that one value handed on for the cross-check.
// W11: wikidataQuery with a null or non-integer ids.iucn → throws (an unbound ?iucn joins every item with a P627).
import assert from "node:assert/strict";
import { test } from "node:test";
import { wikidataQuery } from "../ingest/wikidata.ts";
import { assertWikidataFresh, bindingsByName, deriveWikidata } from "./wikidata.ts";
import type { SparqlBinding, WikidataSnapshot } from "../raw.ts";
import type { BaseSpecies, Mismatch } from "../species.ts";

function base(iucn: unknown, scientificName = "Emydoidea blandingii"): BaseSpecies {
  return {
    id: 1, slug: "x", scientificName, commonName: "X",
    taxonomy: { class: "Reptilia", order: "Testudines", family: "Emydidae", genus: "Emydoidea" },
    ids: { iucn } as BaseSpecies["ids"], photo: null, replacedBy: null,
  };
}

test("W11 wikidataQuery throws on a null or non-integer ids.iucn", () => {
  for (const iucn of [null, undefined, 0, -3, 1.5, "7709"]) {
    assert.throws(() => wikidataQuery([base(iucn)]), /ids\.iucn/, `iucn ${String(iucn)}`);
  }
  assert.match(wikidataQuery([base(7709)]), /\("Emydoidea blandingii" "7709"\)/);
});

const N = "Rafetus swinhoei";
const SPECIES = { ...base(22971, N), id: 18 };
const Q = (n: number) => `http://www.wikidata.org/entity/Q${n}`;
const lit = (value: string) => ({ type: "literal", value });
const uri = (value: string) => ({ type: "uri", value });

// Rows as the query returns them: item rows (one per property value, or bare) and iucnItem rows.
function rows(items: Record<number, Record<string, string[]>>, iucnItems: Record<number, string | null> = {}): SparqlBinding[] {
  const out: SparqlBinding[] = [];
  for (const [q, props] of Object.entries(items)) {
    const vals = Object.entries(props).flatMap(([prop, vs]) => vs.map((v) => ({ prop: lit(prop), value: lit(v) })));
    for (const pv of vals.length ? vals : [{}]) out.push({ name: lit(N), item: uri(Q(Number(q))), ...pv });
  }
  for (const [q, name] of Object.entries(iucnItems)) {
    out.push({ name: lit(N), iucnItem: uri(Q(Number(q))), ...(name === null ? {} : { iucnItemName: lit(name) }) });
  }
  return out;
}

const FULL = { P627: ["22971"], P846: ["2442647"], P10585: ["793TZ"], P3151: ["39569"], P685: ["904230"] };
const HOME = { 1075096: N }; // base id resolves to the species' own item
const kinds = (entries: Mismatch[]) => entries.map((e) => `${e.field}:${e.kind}:${e.severity}`).sort();

test("W1 no item → three nulls + one not-found on ids.wikidata", () => {
  const r = deriveWikidata(SPECIES, rows({}, HOME));
  assert.deepEqual(r.ids, { wikidata: null, inaturalist: null, ncbi: null });
  assert.deepEqual(kinds(r.entries), ["ids.wikidata:not-found:blocking"]);
  assert.deepEqual([r.p846, r.p10585], [[], []]);
  assert.equal(r.entries[0].speciesId, 18);
});

test("W2 two items → three nulls + one multi-value on ids.wikidata", () => {
  const r = deriveWikidata(SPECIES, rows({ 1075096: FULL, 999: { P3151: ["1"] } }, HOME));
  assert.deepEqual(r.ids, { wikidata: null, inaturalist: null, ncbi: null });
  assert.deepEqual(kinds(r.entries), ["ids.wikidata:multi-value:blocking"]);
  assert.deepEqual(r.entries[0].values, { wikidata: ["Q1075096", "Q999"] });
});

test("W3 two P3151 values → inaturalist null + multi-value, others filled; missing P3151/P685 → not-found info", () => {
  const r = deriveWikidata(SPECIES, rows({ 1075096: { ...FULL, P3151: ["418148", "41653"] } }, HOME));
  assert.deepEqual(r.ids, { wikidata: "Q1075096", inaturalist: null, ncbi: 904230 });
  assert.deepEqual(kinds(r.entries), ["ids.inaturalist:multi-value:blocking"]);
  assert.deepEqual(r.entries[0].values, { wikidata: ["41653", "418148"] });

  const bare = deriveWikidata(SPECIES, rows({ 1075096: { P627: ["22971"] } }, HOME));
  assert.deepEqual(bare.ids, { wikidata: "Q1075096", inaturalist: null, ncbi: null });
  assert.deepEqual(kinds(bare.entries), ["ids.inaturalist:not-found:info", "ids.ncbi:not-found:info"]);

  const ok = deriveWikidata(SPECIES, rows({ 1075096: FULL }, HOME));
  assert.deepEqual(ok.ids, { wikidata: "Q1075096", inaturalist: 39569, ncbi: 904230 });
  assert.deepEqual(ok.entries, []);
  assert.deepEqual([ok.p846, ok.p10585], [[2442647], ["793TZ"]]);
});

test("W4 the item's P627 differs from base → iucn-id, base kept", () => {
  const r = deriveWikidata(SPECIES, rows({ 1075096: { ...FULL, P627: ["39621"] } }));
  assert.deepEqual(kinds(r.entries), ["ids.iucn:iucn-id:blocking"]);
  assert.deepEqual(r.entries[0].values, { base: 22971, wikidata: ["39621"] });
  assert.match(r.entries[0].reason, /39621/);
  assert.match(r.entries[0].reason, /Kept 22971/);
  assert.equal("iucn" in r.ids, false);
  // No P627 on the item and the base id on no item: nothing to say.
  assert.deepEqual(deriveWikidata(SPECIES, rows({ 1075096: { ...FULL, P627: [] } })).entries, []);
});

test("W5 base id on another taxon's item → iucn-id naming it; its values used for nothing", () => {
  const r = deriveWikidata(SPECIES, rows({ 1075096: { ...FULL, P627: ["39621"] } }, { 3074062: "Vidumelon wattii", 5: null }));
  assert.deepEqual(kinds(r.entries), ["ids.iucn:iucn-id:blocking"]);
  assert.deepEqual(r.entries[0].values, {
    base: 22971, wikidata: ["39621"], wikidataItemsWithBaseId: { Q3074062: "Vidumelon wattii", Q5: null },
  });
  assert.match(r.entries[0].reason, /Q3074062 \(Vidumelon wattii\)/);
  assert.equal(r.ids.wikidata, "Q1075096");
  // Checked whatever P627's cardinality: no P627, and two P627 values (then multi-value too).
  const none = deriveWikidata(SPECIES, rows({ 1075096: { ...FULL, P627: [] } }, { 3074062: "Vidumelon wattii" }));
  assert.deepEqual(kinds(none.entries), ["ids.iucn:iucn-id:blocking"]);
  const two = deriveWikidata(SPECIES, rows({ 1075096: { ...FULL, P627: ["22971", "39621"] } }, { 3074062: "Vidumelon wattii" }));
  assert.deepEqual(kinds(two.entries), ["ids.iucn:iucn-id:blocking", "ids.iucn:multi-value:blocking"]);
  // Two P627 values with the base id only on our own item: multi-value only.
  const own = deriveWikidata(SPECIES, rows({ 1075096: { ...FULL, P627: ["22971", "39621"] } }, HOME));
  assert.deepEqual(kinds(own.entries), ["ids.iucn:multi-value:blocking"]);
  // With no item at all, a foreign base-id item is still reported (next to not-found).
  assert.deepEqual(kinds(deriveWikidata(SPECIES, rows({}, { 3074062: "Vidumelon wattii" })).entries),
    ["ids.iucn:iucn-id:blocking", "ids.wikidata:not-found:blocking"]);
});

test("W6 a non-integer P3151, P685 or P846, or a non-Q item, throws", () => {
  for (const prop of ["P3151", "P685", "P846"]) {
    for (const bad of ["abc", "12a", "0", "-4", "1.5"]) {
      assert.throws(() => deriveWikidata(SPECIES, rows({ 1075096: { ...FULL, [prop]: [bad] } })), new RegExp(prop), `${prop} ${bad}`);
    }
  }
  const odd: SparqlBinding[] = [{ name: lit(N), item: uri("http://www.wikidata.org/entity/P225") }];
  assert.throws(() => deriveWikidata(SPECIES, odd), /item/);
});

test("W7 stale raw query throws naming pnpm ingest wikidata", () => {
  const b = [SPECIES];
  const snapshot = (query: string): WikidataSnapshot => ({
    retrieved: "2026-10-20", endpoint: "x", query, response: { head: { vars: [] }, results: { bindings: [] } },
  });
  assert.doesNotThrow(() => assertWikidataFresh(snapshot(wikidataQuery(b)), b));
  assert.throws(() => assertWikidataFresh(snapshot(wikidataQuery([{ ...SPECIES, scientificName: "Rafetus leloii" }])), b), /stale.*pnpm ingest wikidata/);
  assert.throws(() => assertWikidataFresh(snapshot(wikidataQuery(b) + " "), b), /pnpm ingest wikidata/);
  // bindingsByName groups rows by ?name.
  const g = bindingsByName(snapshot(""));
  assert.equal(g.size, 0);
  const s2 = { ...snapshot(""), response: { head: { vars: [] }, results: { bindings: [...rows({ 1: {} }), { name: lit("Other x") }] } } };
  assert.deepEqual([...bindingsByName(s2).keys()].sort(), ["Other x", N]);
});

test("W8 P846 = {usageKey, acceptedKey} → multi-value on ids.gbif, both values handed on", () => {
  const r = deriveWikidata(SPECIES, rows({ 1075096: { ...FULL, P846: ["5220530", "2442885"] } }, HOME));
  assert.deepEqual(kinds(r.entries), ["ids.gbif:multi-value:blocking"]);
  assert.deepEqual(r.entries[0].values, { wikidata: [2442885, 5220530] });
  assert.deepEqual(r.p846, [2442885, 5220530]);
  assert.equal(r.ids.wikidata, "Q1075096");
});

test("W9 two P10585 values → multi-value on ids.col, both values handed on", () => {
  const r = deriveWikidata(SPECIES, rows({ 1075096: { ...FULL, P10585: ["793TZ", "4JZ39"] } }, HOME));
  assert.deepEqual(kinds(r.entries), ["ids.col:multi-value:blocking"]);
  assert.deepEqual(r.entries[0].values, { wikidata: ["4JZ39", "793TZ"] });
  assert.deepEqual(r.p10585, ["4JZ39", "793TZ"]);
});

test("W10 two items pool their values for P846/P10585/P627", () => {
  const diff = deriveWikidata(SPECIES, rows({ 1075096: FULL, 999: { P846: ["111"] } }, HOME));
  assert.deepEqual(kinds(diff.entries), ["ids.gbif:multi-value:blocking", "ids.wikidata:multi-value:blocking"]);
  assert.deepEqual(diff.p846, [111, 2442647]);
  const same = deriveWikidata(SPECIES, rows({ 1075096: FULL, 999: { P846: ["2442647"], P10585: ["793TZ"] } }, HOME));
  assert.deepEqual(kinds(same.entries), ["ids.wikidata:multi-value:blocking"]);
  assert.deepEqual([same.p846, same.p10585], [[2442647], ["793TZ"]]);
  // A conflicting P627 on the second item is not hidden.
  const iucn = deriveWikidata(SPECIES, rows({ 1075096: FULL, 999: { P627: ["39621"] } }, HOME));
  assert.deepEqual(kinds(iucn.entries), ["ids.iucn:multi-value:blocking", "ids.wikidata:multi-value:blocking"]);
});
