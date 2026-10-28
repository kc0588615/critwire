// validateRecords tests (plan D12, MF2): the one record value validator, run by derive (so build, register, ingest) and
// db:load. Written before the code, seen failing first. Failure modes:
// V1: an empty or blank string anywhere in a record (a name, a taxon, a source field) → published as if it were a value.
// V2: a slug outside ^[a-z0-9]+(-[a-z0-9]+)*$, or all digits → a path outside species/, a broken URL or an {id}.json
//     collision.
// V3: id, ids.iucn, ids.inaturalist, ids.ncbi (or a COL release key) not an integer in 1..2^31−1 → fails late in
//     DuckDB's INTEGER writer, or publishes 0/negative/fractional ids.
// V4: ids.gbif not a positive safe integer (BIGINT) → silently rounded in JSON.
// V5: countries and status disagree (a list without ok, ok without a list), [] , an unsorted, duplicated or non-ISO
//     code, or an unknown status → published.
// V6: a photo missing one of url, credit, license, page → published uncredited.
// V7: replacedBy [] , pointing to a missing id, to itself, or naming one id twice → published.
// V8: replacedBy forming a cycle → no record is the live one.
// V9: two records with the same id or slug → one file overwrites the other.
// V10: Wikidata's P3151/P685 above int32 or P846 above a safe integer → Number() accepts it and DuckDB fails late.
// Issued ids (data/issued-ids.json: every {id, slug} ever derived):
// V11: an issued id no record has (removed instead of retired) → its /v1/species/{id}.json and slug URL vanish.
// V12: an issued id under another slug → the old slug URL vanishes or points elsewhere.
// V13: a record taking an issued slug under another id → the slug URL silently changes species.
// V14: a retired record (replacedBy) keeps its pair → must pass, not count as gone.
// V15: derive's issued ids drop a pair, or come out unsorted → history lost or a byte diff every run.
// V16: no data/issued-ids.json yet → the first derive must write today's pairs, not refuse.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { deriveCore, readCoreInputs } from "./derive/pipeline.ts";
import { deriveWikidata } from "./derive/wikidata.ts";
import { issuedIdsFile, speciesFile, validateRecords, type BaseSpecies, type IssuedId, type Species } from "./species.ts";
import type { SparqlBinding } from "./raw.ts";

function rec(id: number, slug = `species-${id}`): Species {
  return {
    id, slug, scientificName: `Genus species${id}`, commonName: `Species ${id}`,
    taxonomy: { class: "Reptilia", order: "Testudines", family: "Emydidae", genus: "Genus" },
    ids: { iucn: 7709 + id, gbif: 2442885, col: "39LSJ", wikidata: "Q185526", inaturalist: 39885, ncbi: 8487 },
    range: { countriesWithOpenRecords: ["CA", "US"], status: "ok" },
    photo: { url: "https://example.org/p.jpg", credit: "Andrew C", license: "CC BY 2.0", page: "https://example.org/p" },
    sources: [{ source: "Wikidata", fields: ["ids.wikidata"], license: "CC0 1.0", url: "https://www.wikidata.org/wiki/Q185526",
      release: { key: 316595, alias: "COL26.10", version: "2026-10-14", issued: "2026-10-14" } }],
    replacedBy: null,
  };
}
// Three valid records, the second changed by edit; asserts validateRecords (given issued) throws matching re.
function refuses(edit: (r: Species, all: Species[]) => void, re: RegExp, label?: string, issued: IssuedId[] = []): void {
  const all = [rec(1), rec(2), rec(3)];
  edit(all[1]!, all);
  assert.throws(() => validateRecords(all, issued), re, label);
}
const passes = (edit: (r: Species, all: Species[]) => void, issued: IssuedId[] = []) => {
  const all = [rec(1), rec(2), rec(3)];
  edit(all[1]!, all);
  assert.doesNotThrow(() => validateRecords(all, issued));
};
const pairs = (...ids: number[]): IssuedId[] => ids.map((id) => ({ id, slug: `species-${id}` }));
const readJsonSync = <T>(file: URL): T => JSON.parse(readFileSync(file, "utf8")) as T;

test("V0 valid records and the committed data/species.json pass", () => {
  passes(() => {});
  passes((r) => { r.ids = { ...r.ids, gbif: null, col: null, wikidata: null, inaturalist: null, ncbi: null }; r.photo = null; });
  passes((r) => { r.range = { countriesWithOpenRecords: null, status: "no-open-records" }; });
  passes((r) => { r.range = { countriesWithOpenRecords: null, status: "identity-unsettled" }; });
  assert.doesNotThrow(() => validateRecords(readJsonSync<Species[]>(speciesFile), readJsonSync<IssuedId[]>(issuedIdsFile)));
});

