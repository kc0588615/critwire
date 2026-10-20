// COL rule tests (plan §5.2, §7). Failure modes first:
// C1: an exact or variant match of the same name is rejected (or a subgenus in usage.name, "Marmota (Petromarmota)
//     vancouverensis", blanks a valid species) → ids.col = usage.id + class/order/family/genus from usage.classification.
// C2: a variant with a different name (Zaglossus bruijnii → "Zaglossus bruijni"), a higherrank match (Chelonoidis
//     abingdonii → genus Chelonoidis), match false or a non-Animalia classification is accepted → ids.col null +
//     not-found (blocking), base taxonomy.
// C3: COL calls N a synonym (Tapirus bairdii → Tapirella bairdii) and its id or the accepted taxonomy is published →
//     ids.col null + identity naming the accepted name, base taxonomy.
// C4: one Wikidata P10585 value that differs from usage.id is ignored → identity, ids.col null, base taxonomy.
//     Several P10585 values (the multi-value entry is §5.1's) → ids.col still filled → null, base taxonomy, no 2nd entry.
// C5: a rank missing from the classification is published as undefined or fills from base silently → ids.col kept,
//     base taxonomy + not-found (blocking) on taxonomy.
// C6: COL's genus isn't N's first word but the taxonomy is used → identity, ids.col null, base taxonomy.
// C7: a rank differs from base and is silently replaced → COL's value + taxonomy-info (info) per differing rank.
// C8: an unknown ChecklistBank license string is mapped to something → throws.
// C9: provisionally accepted is rejected or passes unmarked → filled + status-info (info).
import assert from "node:assert/strict";
import { test } from "node:test";
import { colLicense, deriveCol } from "./col.ts";
import type { ColMatchResponse, ColTaxon } from "../raw.ts";
import type { BaseSpecies, Mismatch, Taxonomy } from "../species.ts";

const BASE_TAXONOMY: Taxonomy = { class: "Reptilia", order: "Testudines", family: "Emydidae", genus: "Emydoidea" };
function species(scientificName = "Emydoidea blandingii", taxonomy = BASE_TAXONOMY): BaseSpecies {
  return { id: 1, slug: "x", scientificName, commonName: "X", taxonomy, ids: { iucn: 7709 }, photo: null, replacedBy: null };
}

const taxon = (id: string, name: string, rank: string): ColTaxon => ({ id, name, rank, status: "accepted" });
// Emydoidea blandingii in COL26.10, trimmed: genus → family → superfamily → order → class → … → kingdom.
const HIGHER: ColTaxon[] = [
  taxon("4BDW", "Emydoidea", "genus"), taxon("9NR", "Emydidae", "family"), taxon("87BWY", "Testudinoidea", "superfamily"),
  taxon("477", "Testudines", "order"), taxon("RP", "Reptilia", "class"), taxon("CH2", "Chordata", "phylum"),
  taxon("N", "Animalia", "kingdom"),
];

function match(over: { type?: string; name?: string; rank?: string; status?: string; id?: string; classification?: ColTaxon[]; match?: boolean } = {}): ColMatchResponse {
  return {
    match: over.match ?? true,
    type: over.type ?? "variant",
    usage: {
      id: over.id ?? "39LSJ", name: over.name ?? "Emydoidea blandingii", rank: over.rank ?? "species",
      status: over.status ?? "accepted", parentId: "4BDW", classification: over.classification ?? HIGHER,
    },
  };
}

const kinds = (entries: Mismatch[]) => entries.map((e) => `${e.field}:${e.kind}:${e.severity}`).sort();
const withBase = (r: ReturnType<typeof deriveCol>) => {
  assert.equal(r.id, null);
  assert.deepEqual(r.taxonomy, BASE_TAXONOMY);
  assert.equal(r.taxonomySource, "base");
};

test("C1 exact or variant match of the same name (subgenus ignored) → id + COL taxonomy", () => {
  for (const type of ["exact", "variant"]) {
    const r = deriveCol(species(), match({ type }), []);
    assert.equal(r.id, "39LSJ");
    assert.deepEqual(r.taxonomy, BASE_TAXONOMY);
    assert.equal(r.taxonomySource, "col");
    assert.deepEqual(r.entries, []);
  }
  const marmot: Taxonomy = { class: "Mammalia", order: "Rodentia", family: "Sciuridae", genus: "Marmota" };
  const marmotHigher = [
    taxon("SG", "Petromarmota", "subgenus"), taxon("MG", "Marmota", "genus"), taxon("SC", "Sciuridae", "family"),
    taxon("RO", "Rodentia", "order"), taxon("MA", "Mammalia", "class"), taxon("N", "Animalia", "kingdom"),
  ];
  const r = deriveCol(species("Marmota vancouverensis", marmot), match({ id: "3Y84L", name: "Marmota (Petromarmota) vancouverensis", classification: marmotHigher }), ["3Y84L"]);
  assert.equal(r.id, "3Y84L");
  assert.deepEqual(r.taxonomy, marmot);
  assert.deepEqual(r.entries, []);
});

