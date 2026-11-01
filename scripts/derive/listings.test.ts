// Range listings derive (plan F3–F6). Written before the code, seen failing first. Failure modes:
// F3, mapping, each line of 007's tables in order:
// 1. An off-enum means or status passes instead of refusing, or the error doesn't name species, dataset, country, means, status.
// 2. First-match order breaks: EXCLUDED, NOT_DETECTED or MANAGED with INTRODUCED or PRESENT yields a row.
// 3. Blank means: register isn't introduced, or checklist yields a row (GRIIS Australia's bilby).
// 4. NATIVE: register yields a row; checklist + ABSENT isn't native/absent; checklist + other yields a row.
// 5. UNCERTAIN isn't uncertain; * wrong for PRESENT, COMMON, RARE, IRREGULAR, DETECTED, DOUBTFUL, ABSENT, blank.
// 6. sourceTerm isn't verbatim: INTRODUCED/PRESENT, -/PRESENT, -/-.
// 7. No country yields a row.
// 8. A snapshot row on a dataset outside allowlist or datasets passes.
// 9. Dataset area is lost (Hawaii), or url, doi, license, source come from the wrong dataset.
// 10. MDD: Cambodia? loses uncertain or its ?; Namibia isn't NA; the token NA or Domesticated yields a row or isn't counted;
//     a place with an area loses it (Azores); an unknown place passes or isn't named.
// 11. Exclusion counts don't add up: rows in = rows out + each reason.
// F4, parseCurated: a non-array; a missing or extra key; an unknown species; a mammal; a bad country; presence unstated or
//     other; a non-https url; a blank sourceTerm; a blank area; a duplicate key; an iucn string in any value. Each refuses
//     naming the row. [] passes. Derive fills origin, source, sourceKey, license, doi exactly.
// F5, freshness: names, keys (message names the species), allowlist, a license outside the two, guard hits, each on the
//     right snapshot. MDD: pin fields, mammals only. Elapsed time alone never stales. A stale or absent listing snapshot
//     must not fail deriveCore or readCoreInputs (scripts/derive/sample.test.ts, once deriveAll calls this half).
// F6, assembly: same key doesn't collapse, or the highest sourceTaxonKey wins; rows with different sourceKey collapse; JS
//     order isn't null-area first; output depends on input order; a code with no country row passes; range-conflict not one
//     per (species, country) with every claim in key order; range-not-found missing for a mammal with no MDD row or a
//     non-mammal with no curated row, or present with a country; a final row holding iucn passes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHECKLIST_ALLOWLIST } from "../ingest/checklist-roles.ts";
import { MDD_FILE } from "../ingest/mdd.ts";
import type { GbifChecklistRow, GbifChecklistsSnapshot, MddSnapshot } from "../raw.ts";
import type { BaseSpecies, Species } from "../species.ts";
import {
  assertGbifChecklistsFresh, assertMddFresh, deriveListings, mapChecklistRow, mapMddPlace, type ListingInputs,
} from "./listings.ts";
import { parseCurated } from "./range-curated.ts";

const REGISTER = "39f36f10-559b-427f-8c86-2d28afff68ca"; // role register, no area
const HAWAII = "6baf6a53-c106-40fb-bbde-f6d4e4051513"; // role register, area Hawaii
const CHECKLIST = "c71d02ff-b756-4cc0-b089-d29ba9155619"; // role checklist

const species = (id: number, scientificName: string, cls: string) =>
  ({ id, slug: `s${id}`, scientificName, commonName: scientificName, taxonomy: { class: cls, order: "o", family: "f", genus: "g" }, ids: { iucn: id }, photo: null, replacedBy: null }) as unknown as BaseSpecies;
const TURTLE = species(1, "Turtle one", "Reptilia");
const CAT = species(2, "Cat two", "Mammalia");
const BASE = [TURTLE, CAT];
const CODES = ["AF", "BR", "KH", "KE", "NA", "PT", "US"];
const core = (over: Partial<{ checklistKeys: Record<string, number[]>; records: Species[] }> = {}) => ({
  checklistKeys: { "Turtle one": [11], "Cat two": [22, 23] },
  countries: { rows: CODES.map((code) => ({ code })) },
  records: [] as Species[],
  ...over,
});
const dataset = (n: number, license: "CC0 1.0" | "CC BY 4.0" = "CC BY 4.0") => ({ title: `Dataset ${n}`, license, doi: `10.1/d${n}`, citation: `Citation ${n}` });
const row = (over: Partial<GbifChecklistRow> = {}): GbifChecklistRow =>
  ({ datasetKey: REGISTER, sourceTaxonKey: 100, country: "US", establishmentMeans: "INTRODUCED", status: "PRESENT", ...over });
