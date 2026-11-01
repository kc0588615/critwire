// S2 (L3 plan §7.1; review item 3, Astra MUST-FIX 2): the /v1 contract check, pure. Written before the code, seen
// failing first. Failure modes: a /v1 field or CSV column is removed, retyped or reordered; a definition (meaning,
// unit, namespace, declared nullability) changes without the owner's review; a declared non-null field, a list
// element or a closed value set breaks in the data; an id from another namespace (a GBIF id from another checklist)
// is published as if it were the same. Additions pass with a notice.
// Third table, /v1/range-listings (native ranges plan, F8): a column removed or retyped; the CSV reordered; a sha that
// differs; origin, presence or license off values; country off pattern; a null in a non-null column passes, or a null
// area or doi fails.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import type { Columns } from "./columns.ts";
import { checkV1Contract, type V1Contract, type V1Inputs } from "./contract.ts";

// The test's own sha (not the code's): 12 hex of sha256 over the entry without sha, keys sorted, 2-space JSON + newline.
type Draft = Record<string, unknown>;
const sha = (e: Draft) => createHash("sha256").update(JSON.stringify(Object.fromEntries(Object.entries(e).sort()), null, 2) + "\n").digest("hex").slice(0, 12);
const frozen = (entries: Record<string, Draft>) => Object.fromEntries(Object.entries(entries).map(([p, e]) => [p, { ...e, sha: sha(e) }]));

const CHECKLIST = "d7dddbf4-2cf0-4f39-9b2a-bb099caae36c";
const SPECIES: Record<string, Draft> = {
  id: { type: "INTEGER", null: false, means: "our id" },
  ids: { type: "STRUCT", null: false, means: "outside ids" },
  "ids.gbif": { type: "BIGINT", null: true, means: "GBIF backbone key", source: "GBIF Backbone Taxonomy", checklistKey: CHECKLIST },
  range: { type: "STRUCT", null: false, means: "where recorded" },
  "range.countries": { type: "VARCHAR[]", null: true, means: "ISO codes", pattern: "^[A-Z]{2}$", source: "GBIF.org occurrence search" },
  "range.status": { type: "VARCHAR", null: false, means: "why", values: ["ok", "none"] },
  photo: { type: "STRUCT", null: true, means: "a photo" },
  "photo.url": { type: "VARCHAR", null: false, means: "the file" },
  sources: { type: "STRUCT[]", null: false, means: "citations" },
  "sources[].source": { type: "VARCHAR", null: false, means: "name" },
  "sources[].fields": { type: "VARCHAR[]", null: false, means: "fields" },
  "sources[].checklistKey": { type: "VARCHAR", null: true, means: "GBIF checklist" },
};
const COUNTRIES: Record<string, Draft> = {
  code: { type: "VARCHAR", null: false, means: "ISO code", pattern: "^[A-Z]{2}$" },
  region: { type: "VARCHAR", null: false, means: "UN region", values: ["Africa", "Americas"] },
};
const RANGE_LISTINGS: Record<string, Draft> = {
  speciesId: { type: "INTEGER", null: false, means: "our id" },
  country: { type: "VARCHAR", null: false, means: "ISO code", pattern: "^[A-Z]{2}$" },
  area: { type: "VARCHAR", null: true, means: "narrower scope" },
  origin: { type: "VARCHAR", null: false, means: "how it came", values: ["native", "introduced"] },
  presence: { type: "VARCHAR", null: false, means: "there or not", values: ["present", "absent"] },
  license: { type: "VARCHAR", null: false, means: "row license", values: ["CC0 1.0", "CC BY 4.0"] },
  doi: { type: "VARCHAR", null: true, means: "a DOI" },
};
const contract = (over: Partial<V1Contract> = {}): V1Contract => ({
  species: frozen(SPECIES) as V1Contract["species"],
  countries: frozen(COUNTRIES) as V1Contract["countries"],
  rangeListings: frozen(RANGE_LISTINGS) as V1Contract["rangeListings"],
  speciesCsv: ["id", "ids_gbif", "range_countries", "range_status", "photo_url"],
  countriesCsv: ["code", "region"],
  rangeListingsCsv: ["species_id", "country", "area", "origin", "presence", "license", "doi"],
  ...over,
});

