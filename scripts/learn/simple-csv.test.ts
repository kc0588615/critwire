// P1–P8 (plan D6, D15): the SIMPLE_CSV parser's refusals, plus the typed record for a clean row. Written before the
// code, seen failing first. Rows are built from the spike download's header (the first line of
// 0041824-260928105237408.csv) with one field changed per case.
import { test } from "node:test";
import assert from "node:assert/strict";
import { OPEN_GBIF_LICENSES } from "../raw.ts";
import { readSimpleCsv, RECORD_LICENSES, SIMPLE_CSV_HEADER } from "./simple-csv.ts";

const HEADER = "gbifID,datasetKey,occurrenceID,kingdom,phylum,class,order,family,genus,species,infraspecificEpithet,taxonRank,scientificName,verbatimScientificName,verbatimScientificNameAuthorship,countryCode,locality,stateProvince,occurrenceStatus,individualCount,publishingOrgKey,decimalLatitude,decimalLongitude,coordinateUncertaintyInMeters,coordinatePrecision,elevation,elevationAccuracy,depth,depthAccuracy,eventDate,day,month,year,taxonKey,speciesKey,basisOfRecord,institutionCode,collectionCode,catalogNumber,recordNumber,identifiedBy,dateIdentified,license,rightsHolder,recordedBy,typeStatus,establishmentMeans,lastInterpreted,mediaType,issue".split(",");
const DATASET = "b84a3711-b4ca-4e4f-adac-80dfaea98d1c";
const CTX = { downloadYear: 2026, datasetKeys: new Set([DATASET, "04fd2e13-6881-4e5c-9dd1-8fdd9ab993c1"]) };
const BASE: Record<string, string> = {
  gbifID: "3440484419", datasetKey: DATASET, species: "Loxodonta africana", taxonRank: "SPECIES", countryCode: "TZ",
  occurrenceStatus: "PRESENT", decimalLatitude: "-3.151143", decimalLongitude: "35.560684", coordinateUncertaintyInMeters: "1.0",
  eventDate: "2008-11-04", day: "4", month: "11", year: "2008", taxonKey: "2435350", speciesKey: "2435350",
  basisOfRecord: "HUMAN_OBSERVATION", license: "CC_BY_4_0", issue: "TAXON_CONCEPT_ID_NOT_FOUND",
};
const row = (change: Record<string, string> = {}) => HEADER.map((h) => ({ ...BASE, ...change })[h] ?? "").join("\t");
const parse = (lines: string[], ctx = CTX) => readSimpleCsv(lines, ctx);
const refuses = (change: Record<string, string>, message: RegExp) =>
  assert.rejects(parse([HEADER.join("\t"), row(), row({ gbifID: "7", ...change })]), (e: Error) => {
    assert.match(e.message, /^simple-csv: line 3: /);
    assert.match(e.message, message);
    return true;
  });

test("the header constant is the spike download's 50 fields; the license map covers the open GBIF licenses", () => {
  assert.deepEqual(SIMPLE_CSV_HEADER, HEADER);
  assert.equal(HEADER.length, 50);
  assert.deepEqual(Object.keys(RECORD_LICENSES).sort(), [...OPEN_GBIF_LICENSES].sort());
});

test("a clean row: typed record, numbers as GBIF delivered them, empty = null", async () => {
  const [a, b] = await parse([
    HEADER.join("\t"), row(),
    row({ gbifID: "44976223", speciesKey: "", coordinateUncertaintyInMeters: "", countryCode: "", year: "", month: "", license: "CC0_1_0", basisOfRecord: "PRESERVED_SPECIMEN" }),
  ]);
  assert.deepEqual(a, {
    id: 3440484419, datasetKey: DATASET, speciesKey: 2435350, taxonKey: 2435350, license: "CC BY 4.0", basisOfRecord: "HUMAN_OBSERVATION",
    longitude: "35.560684", latitude: "-3.151143", coordinateUncertaintyM: "1.0", countryCode: "TZ", year: 2008, month: 11,
  });
  assert.deepEqual(b, {
    id: 44976223, datasetKey: DATASET, speciesKey: null, taxonKey: 2435350, license: "CC0 1.0", basisOfRecord: "PRESERVED_SPECIMEN",
    longitude: "35.560684", latitude: "-3.151143", coordinateUncertaintyM: null, countryCode: null, year: null, month: null,
  });
  assert.deepEqual(await parse([HEADER.join("\t")]), []);
});