const checklists = (rowsByName: Record<string, GbifChecklistRow[]> = {}): GbifChecklistsSnapshot => ({
  retrieved: "2026-11-01",
  allowlist: { ...CHECKLIST_ALLOWLIST },
  datasets: { [REGISTER]: dataset(1), [HAWAII]: dataset(2, "CC0 1.0"), [CHECKLIST]: dataset(3) },
  species: {
    "Turtle one": { keys: [11], rows: rowsByName["Turtle one"] ?? [] },
    "Cat two": { keys: [22, 23], rows: rowsByName["Cat two"] ?? [] },
  },
  dropped: { noSourceTaxonKey: 0, redList: 0, noRole: {} },
});
const mdd = (places: string | null = "Kenya"): MddSnapshot => ({
  retrieved: "2026-11-01",
  file: { ...MDD_FILE },
  release: { version: "v2.5", issued: "2026-07-28", doi: "10.5281/zenodo.21654811" },
  license: "CC BY 4.0",
  species: { "Cat two": places === null ? null : { id: "77", places } },
});
const curatedRow = (over: Record<string, unknown> = {}) =>
  ({ speciesId: 1, country: "US", area: null, presence: "present", url: "https://example.org/turtle", sourceTerm: "our words", ...over });
const inputs = (over: Partial<ListingInputs> = {}): ListingInputs => ({ gbifChecklists: checklists(), mdd: mdd(), curated: [], ...over });
const derive = (over: Partial<ListingInputs> = {}, c = core()) => deriveListings({ base: BASE, core: c, listings: inputs(over) });
const map = (role: "register" | "checklist", country: string | null, means: string | null, status: string | null) =>
  mapChecklistRow(row({ country, establishmentMeans: means, status }), role, "Turtle one");

test("F3.1 an off-enum means or status refuses, naming species, dataset, country, means, status", () => {
  for (const [means, status] of [["ESCAPED", "PRESENT"], ["INTRODUCED", "EXTINCT"]]) {
    assert.throws(() => map("register", "US", means, status), (e: Error) => {
      for (const part of ["Turtle one", REGISTER, "US", means, status]) assert.ok(e.message.includes(part), `${part} in ${e.message}`);
      return true;
    });
  }
  // A blank country doesn't excuse an off-enum value.
  assert.throws(() => map("register", null, "ESCAPED", "PRESENT"), /ESCAPED/);
});

test("F3.2 first match wins: EXCLUDED, NOT_DETECTED, MANAGED never yield a row", () => {
  for (const role of ["register", "checklist"] as const) {
    for (const status of ["EXCLUDED", "NOT_DETECTED"]) {
      for (const means of ["INTRODUCED", "NATIVE", "MANAGED", null]) assert.ok("excluded" in map(role, "US", means, status), `${role} ${means} ${status}`);
    }
    for (const status of ["PRESENT", "ABSENT", null]) assert.ok("excluded" in map(role, "US", "MANAGED", status), `${role} MANAGED ${status}`);
  }
});

test("F3.3 blank means: register is introduced, checklist yields no row", () => {
  assert.deepEqual(map("register", "US", null, "PRESENT"), { origin: "introduced", presence: "present", sourceTerm: "-/PRESENT" });
  assert.ok("excluded" in map("checklist", "AU", null, "PRESENT"));
});

test("F3.4 NATIVE: only checklist + ABSENT yields a row, native/absent", () => {
  for (const status of ["PRESENT", "ABSENT", "DOUBTFUL", null]) assert.ok("excluded" in map("register", "US", "NATIVE", status));
  assert.deepEqual(map("checklist", "KZ", "NATIVE", "ABSENT"), { origin: "native", presence: "absent", sourceTerm: "NATIVE/ABSENT" });
  for (const status of ["PRESENT", "COMMON", "RARE", "IRREGULAR", "DETECTED", "DOUBTFUL", null]) assert.ok("excluded" in map("checklist", "KZ", "NATIVE", status), String(status));
});

