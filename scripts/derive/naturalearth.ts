// The countries matcher (002 §6, plan D4): Natural Earth admin-0 attributes → one row per code, the /v1/countries
// rows. Pure. Ported from A1's spike scripts/countries-draft.ts. GBIF's country enumeration is a cross-check, never a source.
// Rules:
// - code = ISO_A2_EH, else ISO_A2, each only if it's two capital letters (ISO_A2 is -99 for FR, NO, XK; CN-TW for TW);
//   rows with neither, and map units of TYPE "Overlay" (UNDOF, code XD), get no code
// - rows come from the countries layer; map_units adds only codes with no countries row (GF, MQ, RE, …)
// - several countries rows with one code (Brazil + Brazilian Island): keep the code's own unit, ADM0_A3 = ISO_A3_EH,
//   if exactly one row is; otherwise fail. Two map_units rows with one code fail.
// - name = NAME_EN, continent = CONTINENT, region = REGION_UN, subregion = SUBREGION; none may be empty;
//   names unique; every species code must have a row
// A future species code with no row gets the narrowest new rule on Natural Earth's own fields, never a hand-made row.
import { isDeepStrictEqual } from "node:util";
import { NE_COMMIT, NE_FIELDS, NE_RELEASE } from "../ingest/naturalearth.ts";
import type { NaturalEarthSnapshot, NeLayer } from "../raw.ts";

export type NeProps = Record<string, unknown>;
export const COUNTRY_COLUMNS = ["code", "name", "continent", "region", "subregion"] as const;
export type CountryRow = Record<(typeof COUNTRY_COLUMNS)[number], string>;
// index: the unit's position in its layer (file order).
export interface CountryMatch { layer: NeLayer; field: "ISO_A2" | "ISO_A2_EH"; index: number; unit: string }
// data/countries.json (pnpm derive): the rows and the Natural Earth release they come from.
export const countriesFile = new URL("../../data/countries.json", import.meta.url);
export interface CountriesFile { source: Pick<NaturalEarthSnapshot, "release" | "commit" | "retrieved">; rows: CountryRow[] }
export interface CountriesResult {
  rows: CountryRow[];
  report: {
    matches: Record<string, CountryMatch>;
    fromMapUnits: string[];
    folded: { code: string; kept: string; dropped: string[] }[];
    noCode: string[];
    overlays: string[];
    notInGbif: string[];
    gbifNotInRows: string[];
  };
}

const FIELDS = { name: "NAME_EN", continent: "CONTINENT", region: "REGION_UN", subregion: "SUBREGION" } as const;
const CODE = /^[A-Z]{2}$/;
const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const unitName = (layer: NeLayer, p: NeProps) => str(layer === "countries" ? p.ADMIN : p.GEOUNIT);
const sorted = (xs: Iterable<string>) => [...xs].sort();

// Throws unless the snapshot was cut by the current ingest: same release, commit and fields.
export function assertNaturalEarthFresh({ release, commit, fields }: NaturalEarthSnapshot): void {
  if (!isDeepStrictEqual(release, NE_RELEASE) || commit !== NE_COMMIT || !isDeepStrictEqual(fields, NE_FIELDS)) {
    throw new Error("data/raw/naturalearth is stale: run pnpm ingest naturalearth");
  }
}

function codeOf(p: NeProps): { code: string; field: CountryMatch["field"] } | null {
  const eh = str(p.ISO_A2_EH);
  const a2 = str(p.ISO_A2);
  if (CODE.test(eh)) return { code: eh, field: a2 === eh ? "ISO_A2" : "ISO_A2_EH" };
  if (CODE.test(a2)) return { code: a2, field: "ISO_A2" };
  return null;
}

type Unit = { p: NeProps; match: CountryMatch };

// Groups one layer's coded units by code; collects the names of units with no code and of Overlay units.
function group(layer: NeLayer, units: NeProps[], noCode: string[], overlays: string[]): Map<string, Unit[]> {
  const byCode = new Map<string, Unit[]>();
  units.forEach((p, index) => {
    if (str(p.TYPE) === "Overlay") { overlays.push(unitName(layer, p)); return; }
    const c = codeOf(p);
    if (!c) { noCode.push(unitName(layer, p)); return; }
    byCode.set(c.code, [...(byCode.get(c.code) ?? []), { p, match: { layer, field: c.field, index, unit: unitName(layer, p) } }]);
  });
  return byCode;
}

// The rows, sorted by code, and how each code matched. Throws on every rule failure and on a species code with no row.
export function matchCountries(layers: Record<NeLayer, NeProps[]>, { speciesCodes, gbifCodes }: { speciesCodes: string[]; gbifCodes: string[] }): CountriesResult {
  const noCode: string[] = [];
  const overlays: string[] = [];
  const folded: CountriesResult["report"]["folded"] = [];
  const picked = new Map<string, Unit>();

  for (const [code, units] of group("countries", layers.countries, noCode, overlays)) {
    let keep = units;
    if (units.length > 1) {
      keep = units.filter(({ p }) => str(p.ADM0_A3) !== "" && str(p.ADM0_A3) === str(p.ISO_A3_EH));
      if (keep.length !== 1) throw new Error(`code ${code} on ${units.length} countries rows: ${units.map((u) => u.match.unit).join(", ")}`);
      folded.push({ code, kept: keep[0].match.unit, dropped: units.filter((u) => u !== keep[0]).map((u) => u.match.unit) });
    }
    picked.set(code, keep[0]);
  }
  const fromMapUnits: string[] = [];
  // Map units with no code are mostly pieces of coded countries; only the countries layer's are reported.
  for (const [code, units] of group("map_units", layers.map_units, [], overlays)) {
    if (picked.has(code)) continue;
    if (units.length > 1) throw new Error(`code ${code} on ${units.length} map_units rows: ${units.map((u) => u.match.unit).join(", ")}`);
    picked.set(code, units[0]);
    fromMapUnits.push(code);
  }

  const rows = sorted(picked.keys()).map((code) => {
    const { p } = picked.get(code)!;
    const row: CountryRow = { code, name: "", continent: "", region: "", subregion: "" };
    for (const [column, field] of Object.entries(FIELDS) as [keyof typeof FIELDS, string][]) {
      row[column] = str(p[field]);
      if (!row[column]) throw new Error(`${code}: empty ${field}`);
    }
    return row;
  });
  const names = new Map<string, string[]>();
  for (const r of rows) names.set(r.name, [...(names.get(r.name) ?? []), r.code]);
  for (const [name, codes] of names) if (codes.length > 1) throw new Error(`name "${name}" on ${codes.length} codes: ${codes.join(", ")}`);

  const missing = sorted(new Set(speciesCodes.filter((c) => !picked.has(c))));
  if (missing.length) throw new Error(`no country row for ${missing.length} species codes: ${missing.join(", ")}`);

  const gbif = new Set(gbifCodes);
  return {
    rows,
    report: {
      matches: Object.fromEntries(sorted(picked.keys()).map((c) => [c, picked.get(c)!.match])),
      fromMapUnits: sorted(fromMapUnits),
      folded,
      noCode,
      overlays,
      notInGbif: rows.map((r) => r.code).filter((c) => !gbif.has(c)),
      gbifNotInRows: sorted([...gbif].filter((c) => !picked.has(c))),
    },
  };
}