test("C2 different name, higherrank, no match or non-Animalia → not-found, base taxonomy", () => {
  const cases: [BaseSpecies, ColMatchResponse][] = [
    [species("Zaglossus bruijnii"), match({ name: "Zaglossus bruijni" })],
    [species("Chelonoidis abingdonii"), match({ type: "higherrank", name: "Chelonoidis", rank: "genus" })],
    [species(), match({ type: "none" })],
    [species(), match({ match: false })],
    [species(), { match: false }],
    [species(), match({ classification: HIGHER.map((t) => (t.rank === "kingdom" ? taxon("P", "Plantae", "kingdom") : t)) })],
  ];
  for (const [s, m] of cases) {
    const r = deriveCol(s, m, []);
    withBase(r);
    assert.deepEqual(kinds(r.entries), ["ids.col:not-found:blocking"], JSON.stringify(m.usage?.name));
  }
});

test("C3 COL synonym → identity naming the accepted name, base taxonomy", () => {
  const accepted = taxon("54TF2", "Tapirella bairdii", "species");
  const m = match({ id: "54TGH", name: "Tapirus bairdii", status: "synonym", classification: [accepted, taxon("7SPV", "Tapirella", "genus"), taxon("N", "Animalia", "kingdom")] });
  m.usage!.parentId = "54TF2";
  const r = deriveCol(species("Tapirus bairdii"), m, []);
  withBase(r);
  assert.deepEqual(kinds(r.entries), ["ids.col:identity:blocking"]);
  assert.match(r.entries[0].reason, /Tapirella bairdii/);
  assert.deepEqual(r.entries[0].values, { col: { id: "54TGH", status: "synonym", accepted: { id: "54TF2", name: "Tapirella bairdii" } } });
});

test("C4 one P10585 that differs → identity; several P10585 → null with no second entry", () => {
  const r = deriveCol(species(), match(), ["ZZZZ"]);
  withBase(r);
  assert.deepEqual(kinds(r.entries), ["ids.col:identity:blocking"]);
  assert.deepEqual(r.entries[0].values, { col: "39LSJ", wikidata: ["ZZZZ"] });
  assert.deepEqual(deriveCol(species(), match(), ["39LSJ"]).id, "39LSJ");
  const multi = deriveCol(species(), match(), ["39LSJ", "ZZZZ"]);
  withBase(multi);
  assert.deepEqual(multi.entries, []);
});

test("C5 a missing rank → ids.col kept, base taxonomy + not-found on taxonomy", () => {
  const r = deriveCol(species(), match({ classification: HIGHER.filter((t) => t.rank !== "order") }), []);
  assert.equal(r.id, "39LSJ");
  assert.deepEqual(r.taxonomy, BASE_TAXONOMY);
  assert.equal(r.taxonomySource, "base");
  assert.deepEqual(kinds(r.entries), ["taxonomy:not-found:blocking"]);
  assert.match(r.entries[0].reason, /order/);
});

test("C6 COL genus differs from the name's first word → identity", () => {
  const r = deriveCol(species(), match({ classification: HIGHER.map((t) => (t.rank === "genus" ? taxon("E", "Emys", "genus") : t)) }), []);
  withBase(r);
  assert.deepEqual(kinds(r.entries), ["ids.col:identity:blocking"]);
  assert.match(r.entries[0].reason, /Emys/);
});

test("C7 a rank that differs from base → COL value + taxonomy-info per rank", () => {
  const old: Taxonomy = { ...BASE_TAXONOMY, class: "Testudines", family: "Emydidae " };
  const r = deriveCol(species("Emydoidea blandingii", old), match(), []);
  assert.equal(r.id, "39LSJ");
  assert.deepEqual(r.taxonomy, BASE_TAXONOMY);
  assert.equal(r.taxonomySource, "col");
  assert.deepEqual(kinds(r.entries), ["taxonomy.class:taxonomy-info:info", "taxonomy.family:taxonomy-info:info"]);
  assert.deepEqual(r.entries.find((e) => e.field === "taxonomy.class")!.values, { base: "Testudines", col: "Reptilia" });
});

test("C8 unknown COL license → throws", () => {
  assert.equal(colLicense("cc by"), "CC BY 4.0");
  for (const l of ["cc by-nc", "cc0", "", "CC BY 3.0"]) assert.throws(() => colLicense(l), /license/);
});

test("C9 provisionally accepted → filled + status-info", () => {
  const r = deriveCol(species(), match({ status: "provisionally accepted" }), []);
  assert.equal(r.id, "39LSJ");
  assert.equal(r.taxonomySource, "col");
  assert.deepEqual(kinds(r.entries), ["ids.col:status-info:info"]);
  assert.deepEqual(r.entries[0].values, { col: { status: "provisionally accepted" } });
});