test("F3.5 UNCERTAIN is uncertain, and every status maps as the * line says", () => {
  const star = { PRESENT: "present", COMMON: "present", RARE: "present", IRREGULAR: "present", DETECTED: "present", DOUBTFUL: "uncertain", ABSENT: "absent" };
  for (const role of ["register", "checklist"] as const) {
    for (const [status, presence] of [...Object.entries(star), [null, "unstated"]] as [string | null, string][]) {
      for (const means of ["INTRODUCED", "NATURALISED", "INVASIVE"]) {
        const got = map(role, "US", means, status);
        assert.ok("origin" in got && got.origin === "introduced" && got.presence === presence, `${role} ${means} ${status}`);
      }
      const uncertain = map(role, "US", "UNCERTAIN", status);
      assert.ok("origin" in uncertain && uncertain.origin === "uncertain" && uncertain.presence === presence, `${role} UNCERTAIN ${status}`);
    }
  }
});

test("F3.6 sourceTerm is verbatim, - for blank", () => {
  const term = (means: string | null, status: string | null) => { const m = map("register", "US", means, status); return "origin" in m ? m.sourceTerm : null; };
  assert.equal(term("INTRODUCED", "PRESENT"), "INTRODUCED/PRESENT");
  assert.equal(term(null, "PRESENT"), "-/PRESENT");
  assert.equal(term(null, null), "-/-");
  assert.equal(term("INTRODUCED", "COMMON"), "INTRODUCED/COMMON");
});

test("F3.7 no country yields no row, counted", () => {
  for (const role of ["register", "checklist"] as const) assert.ok("excluded" in map(role, null, "INTRODUCED", "PRESENT"));
  const { file, report } = derive({ gbifChecklists: checklists({ "Turtle one": [row({ country: null })] }) });
  assert.equal(file.rows.filter((r) => r.sourceKey === REGISTER).length, 0);
  assert.equal(Object.values(report.excluded).reduce((a, b) => a + b, 0), 1);
});

test("F3.8 a snapshot row on a dataset outside allowlist or datasets refuses", () => {
  const stray = "00000000-0000-4000-8000-000000000001";
  assert.throws(() => derive({ gbifChecklists: checklists({ "Turtle one": [row({ datasetKey: stray })] }) }), new RegExp(stray));
  const noMeta = checklists({ "Turtle one": [row()] });
  delete noMeta.datasets[REGISTER];
  assert.throws(() => derive({ gbifChecklists: noMeta }), new RegExp(REGISTER));
  const noRole = checklists();
  noRole.datasets[stray] = dataset(9);
  assert.throws(() => derive({ gbifChecklists: noRole }), new RegExp(stray));
});

test("F3.9 each row takes area, url, doi, license, source from its own dataset", () => {
  const { file } = derive({ gbifChecklists: checklists({ "Turtle one": [
    row({ datasetKey: HAWAII, sourceTaxonKey: 501, establishmentMeans: null }),
    row({ datasetKey: REGISTER, sourceTaxonKey: 502 }),
  ] }) });
  const got = file.rows.filter((r) => r.speciesId === 1);
  assert.deepEqual(got, [
    { speciesId: 1, country: "US", area: null, origin: "introduced", presence: "present", source: "Dataset 1", sourceKey: REGISTER, license: "CC BY 4.0", doi: "10.1/d1", url: "https://www.gbif.org/species/502", sourceTerm: "INTRODUCED/PRESENT" },
    { speciesId: 1, country: "US", area: "Hawaii", origin: "introduced", presence: "present", source: "Dataset 2", sourceKey: HAWAII, license: "CC0 1.0", doi: "10.1/d2", url: "https://www.gbif.org/species/501", sourceTerm: "-/PRESENT" },
  ]);
});