const gbif = { source: "GBIF Backbone Taxonomy", fields: ["ids.gbif"], checklistKey: CHECKLIST };
const occ = { source: "GBIF.org occurrence search", fields: ["range.countries"] };
const record = (id: number, over: Record<string, unknown> = {}) => ({
  id, ids: { gbif: 100 + id }, range: { countries: ["BR", "CR"], status: "ok" }, photo: { url: "https://x/y.jpg" },
  sources: [gbif, occ], ...over,
});
const listing = (over: Record<string, unknown> = {}) => ({
  speciesId: 1, country: "NA", area: "Hawaii", origin: "native", presence: "present", license: "CC BY 4.0", doi: "10.1/x", ...over,
});
const LISTING_COLUMNS = { speciesId: "INTEGER", country: "VARCHAR", area: "VARCHAR", origin: "VARCHAR", presence: "VARCHAR", license: "VARCHAR", doi: "VARCHAR" };
const inputs = (over: Partial<V1Inputs> = {}): V1Inputs => ({
  recordColumns: {
    id: "INTEGER",
    ids: { gbif: "BIGINT" },
    range: { countries: "VARCHAR[]", status: "VARCHAR" },
    photo: { url: "VARCHAR" },
    sources: [{ source: "VARCHAR", fields: "VARCHAR[]", checklistKey: "VARCHAR" }],
  },
  csvColumns: ["id", "ids_gbif", "range_countries", "range_status", "photo_url"],
  countryColumns: { code: "VARCHAR", region: "VARCHAR" },
  species: [record(1), record(2)],
  countries: [{ code: "BR", region: "Americas" }, { code: "NA", region: "Africa" }],
  rangeListingColumns: LISTING_COLUMNS,
  rangeListingCsv: ["species_id", "country", "area", "origin", "presence", "license", "doi"],
  rangeListings: [listing()],
  ...over,
});

const V2 = /needs \/v2 \(plan 001, Access\)/;
// Exactly one problem, naming its place and its change; no additions.
function fails(result: ReturnType<typeof checkV1Contract>, where: RegExp, change: RegExp) {
  assert.equal(result.problems.length, 1, result.problems.join("\n"));
  const [p] = result.problems;
  assert.match(p, where);
  assert.match(p, change);
  return p;
}
// Some problem names its place and its change (a change that also breaks another check).
function has(result: ReturnType<typeof checkV1Contract>, where: RegExp, change: RegExp) {
  assert.ok(result.problems.some((p) => where.test(p) && change.test(p)), result.problems.join("\n"));
}

test("V1 the frozen contract, its writers and its data pass with nothing to report", () => {
  assert.deepEqual(checkV1Contract(contract(), inputs()), { problems: [], additions: [] });
});

test("V2 a contract path or column the writer lacks is a removal", () => {
  const { ids: _, ...noIds } = inputs().recordColumns;
  fails(checkV1Contract(contract(), inputs({ recordColumns: { ...noIds, ids: {} } })), /^\/v1\/species ids\.gbif: /, /removed.*needs \/v2 \(plan 001, Access\)$/);
  has(checkV1Contract(contract(), inputs({ countryColumns: { code: "VARCHAR" }, countries: [{ code: "BR" }] })), /^\/v1\/countries region: /, /removed.*needs \/v2/);
});

test("V3 a changed type fails, group shapes included", () => {
  const cols = inputs().recordColumns;
  fails(checkV1Contract(contract(), inputs({ recordColumns: { ...cols, ids: { gbif: "INTEGER" } } })), /^\/v1\/species ids\.gbif: /, /BIGINT → INTEGER.*needs \/v2/);
  fails(checkV1Contract(contract(), inputs({ countryColumns: { code: "VARCHAR", region: "VARCHAR[]" } })), /^\/v1\/countries region: /, /VARCHAR → VARCHAR\[\].*needs \/v2/);
  has(checkV1Contract(contract(), inputs({ recordColumns: { ...cols, photo: "VARCHAR" } as never })), /^\/v1\/species photo: /, /STRUCT → VARCHAR/);
});

test("V4 a contract CSV list that isn't a prefix of the writer's fails (reorder, removal)", () => {
  fails(checkV1Contract(contract(), inputs({ csvColumns: ["id", "range_countries", "ids_gbif", "range_status", "photo_url"] })), /^\/v1\/species\.csv: /, /not a prefix.*needs \/v2/);
  fails(checkV1Contract(contract(), inputs({ csvColumns: ["id", "ids_gbif", "range_countries", "range_status"] })), /^\/v1\/species\.csv: /, V2);
  fails(checkV1Contract(contract({ countriesCsv: ["region", "code"] }), inputs()), /^\/v1\/countries\.csv: /, V2);
});

test("V5 an entry whose sha doesn't match its content fails with the review hint; a missing sha prints its value", () => {
  const c = contract();
  const edited = { ...SPECIES["ids.gbif"], means: "GBIF key, any checklist" };
  c.species["ids.gbif"] = { ...c.species["ids.gbif"], means: "GBIF key, any checklist" };
  const p = fails(checkV1Contract(c, inputs()), /^\/v1\/species ids\.gbif: /, /definition changed.*needs \/v2/);
  assert.ok(p.includes(`set sha to ${sha(edited)} in the commit that records the review under Decisions`), p);

  const n = contract();
  n.countries.region = { ...n.countries.region, null: true };
  fails(checkV1Contract(n, inputs()), /^\/v1\/countries region: /, /definition changed/);

  const m = contract();
  const { sha: _, ...bare } = m.species.id;
  m.species.id = bare as never;
  fails(checkV1Contract(m, inputs()), /^\/v1\/species id: /, new RegExp(`no sha: set "sha": "${sha(SPECIES.id)}"`));
});