test("bounds are inclusive: ±180, ±90, uncertainty 0, year 1 and the download's year, months 1 and 12", async () => {
  const rows = await parse([
    HEADER.join("\t"),
    row({ gbifID: "1", decimalLongitude: "-180", decimalLatitude: "90", coordinateUncertaintyInMeters: "0", year: "1", month: "1" }),
    row({ gbifID: "2", decimalLongitude: "180.0", decimalLatitude: "-90.0", year: "2026", month: "12" }),
  ]);
  assert.equal(rows.length, 2);
});

test("P1 field count: a header that differs, a row with fewer or more fields, an empty line", async () => {
  await assert.rejects(parse([HEADER.slice(0, 49).join("\t")]), /^Error: simple-csv: line 1: header is not GBIF's SIMPLE_CSV/);
  await assert.rejects(parse([[...HEADER.slice(0, 49), "issues"].join("\t")]), /line 1: header/);
  await assert.rejects(parse([]), /no header/);
  for (const bad of [row().split("\t").slice(0, 49).join("\t"), row() + "\textra", ""]) {
    await assert.rejects(parse([HEADER.join("\t"), row(), bad]), /^Error: simple-csv: line 3: \d+ fields, expected 50$/);
  }
});

test("P2 coordinates: missing, non-numeric or out of range", async () => {
  for (const v of ["", "abc", "1,5", "0x10", "Infinity", "NaN", " 1", "1e", "--1"]) {
    await refuses({ decimalLongitude: v }, /decimalLongitude/);
    await refuses({ decimalLatitude: v }, /decimalLatitude/);
  }
  await refuses({ decimalLongitude: "180.000001" }, /decimalLongitude 180\.000001: outside -180\.\.180/);
  await refuses({ decimalLongitude: "-181" }, /decimalLongitude/);
  await refuses({ decimalLatitude: "90.5" }, /decimalLatitude 90\.5: outside -90\.\.90/);
  await refuses({ decimalLatitude: "-1e3" }, /decimalLatitude/);
});

test("P3 uncertainty: negative, NaN or infinite", async () => {
  for (const v of ["-1", "-0.5", "NaN", "Infinity", "-Infinity", "1e999", "x"]) await refuses({ coordinateUncertaintyInMeters: v }, /coordinateUncertaintyInMeters/);
});

test("P4 year: below 1, after the download's year, or not an integer", async () => {
  for (const v of ["0", "-5", "2027", "2008.5", "y"]) await refuses({ year: v }, /year/);
  await assert.rejects(parse([HEADER.join("\t"), row()], { ...CTX, downloadYear: 2007 }), /line 2: year 2008: outside 1\.\.2007/);
});

test("P5 month outside 1–12", async () => {
  for (const v of ["0", "13", "-1", "1.5", "m"]) await refuses({ month: v }, /month/);
});

test("P6 unknown basis of record, license or occurrence status", async () => {
  for (const v of ["LIVING_SPECIMEN", "FOSSIL_SPECIMEN", "human_observation", ""]) await refuses({ basisOfRecord: v }, /basisOfRecord/);
  for (const v of ["CC_BY_NC_4_0", "CC BY 4.0", ""]) await refuses({ license: v }, /license/);
  for (const v of ["ABSENT", "present", ""]) await refuses({ occurrenceStatus: v }, /occurrenceStatus/);
});

test("P7 duplicate gbifID; ids and taxon keys must be positive integers", async () => {
  await assert.rejects(parse([HEADER.join("\t"), row(), row({ month: "3" })]), /^Error: simple-csv: line 3: gbifID 3440484419 twice \(first on line 2\)$/);
  for (const v of ["", "0", "-3", "1.0", "9007199254740993", "x"]) await refuses({ gbifID: v }, /gbifID/);
  for (const v of ["", "0", "k"]) await refuses({ taxonKey: v }, /taxonKey/);
  for (const v of ["0", "k"]) await refuses({ speciesKey: v }, /speciesKey/);
});

test("P8 a dataset key not in the download's dataset listing", async () => {
  await refuses({ datasetKey: "00000000-0000-0000-0000-000000000000" }, /datasetKey 00000000-0000-0000-0000-000000000000: not in the download's datasets/);
  await refuses({ datasetKey: "" }, /datasetKey/);
});

test("an async line source works the same as an array", async () => {
  async function* lines() { yield HEADER.join("\t"); yield row(); }
  assert.equal((await readSimpleCsv(lines(), CTX)).length, 1);
});