test("F3.10 MDD places", () => {
  assert.deepEqual(mapMddPlace("Kenya", "Cat two"), { code: "KE", area: null, origin: "native-or-pre-1500", presence: "present", sourceTerm: "Kenya" });
  assert.deepEqual(mapMddPlace("Cambodia?", "Cat two"), { code: "KH", area: null, origin: "native-or-pre-1500", presence: "uncertain", sourceTerm: "Cambodia?" });
  assert.equal((mapMddPlace("Namibia", "Cat two") as { code: string }).code, "NA");
  assert.deepEqual(mapMddPlace("Azores", "Cat two"), { code: "PT", area: "Azores", origin: "native-or-pre-1500", presence: "present", sourceTerm: "Azores" });
  for (const token of ["NA", "Domesticated", "NA?", "Domesticated?"]) assert.ok("excluded" in mapMddPlace(token, "Cat two"), token);
  assert.throws(() => mapMddPlace("Atlantis", "Cat two"), /Cat two.*Atlantis/);
  assert.throws(() => mapMddPlace("constructor", "Cat two"), /constructor/); // not an Object.prototype hit
  const { file, report } = derive({ mdd: mdd("Kenya|Cambodia?|NA|Domesticated|Namibia|Azores") });
  const got = file.rows.filter((r) => r.sourceKey === "mdd");
  assert.deepEqual(got.map((r) => [r.country, r.area, r.presence, r.sourceTerm]), [
    ["KE", null, "present", "Kenya"], ["KH", null, "uncertain", "Cambodia?"], ["NA", null, "present", "Namibia"], ["PT", "Azores", "present", "Azores"],
  ]);
  assert.deepEqual(got[0], { speciesId: 2, country: "KE", area: null, origin: "native-or-pre-1500", presence: "present", source: "Mammal Diversity Database", sourceKey: "mdd", license: "CC BY 4.0", doi: "10.5281/zenodo.21654811", url: "https://www.mammaldiversity.org/taxon/77", sourceTerm: "Kenya" });
  assert.equal(Object.values(report.excluded).reduce((a, b) => a + b, 0), 2);
});

test("F3.11 rows in = rows out + collapsed + each exclusion", () => {
  const gbifRows = [
    row({ sourceTaxonKey: 101 }), row({ sourceTaxonKey: 102 }), // collapse
    row({ country: null }), row({ status: "EXCLUDED" }), row({ establishmentMeans: "MANAGED" }), row({ establishmentMeans: "NATIVE" }),
    row({ datasetKey: CHECKLIST, establishmentMeans: null }), row({ datasetKey: CHECKLIST, establishmentMeans: "NATIVE", status: "PRESENT" }),
    row({ datasetKey: CHECKLIST, establishmentMeans: "NATIVE", status: "ABSENT", country: "BR" }),
  ];
  const places = "Kenya|NA|Domesticated";
  const curated = [curatedRow()];
  const { file, report } = derive({ gbifChecklists: checklists({ "Turtle one": gbifRows }), mdd: mdd(places), curated });
  const rowsIn = gbifRows.length + places.split("|").length + curated.length;
  assert.equal(rowsIn, file.rows.length + report.collapsed + Object.values(report.excluded).reduce((a, b) => a + b, 0));
  assert.equal(report.collapsed, 1);
  // No country, excluded status, MANAGED, register NATIVE, checklist NATIVE, checklist blank, MDD's non-places.
  assert.equal(Object.keys(report.excluded).length, 7);
});

test("F4 parseCurated refuses each bad row, naming it; [] passes", () => {
  assert.deepEqual(parseCurated([], BASE), []);
  assert.throws(() => parseCurated({}, BASE), /must be an array/);
  const bad: [string, unknown, RegExp][] = [
    ["not an object", "x", /range-curated\[0\]/],
    ["missing key", (({ sourceTerm: _, ...r }) => r)(curatedRow()), /range-curated\[0\].*keys/],
    ["extra key", curatedRow({ origin: "native" }), /range-curated\[0\].*keys/],
    ["unknown species", curatedRow({ speciesId: 99 }), /range-curated\[0\].*species/],
    ["mammal", curatedRow({ speciesId: 2 }), /range-curated\[0\].*mammal/i],
    ["bad country", curatedRow({ country: "usa" }), /range-curated\[0\].*country/],
    ["presence unstated", curatedRow({ presence: "unstated" }), /range-curated\[0\].*presence/],
    ["presence other", curatedRow({ presence: "maybe" }), /range-curated\[0\].*presence/],
    ["http url", curatedRow({ url: "http://example.org/" }), /range-curated\[0\].*url/],
    ["blank sourceTerm", curatedRow({ sourceTerm: "  " }), /range-curated\[0\].*sourceTerm/],
    ["blank area", curatedRow({ area: " " }), /range-curated\[0\].*area/],
    ["number area", curatedRow({ area: 3 }), /range-curated\[0\].*area/],
    ["iucn url", curatedRow({ url: "https://www.iucnredlist.org/x" }), /IUCN data at/],
    ["iucn term", curatedRow({ sourceTerm: "per IUCN" }), /IUCN data at/],
  ];
  for (const [what, r, want] of bad) assert.throws(() => parseCurated([r], BASE), want, what);
  assert.throws(() => parseCurated([curatedRow(), curatedRow()], BASE), /range-curated\[1\].*duplicate/);
  // A different area or presence is another key.
  assert.equal(parseCurated([curatedRow(), curatedRow({ area: "Hawaii" }), curatedRow({ presence: "absent" })], BASE).length, 3);
});