test("V1 an empty or blank string anywhere refuses, naming the species and path", () => {
  refuses((r) => { r.commonName = ""; }, /species 2: commonName/);
  refuses((r) => { r.scientificName = "  "; }, /species 2: scientificName/);
  refuses((r) => { r.taxonomy.family = ""; }, /species 2: taxonomy\.family/);
  refuses((r) => { r.ids.col = ""; }, /species 2: ids\.col/);
  refuses((r) => { r.sources[0]!.fields = [""]; }, /species 2: sources\[0\]\.fields\[0\]/);
  refuses((r) => { r.sources[0]!.release!.alias = " "; }, /species 2: sources\[0\]\.release\.alias/);
  refuses((r) => { (r as unknown as Record<string, unknown>).commonName = 7; }, /species 2: commonName/);
});

test("V2 a slug outside the grammar, or all digits, refuses", () => {
  for (const slug of ["Blandings", "a--b", "-a", "a-", "a_b", "a b", "../x", "a/b", "", "123"]) {
    refuses((r) => { r.slug = slug; }, /species 2: slug/, slug);
  }
  passes((r) => { r.slug = "a1-b2-3c"; });
});

test("V3 ids outside 1..2^31−1 refuse (id, iucn, inaturalist, ncbi, COL release key)", () => {
  const bad = [0, -1, 1.5, 2 ** 31, Number.NaN, "5", null];
  for (const v of bad) {
    refuses((r) => { (r as { id: unknown }).id = v; }, /species .*: id/, `id ${String(v)}`);
    refuses((r) => { (r.ids as Record<string, unknown>).iucn = v; }, /species 2: ids\.iucn/, `iucn ${String(v)}`);
    refuses((r) => { r.sources[0]!.release!.key = v as number; }, /species 2: sources\[0\]\.release\.key/, `key ${String(v)}`);
  }
  for (const field of ["inaturalist", "ncbi"] as const) {
    for (const v of bad.filter((x) => x !== null)) refuses((r) => { (r.ids as Record<string, unknown>)[field] = v; }, new RegExp(`species 2: ids\\.${field}`), `${field} ${String(v)}`);
    passes((r) => { r.ids[field] = 2 ** 31 - 1; });
  }
});

test("V4 ids.gbif not a positive safe integer refuses", () => {
  for (const v of [0, -1, 1.5, 2 ** 53, "2442885"]) refuses((r) => { (r.ids as Record<string, unknown>).gbif = v; }, /species 2: ids\.gbif/, String(v));
  passes((r) => { r.ids.gbif = 2 ** 53 - 1; });
});

test("V5 countries and range.status must agree; the list non-empty, sorted, unique, ISO alpha-2", () => {
  refuses((r) => { r.range.countriesWithOpenRecords = null; }, /species 2: range/);
  refuses((r) => { r.range.status = "no-open-records"; }, /species 2: range/);
  refuses((r) => { r.range.countriesWithOpenRecords = []; }, /species 2: range/);
  refuses((r) => { r.range.countriesWithOpenRecords = ["US", "CA"]; }, /species 2: range/);
  refuses((r) => { r.range.countriesWithOpenRecords = ["CA", "CA"]; }, /species 2: range/);
  for (const c of ["us", "USA", "U1"]) refuses((r) => { r.range.countriesWithOpenRecords = [c]; }, /species 2: range/, c);
  refuses((r) => { (r.range as { status: string }).status = "native"; r.range.countriesWithOpenRecords = null; }, /species 2: range\.status/);
});

test("V6 a photo missing a field refuses", () => {
  for (const k of ["url", "credit", "license", "page"] as const) {
    refuses((r) => { r.photo = { ...r.photo!, [k]: "" }; }, /species 2: photo/, k);
    refuses((r) => { const p = { ...r.photo! } as Record<string, unknown>; p[k] = null; r.photo = p as unknown as Species["photo"]; }, /species 2: photo/, k);
  }
});