test("V6 a malformed entry fails: missing means, unknown key, a checklistKey without source, a bad pattern", () => {
  for (const bad of [
    { type: "INTEGER", null: false },
    { type: "INTEGER", null: false, means: "our id", unit: "none" },
    { type: "BIGINT", null: true, means: "x", checklistKey: CHECKLIST },
    { type: "VARCHAR", null: false, means: "x", pattern: "([" },
    { type: "INTEGER", null: "no", means: "x" },
  ]) {
    const c = contract();
    c.species.id = { ...bad, sha: sha(bad) } as never;
    fails(checkV1Contract(c, inputs()), /^\/v1\/species id: /, /malformed/);
  }
});

test("V7 a declared non-null field null or absent fails, list elements and struct members too", () => {
  fails(checkV1Contract(contract(), inputs({ species: [record(1), record(2, { range: { countries: null, status: null } })] })),
    /^\/v1\/species range\.status: /, /null or absent in record 2.*needs \/v2/);
  fails(checkV1Contract(contract(), inputs({ species: [record(1, { range: { countries: ["BR"] } })] })), /^\/v1\/species range\.status: /, /record 1/);
  fails(checkV1Contract(contract(), inputs({ species: [record(1, { sources: [gbif, occ, { fields: [] }] })] })), /^\/v1\/species sources\[\]\.source: /, /record 1/);
  fails(checkV1Contract(contract(), inputs({ species: [record(1, { sources: [gbif, occ, null] })] })), /^\/v1\/species sources: /, /null element in record 1/);
  fails(checkV1Contract(contract(), inputs({ species: [record(1, { range: { countries: ["BR", null], status: "ok" } })] })), /^\/v1\/species range\.countries: /, /null element/);
  fails(checkV1Contract(contract(), inputs({ countries: [{ code: "BR", region: null }] })), /^\/v1\/countries region: /, /null or absent in row BR/);
  fails(checkV1Contract(contract(), inputs({ species: [record(1, { photo: { url: null } })] })), /^\/v1\/species photo\.url: /, /record 1/);
});

test("V8 a declared nullable field may be null or hold no null; a null parent hides its members", () => {
  const species = [record(1, { ids: { gbif: null }, range: { countries: null, status: "none" }, photo: null, sources: [] }), record(2)];
  assert.deepEqual(checkV1Contract(contract(), inputs({ species })), { problems: [], additions: [] });
  // ids.gbif and photo are nullable and non-null in every record: nothing is inferred from the data.
  assert.deepEqual(checkV1Contract(contract(), inputs({ species: [record(1), record(2), record(3)] })), { problems: [], additions: [] });
});