test("F4 derive fills origin, source, sourceKey, license, doi exactly", () => {
  const { file } = derive({ curated: [curatedRow({ presence: "uncertain", area: "Maine" })] });
  assert.deepEqual(file.rows.find((r) => r.sourceKey === "curated"), {
    speciesId: 1, country: "US", area: "Maine", origin: "native", presence: "uncertain", source: "critwire curated", sourceKey: "curated", license: "CC BY 4.0", doi: null, url: "https://example.org/turtle", sourceTerm: "our words",
  });
  assert.equal(file.sources.curated.rows, 1);
});

test("F5 GBIF checklists freshness", () => {
  const fresh = () => checklists();
  const keys = core().checklistKeys;
  assert.doesNotThrow(() => assertGbifChecklistsFresh(fresh(), BASE, keys));
  const noName = fresh();
  delete noName.species["Turtle one"];
  assert.throws(() => assertGbifChecklistsFresh(noName, BASE, keys), /data\/raw\/gbif-checklists is stale \(names: not the base's\): run pnpm ingest gbif-checklists/);
  const moved = fresh();
  moved.species["Turtle one"].keys = [12];
  assert.throws(() => assertGbifChecklistsFresh(moved, BASE, keys), /data\/raw\/gbif-checklists is stale \(Turtle one: keys\): run pnpm ingest gbif-checklists/);
  const allowlist = fresh();
  allowlist.allowlist[REGISTER] = { role: "checklist", area: null };
  assert.throws(() => assertGbifChecklistsFresh(allowlist, BASE, keys), /data\/raw\/gbif-checklists is stale \(allowlist\): run pnpm ingest gbif-checklists/);
  const license = fresh();
  (license.datasets[REGISTER] as { license: string }).license = "CC BY-NC 4.0";
  assert.throws(() => assertGbifChecklistsFresh(license, BASE, keys), new RegExp(`${REGISTER}.*CC BY-NC 4\\.0`));
  const title = fresh();
  title.datasets[REGISTER].title = "An iucn list";
  assert.throws(() => assertGbifChecklistsFresh(title, BASE, keys), /IUCN data at \$\.datasets/);
  const threat = fresh();
  threat.species["Turtle one"].rows = [{ ...row(), threatStatus: "x" } as GbifChecklistRow];
  assert.throws(() => assertGbifChecklistsFresh(threat, BASE, keys), /IUCN data at .*threatStatus/);
  // Elapsed time alone never stales.
  assert.doesNotThrow(() => assertGbifChecklistsFresh({ ...fresh(), retrieved: "2001-01-01" }, BASE, keys));
});

test("F5 MDD freshness: pin, mammals only, license, guard", () => {
  assert.doesNotThrow(() => assertMddFresh(mdd(), BASE));
  assert.doesNotThrow(() => assertMddFresh({ ...mdd(), retrieved: "2001-01-01" }, BASE));
  assert.throws(() => assertMddFresh({ ...mdd(), file: { ...MDD_FILE, md5: "0" } }, BASE), /data\/raw\/mdd is stale \(pin\): run pnpm ingest mdd/);
  assert.throws(() => assertMddFresh({ ...mdd(), species: {} }, BASE), /data\/raw\/mdd is stale \(names: not the base's\)/);
  assert.throws(() => assertMddFresh({ ...mdd(), species: { "Cat two": { id: "1", places: "Kenya" }, "Turtle one": null } }, BASE), /data\/raw\/mdd is stale \(names/);
  assert.throws(() => assertMddFresh({ ...mdd(), license: "CC BY-SA 4.0" } as unknown as MddSnapshot, BASE), /data\/raw\/mdd.*license.*CC BY-SA 4\.0/);
  assert.throws(() => assertMddFresh({ ...mdd(), species: { "Cat two": { id: "1", places: "Kenya", iucnStatus: "LC" } as { id: string; places: string } } }, BASE), /IUCN data at .*iucnStatus/);
  // The release's version is the citation's business (mddCitation), so a new one fails there, naming MDD_CITATIONS.
  assert.doesNotThrow(() => assertMddFresh({ ...mdd(), release: { ...mdd().release, version: "v9" } }, BASE));
});

test("F5 derive refuses through both asserts", () => {
  assert.throws(() => derive({ mdd: { ...mdd(), file: { ...MDD_FILE, bytes: 1 } } }), /data\/raw\/mdd is stale/);
  assert.throws(() => derive({}, core({ checklistKeys: { "Turtle one": [99], "Cat two": [22, 23] } })), /Turtle one: keys/);
});

test("F6 same key collapses to the lowest sourceTaxonKey; different sourceKey doesn't", () => {
  const key = (sourceTaxonKey: number, status = "PRESENT") => row({ sourceTaxonKey, status });
  const { file, report } = derive({ gbifChecklists: checklists({ "Turtle one": [
    key(900, "COMMON"), key(100, "RARE"), key(500), row({ datasetKey: CHECKLIST, sourceTaxonKey: 700 }),
  ] }) });
  const got = file.rows.filter((r) => r.speciesId === 1);
  assert.deepEqual(got.map((r) => [r.sourceKey, r.url, r.sourceTerm]), [
    [REGISTER, "https://www.gbif.org/species/100", "INTRODUCED/RARE"],
    [CHECKLIST, "https://www.gbif.org/species/700", "INTRODUCED/PRESENT"],
  ].sort((a, b) => (a[0] < b[0] ? -1 : 1)));
  assert.equal(report.collapsed, 2);
});

test("F6 rows sort by the key, null area first, whatever the input order; sources list only used datasets", () => {
  const rows = [
    row({ sourceTaxonKey: 1, country: "US", status: "ABSENT" }),
    row({ sourceTaxonKey: 2, country: "BR", datasetKey: HAWAII }),
    row({ sourceTaxonKey: 3, country: "US" }),
    row({ sourceTaxonKey: 4, country: "US", datasetKey: HAWAII }),
    row({ sourceTaxonKey: 5, country: "US", establishmentMeans: "UNCERTAIN" }),
  ];
  const a = derive({ gbifChecklists: checklists({ "Turtle one": rows }), curated: [curatedRow({ area: "Maine" }), curatedRow()] });
  const b = derive({ gbifChecklists: checklists({ "Turtle one": [...rows].reverse() }), curated: [curatedRow(), curatedRow({ area: "Maine" })] });
  assert.deepEqual(a, b);
  assert.deepEqual(a.file.rows.filter((r) => r.speciesId === 1).map((r) => [r.country, r.area, r.origin, r.presence, r.sourceKey]), [
    ["BR", "Hawaii", "introduced", "present", HAWAII],
    ["US", null, "introduced", "absent", REGISTER],
    ["US", null, "introduced", "present", REGISTER],
    ["US", null, "native", "present", "curated"],
    ["US", null, "uncertain", "present", REGISTER],
    ["US", "Hawaii", "introduced", "present", HAWAII],
    ["US", "Maine", "native", "present", "curated"],
  ]);
  const { datasets, retrieved } = a.file.sources.gbifChecklists;
  assert.equal(retrieved, "2026-11-01");
  assert.deepEqual(datasets.map((d) => [d.key, d.rows]), [[REGISTER, 3], [HAWAII, 2]].sort((x, y) => (x[0] < y[0] ? -1 : 1)));
  assert.deepEqual(datasets.find((d) => d.key === HAWAII), { key: HAWAII, title: "Dataset 2", license: "CC0 1.0", doi: "10.1/d2", citation: "Citation 2", rows: 2 });
  assert.deepEqual(a.file.sources.mdd, { retrieved: "2026-11-01", release: mdd().release, license: "CC BY 4.0", rows: 1 });
});

test("F6 a code with no country row refuses, naming species, source, code", () => {
  assert.throws(() => derive({ gbifChecklists: checklists({ "Turtle one": [row({ country: "QQ" })] }) }), new RegExp(`Turtle one.*${REGISTER}.*QQ`));
  assert.throws(() => derive({ curated: [curatedRow({ country: "QQ" })] }), /Turtle one.*curated.*QQ/);
  assert.throws(() => derive({ mdd: mdd("Kenya") }, { ...core(), countries: { rows: [{ code: "US" }] } }), /Cat two.*mdd.*KE/);
});

test("F6 one range-conflict per (species, country), every claim in key order; area rows don't count", () => {
  const { conflicts } = derive({
    gbifChecklists: checklists({ "Cat two": [row({ country: "KE" }), row({ country: "KE", datasetKey: CHECKLIST, status: "ABSENT" }), row({ country: "US", datasetKey: HAWAII })] }),
    mdd: mdd("Kenya"),
  });
  const found = conflicts.filter((e) => e.kind === "range-conflict");
  assert.equal(found.length, 1);
  const [e] = found;
  assert.equal(e.speciesId, 2);
  assert.equal(e.scientificName, "Cat two");
  assert.equal(e.field, "range-listings");
  assert.equal(e.severity, "review");
  assert.equal(e.country, "KE");
  assert.deepEqual(e.values, { claims: [
    { sourceKey: CHECKLIST, origin: "introduced", presence: "absent" },
    { sourceKey: REGISTER, origin: "introduced", presence: "present" },
    { sourceKey: "mdd", origin: "native-or-pre-1500", presence: "present" },
  ] });
  assert.ok(e.reason.length > 0 && !/iucn/i.test(e.reason));
});

test("F6 range-not-found: a mammal with no MDD row, a non-mammal with no curated row; never a country", () => {
  const entry = (o: Partial<ListingInputs>, id: number) => derive(o).conflicts.filter((e) => e.kind === "range-not-found" && e.speciesId === id);
  assert.equal(entry({}, 1).length, 1, "turtle, no curated row");
  assert.equal(entry({ curated: [curatedRow()] }, 1).length, 0);
  assert.equal(entry({ mdd: mdd(null) }, 2).length, 1, "mammal, no MDD name");
  assert.equal(entry({ mdd: mdd("NA") }, 2).length, 1, "mammal, no MDD row left");
  assert.equal(entry({}, 2).length, 0);
  // Another source's row doesn't stand in for the native authority.
  assert.equal(entry({ gbifChecklists: checklists({ "Turtle one": [row()] }) }, 1).length, 1);
  const [e] = entry({}, 1);
  assert.equal(e.severity, "info");
  assert.equal(e.field, "range-listings");
  assert.ok(!("country" in e));
});

test("F6 an iucn string headed for a row refuses", () => {
  // The row guard is the second line: a row holds only guarded inputs and constants, so no input reaches it past the first.
  const snapshot = checklists({ "Turtle one": [row()] });
  snapshot.datasets[REGISTER].title = "IUCN list";
  assert.throws(() => derive({ gbifChecklists: snapshot }), /IUCN data at/);
});

test("the report counts rows and species per source, and the agreement with open records", () => {
  const record = (id: number, codes: string[] | null) => ({ id, range: { countriesWithOpenRecords: codes } }) as unknown as Species;
  const { report } = derive({ mdd: mdd("Kenya|Cambodia?"), curated: [curatedRow()], gbifChecklists: checklists({ "Turtle one": [row({ country: "BR" })] }) },
    core({ records: [record(1, ["US", "PT"]), record(2, ["KE", "NA"])] }));
  assert.deepEqual(report.sources.find((s) => s.sourceKey === "mdd"), { source: "Mammal Diversity Database", sourceKey: "mdd", rows: 2, species: 1 });
  assert.deepEqual(report.sources.find((s) => s.sourceKey === "curated"), { source: "critwire curated", sourceKey: "curated", rows: 1, species: 1 });
  assert.deepEqual(report.agreement, { recordCountries: 4, onListing: 2, mddPresent: 1, mddPresentWithRecords: 1 });
  assert.deepEqual(report.dropped, { noSourceTaxonKey: 0, redList: 0, noRole: {} });
});