test("V7 replacedBy: [] , a missing target, itself, or a repeated id refuses", () => {
  refuses((r) => { r.replacedBy = []; }, /species 2: replacedBy/);
  refuses((r) => { r.replacedBy = [9]; }, /species 2: replacedBy.*9/);
  refuses((r) => { r.replacedBy = [2]; }, /species 2: replacedBy.*itself/);
  refuses((r) => { r.replacedBy = [3, 3]; }, /species 2: replacedBy/);
  passes((r) => { r.replacedBy = [1, 3]; });
});

test("V8 a replacedBy cycle refuses; a chain passes", () => {
  refuses((r, all) => { r.replacedBy = [3]; all[2]!.replacedBy = [2]; }, /replacedBy.*cycle/);
  refuses((r, all) => { r.replacedBy = [3]; all[2]!.replacedBy = [1]; all[0]!.replacedBy = [2]; }, /replacedBy.*cycle/);
  passes((r, all) => { r.replacedBy = [3]; all[2]!.replacedBy = [1]; });
});

test("V9 a repeated id or slug refuses", () => {
  refuses((r) => { r.id = 1; }, /id 1/);
  refuses((r) => { r.slug = "species-1"; }, /slug species-1/);
});

test("V10 Wikidata P3151/P685 above int32 and P846 above a safe integer throw", () => {
  const N = "Rafetus swinhoei";
  const base: BaseSpecies = { id: 18, slug: "x", scientificName: N, commonName: "X",
    taxonomy: { class: "Reptilia", order: "Testudines", family: "Trionychidae", genus: "Rafetus" }, ids: { iucn: 22971 }, photo: null, replacedBy: null };
  const lit = (value: string) => ({ type: "literal", value });
  const rows = (prop: string, value: string): SparqlBinding[] =>
    [{ name: lit(N), item: { type: "uri", value: "http://www.wikidata.org/entity/Q1075096" }, prop: lit(prop), value: lit(value) }];
  for (const prop of ["P3151", "P685"]) {
    assert.throws(() => deriveWikidata(base, rows(prop, "2147483648")), new RegExp(`${prop}.*2147483648`), prop);
    assert.doesNotThrow(() => deriveWikidata(base, rows(prop, "2147483647")), prop);
  }
  assert.throws(() => deriveWikidata(base, rows("P846", "9007199254740992")), /P846.*9007199254740992/);
  assert.doesNotThrow(() => deriveWikidata(base, rows("P846", "2147483648")));
});

test("V11 an issued id no record has refuses, naming it and its slug", () => {
  refuses(() => {}, /issued id 9 \(species-9\) is gone/, undefined, pairs(1, 2, 3, 9));
  refuses((_, all) => { all.splice(1, 1); }, /issued id 2 \(species-2\) is gone/, undefined, pairs(1, 2, 3));
});

test("V12 an issued id under another slug refuses", () => {
  refuses((r) => { r.slug = "renamed"; }, /species 2: slug renamed, but id 2 was issued as species-2/, undefined, pairs(1, 2, 3));
});

test("V13 a record taking an issued slug under another id refuses", () => {
  refuses((r) => { r.slug = "old-name"; }, /species 2: slug old-name was issued to id 7/, undefined, [...pairs(1), { id: 7, slug: "old-name" }]);
});

test("V14 a retired record keeps its pair and passes; issued ids are a subset of the records", () => {
  passes((r) => { r.replacedBy = [3]; }, pairs(1, 2, 3));
  passes(() => {}, pairs(2));
  passes(() => {}, []);
});

test("V15 derive's issued ids are the union, sorted by id, and drop no pair", async () => {
  const real = await readCoreInputs();
  const all = deriveCore(real).records.map(({ id, slug }) => ({ id, slug }));
  assert.ok(all.length >= 76);
  const older = all.filter((_, i) => i % 3 === 0).reverse();
  assert.deepEqual(deriveCore({ ...real, issuedIds: older }).issuedIds, all);
  assert.throws(() => deriveCore({ ...real, issuedIds: [...all, { id: 999_999, slug: "gone-species" }] }), /issued id 999999 \(gone-species\) is gone/);
  const removed = all[5]!;
  assert.throws(() => deriveCore({ ...real, base: real.base.filter((s) => s.id !== removed.id), issuedIds: all }), /is stale|is gone/);
});

test("V16 with no data/issued-ids.json the first derive writes every record's pair", async () => {
  const real = await readCoreInputs();
  const { records, issuedIds } = deriveCore({ ...real, issuedIds: null });
  assert.deepEqual(issuedIds, records.map(({ id, slug }) => ({ id, slug })));
  assert.deepEqual(Object.keys(issuedIds[0]!), ["id", "slug"]);
});