test("V9 a value outside values or not matching pattern fails, per list element", () => {
  fails(checkV1Contract(contract(), inputs({ species: [record(1, { range: { countries: ["BR"], status: "native" } })] })), /^\/v1\/species range\.status: /, /"native" not in values.*record 1.*needs \/v2/);
  fails(checkV1Contract(contract(), inputs({ species: [record(1, { range: { countries: ["BR", "usa"], status: "ok" } })] })), /^\/v1\/species range\.countries: /, /"usa" doesn't match \^\[A-Z\]\{2\}\$.*record 1/);
  fails(checkV1Contract(contract(), inputs({ countries: [{ code: "NA", region: "Asia" }] })), /^\/v1\/countries region: /, /"Asia" not in values.*row NA/);
  fails(checkV1Contract(contract(), inputs({ countries: [{ code: 7, region: "Africa" }] })), /^\/v1\/countries code: /, /7 doesn't match/);
});

test("V10 a non-null value its source (and checklistKey) doesn't cite fails: a GBIF id from another checklist", () => {
  const other = { ...gbif, checklistKey: "7ddf754f-d193-4cc9-b351-99906754a03b" };
  fails(checkV1Contract(contract(), inputs({ species: [record(1), record(2, { sources: [other, occ] })] })),
    /^\/v1\/species ids\.gbif: /, /not cited by GBIF Backbone Taxonomy \(checklist d7dddbf4-2cf0-4f39-9b2a-bb099caae36c\) in record 2.*needs \/v2/);
  fails(checkV1Contract(contract(), inputs({ species: [record(1, { sources: [gbif] })] })), /^\/v1\/species range\.countries: /, /not cited by GBIF\.org occurrence search in record 1/);
  // A citation of the field's group covers its members.
  const group = { source: "GBIF.org occurrence search", fields: ["range"] };
  assert.deepEqual(checkV1Contract(contract(), inputs({ species: [record(1, { sources: [gbif, group] })] })).problems, []);
});

test("V11 nested and appended additions pass, each printing add to contracts/v1.json to freeze", () => {
  const cols = inputs().recordColumns;
  const r = checkV1Contract(contract(), inputs({
    recordColumns: { ...cols, ids: { gbif: "BIGINT", ncbi: "INTEGER" }, photo: { url: "VARCHAR", credit: "VARCHAR" }, sources: [{ ...(cols.sources as readonly [Columns])[0], doi: "VARCHAR" }], replacedBy: "INTEGER[]" },
    csvColumns: [...inputs().csvColumns, "ids_ncbi"],
    countryColumns: { code: "VARCHAR", region: "VARCHAR", subregion: "VARCHAR" },
  }));
  assert.deepEqual(r.problems, []);
  assert.deepEqual(r.additions, [
    "/v1/species ids.ncbi: add to contracts/v1.json to freeze",
    "/v1/species photo.credit: add to contracts/v1.json to freeze",
    "/v1/species sources[].doi: add to contracts/v1.json to freeze",
    "/v1/species replacedBy: add to contracts/v1.json to freeze",
    "/v1/species.csv ids_ncbi: add to contracts/v1.json to freeze",
    "/v1/countries subregion: add to contracts/v1.json to freeze",
    "/v1/countries.csv subregion: add to contracts/v1.json to freeze",
  ]);
});

test("V12 every problem is reported, not just the first", () => {
  const species = [record(1, { range: { countries: ["usa"], status: "native" } }), record(2, { range: { countries: ["x"], status: "native" } })];
  const r = checkV1Contract(contract(), inputs({ species, csvColumns: ["id"] }));
  assert.equal(r.problems.length, 3, r.problems.join("\n"));
  assert.match(r.problems.join("\n"), /records 1, 2/);
});

test("V13 range listings: a column removed or retyped, or the CSV reordered, fails", () => {
  const { origin: _, ...noOrigin } = LISTING_COLUMNS;
  has(checkV1Contract(contract(), inputs({ rangeListingColumns: noOrigin })), /^\/v1\/range-listings origin: /, /removed.*needs \/v2/);
  fails(checkV1Contract(contract(), inputs({ rangeListingColumns: { ...LISTING_COLUMNS, speciesId: "BIGINT" } })), /^\/v1\/range-listings speciesId: /, /INTEGER → BIGINT.*needs \/v2/);
  fails(checkV1Contract(contract(), inputs({ rangeListingCsv: ["country", "species_id", "area", "origin", "presence", "license", "doi"] })), /^\/v1\/range-listings\.csv: /, /not a prefix.*needs \/v2/);
});

test("V14 range listings: a sha that differs fails", () => {
  const c = contract();
  c.rangeListings.origin = { ...c.rangeListings.origin, means: "where it came from" };
  fails(checkV1Contract(c, inputs()), /^\/v1\/range-listings origin: /, /definition changed.*needs \/v2/);
});

test("V15 range listings: origin, presence and license off values, country off pattern, a null in a non-null column fail, naming the row", () => {
  for (const [column, value] of [["origin", "wild"], ["presence", "extinct"], ["license", "CC BY-NC 4.0"]]) {
    fails(checkV1Contract(contract(), inputs({ rangeListings: [listing({ [column]: value })] })), new RegExp(`^/v1/range-listings ${column}: `), /not in values in row 1 NA.*needs \/v2/);
  }
  fails(checkV1Contract(contract(), inputs({ rangeListings: [listing({ country: "usa" })] })), /^\/v1\/range-listings country: /, /"usa" doesn't match.*row 1 usa/);
  for (const column of ["speciesId", "origin", "license"]) {
    fails(checkV1Contract(contract(), inputs({ rangeListings: [listing({ [column]: null })] })), new RegExp(`^/v1/range-listings ${column}: `), /null or absent.*declared non-null/);
  }
});

test("V16 range listings: a null area or doi passes, and a new column is an addition", () => {
  assert.deepEqual(checkV1Contract(contract(), inputs({ rangeListings: [listing({ area: null, doi: null })] })), { problems: [], additions: [] });
  const r = checkV1Contract(contract(), inputs({
    rangeListingColumns: { ...LISTING_COLUMNS, note: "VARCHAR" },
    rangeListingCsv: [...inputs().rangeListingCsv, "note"],
  }));
  assert.deepEqual(r, { problems: [], additions: ["/v1/range-listings note: add to contracts/v1.json to freeze", "/v1/range-listings.csv note: add to contracts/v1.json to freeze"] });
});
