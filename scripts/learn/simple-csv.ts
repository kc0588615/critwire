// GBIF SIMPLE_CSV, typed (plan D6, F10), pure: tab-separated with no quoting, so a line splits on tab only and every
// line has exactly the header's 50 fields. Each column the sample uses is typed with a refusal (P1–P8) naming the
// line, the field and the value. Numbers stay as GBIF delivered them (data/raw/gbif-sample/sample.csv keeps that
// text); empty is null. The species rule and the counts are the ingest's (scripts/ingest/gbif-sample.ts).
import { BASIS_OF_RECORD } from "../ingest/gbif.ts";
import type { SampleLicense } from "./sample-rules.ts";

// GBIF's SIMPLE_CSV columns, in order, as in the spike's download 0041824-260928105237408. Another header fails.
export const SIMPLE_CSV_HEADER = [
  "gbifID", "datasetKey", "occurrenceID", "kingdom", "phylum", "class", "order", "family", "genus", "species",
  "infraspecificEpithet", "taxonRank", "scientificName", "verbatimScientificName", "verbatimScientificNameAuthorship",
  "countryCode", "locality", "stateProvince", "occurrenceStatus", "individualCount", "publishingOrgKey",
  "decimalLatitude", "decimalLongitude", "coordinateUncertaintyInMeters", "coordinatePrecision", "elevation",
  "elevationAccuracy", "depth", "depthAccuracy", "eventDate", "day", "month", "year", "taxonKey", "speciesKey",
  "basisOfRecord", "institutionCode", "collectionCode", "catalogNumber", "recordNumber", "identifiedBy",
  "dateIdentified", "license", "rightsHolder", "recordedBy", "typeStatus", "establishmentMeans", "lastInterpreted",
  "mediaType", "issue",
] as const;

// A record's GBIF license code -> the sample's license name. Its keys are scripts/raw.ts OPEN_GBIF_LICENSES (tested).
export const RECORD_LICENSES: Readonly<Record<string, SampleLicense>> = { CC0_1_0: "CC0 1.0", CC_BY_4_0: "CC BY 4.0" };

export interface SampleRecord {
  id: number;
  datasetKey: string;
  speciesKey: number | null;
  taxonKey: number;
  license: SampleLicense;
  basisOfRecord: string;
  longitude: string;
  latitude: string;
  coordinateUncertaintyM: string | null;
  countryCode: string | null;
  year: number | null;
  month: number | null;
}

export interface ParseContext {
  // The download's creation year: a later year is an error in the data.
  downloadYear: number;
  // Every dataset in GBIF's listing for the download.
  datasetKeys: ReadonlySet<string>;
}

const COLUMN = Object.fromEntries(SIMPLE_CSV_HEADER.map((h, i) => [h, i])) as Record<(typeof SIMPLE_CSV_HEADER)[number], number>;
const INTEGER = /^-?\d+$/;
// A plain decimal, optionally with an exponent: no hex, no blanks, no Infinity or NaN.
const DECIMAL = /^-?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/;
const BASIS = new Set<string>(BASIS_OF_RECORD);

class Line {
  constructor(readonly n: number, private readonly fields: string[]) {}

  fail(reason: string): never {
    throw new Error(`simple-csv: line ${this.n}: ${reason}`);
  }

  text(name: keyof typeof COLUMN): string | null {
    const v = this.fields[COLUMN[name]];
    return v === "" ? null : v;
  }

  required(name: keyof typeof COLUMN): string {
    return this.text(name) ?? this.fail(`${name} is empty`);
  }

  // An integer in min..max, or null when empty.
  integer(name: keyof typeof COLUMN, min: number, max = Number.MAX_SAFE_INTEGER): number | null {
    const v = this.text(name);
    if (v === null) return null;
    const n = Number(v);
    if (!INTEGER.test(v) || !Number.isSafeInteger(n)) this.fail(`${name} ${v}: not an integer`);
    if (n < min || n > max) this.fail(`${name} ${v}: outside ${min}..${max}`);
    return n;
  }

  // A finite decimal in min..max, kept as GBIF's text, or null when empty.
  decimal(name: keyof typeof COLUMN, min: number, max: number): string | null {
    const v = this.text(name);
    if (v === null) return null;
    const n = Number(v);
    if (!DECIMAL.test(v) || !Number.isFinite(n)) this.fail(`${name} ${v}: not a finite number`);
    if (n < min || n > max) this.fail(`${name} ${v}: outside ${min}..${max}`);
    return v;
  }

  oneOf<T extends string>(name: keyof typeof COLUMN, allowed: ReadonlySet<string>): T {
    const v = this.fields[COLUMN[name]];
    if (!allowed.has(v)) this.fail(`${name} ${JSON.stringify(v)}: not one of ${[...allowed].join(", ")}`);
    return v as T;
  }
}

const LICENSE_CODES = new Set(Object.keys(RECORD_LICENSES));
const PRESENT = new Set(["PRESENT"]);

function parseRecord(line: Line, ctx: ParseContext): SampleRecord {
  const id = line.integer("gbifID", 1) ?? line.fail("gbifID is empty");
  const datasetKey = line.required("datasetKey");
  if (!ctx.datasetKeys.has(datasetKey)) line.fail(`datasetKey ${datasetKey}: not in the download's datasets`);
  line.oneOf("occurrenceStatus", PRESENT);
  return {
    id,
    datasetKey,
    speciesKey: line.integer("speciesKey", 1),
    taxonKey: line.integer("taxonKey", 1) ?? line.fail("taxonKey is empty"),
    license: RECORD_LICENSES[line.oneOf("license", LICENSE_CODES)],
    basisOfRecord: line.oneOf("basisOfRecord", BASIS),
    longitude: line.decimal("decimalLongitude", -180, 180) ?? line.fail("decimalLongitude is empty"),
    latitude: line.decimal("decimalLatitude", -90, 90) ?? line.fail("decimalLatitude is empty"),
    coordinateUncertaintyM: line.decimal("coordinateUncertaintyInMeters", 0, Number.MAX_VALUE),
    countryCode: line.text("countryCode"),
    year: line.integer("year", 1, ctx.downloadYear),
    month: line.integer("month", 1, 12),
  };
}

// Every record of a SIMPLE_CSV file, given its lines without newlines (an array, or readline over `unzip -p`). The
// header must be SIMPLE_CSV_HEADER; a refused field or a gbifID seen twice fails the whole file.
export async function readSimpleCsv(lines: Iterable<string> | AsyncIterable<string>, ctx: ParseContext): Promise<SampleRecord[]> {
  const records: SampleRecord[] = [];
  const firstLine = new Map<number, number>();
  let n = 0;
  for await (const text of lines) {
    n += 1;
    const fields = text.split("\t");
    if (n === 1) {
      if (fields.length !== SIMPLE_CSV_HEADER.length || fields.some((f, i) => f !== SIMPLE_CSV_HEADER[i])) {
        throw new Error("simple-csv: line 1: header is not GBIF's SIMPLE_CSV (scripts/learn/simple-csv.ts SIMPLE_CSV_HEADER)");
      }
      continue;
    }
    const line = new Line(n, fields);
    if (fields.length !== SIMPLE_CSV_HEADER.length) line.fail(`${fields.length} fields, expected ${SIMPLE_CSV_HEADER.length}`);
    const record = parseRecord(line, ctx);
    const first = firstLine.get(record.id);
    if (first !== undefined) line.fail(`gbifID ${record.id} twice (first on line ${first})`);
    firstLine.set(record.id, n);
    records.push(record);
  }
  if (n === 0) throw new Error("simple-csv: no header");
  return records;
}
