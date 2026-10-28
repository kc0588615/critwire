// The lab sample's rules (plan D6, 004 §4.2), pure: species, effective license, the cap and the country-key contract.
// Ported from the spike's etl/sample_rules.py. The ingest applies the first three; derive applies the country keys (D7).
import { createHash } from "node:crypto";

// GBIF's non-country codes: the raw code is kept, country_code is NULL.
export const NON_COUNTRY = { ZZ: "unknown or invalid", XZ: "international waters" } as const;
// At most this many records per species.
export const CAP = 2000;
// Licenses from least to most restrictive; a record's effective license is the later of its own and its dataset's.
export const LICENSE_ORDER = ["CC0 1.0", "CC BY 4.0", "CC BY-NC 4.0"] as const;
export type SampleLicense = (typeof LICENSE_ORDER)[number];
export const OPEN_LICENSES: readonly SampleLicense[] = ["CC0 1.0", "CC BY 4.0"];

// The fingerprint written into download.json: derive refuses a sample built under other rules (MF3). Change it with
// any rule above.
export const SAMPLE_RULES = {
  species: "speciesKey, else taxonKey, is a critwire ids.gbif; none or two species fails",
  licenseOrder: [...LICENSE_ORDER],
  openLicenses: [...OPEN_LICENSES],
  cap: CAP,
  capOrder: "per species, ascending md5 of the decimal gbifID text, then gbifID",
};

export type CountryKey = { gbif: string | null; code: string | null };

// {raw countryCode: rows} -> {raw: country keys}. Empty or NULL: both NULL; ZZ/XZ: raw kept, code NULL; a countries
// code: itself. Any other code fails, naming it and its rows.
export function countryKeys(counts: ReadonlyMap<string | null, number>, countryCodes: ReadonlySet<string>): Map<string | null, CountryKey> {
  const out = new Map<string | null, CountryKey>();
  const unknown: string[] = [];
  for (const [raw, n] of counts) {
    if (raw === null || raw === "") out.set(raw, { gbif: null, code: null });
    else if (countryCodes.has(raw)) out.set(raw, { gbif: raw, code: raw });
    else if (Object.hasOwn(NON_COUNTRY, raw)) out.set(raw, { gbif: raw, code: null });
    else unknown.push(`${raw} (${n} rows)`);
  }
  if (unknown.length) throw new Error(`country codes with no countries row and not ZZ/XZ: ${unknown.sort().join(", ")}`);
  return out;
}

// The critwire species id for a record: the species whose ids.gbif is speciesKey, else taxonKey (our key is a
// legacy synonym). Neither, or two different species, fails.
export function speciesFor(speciesKey: number | null, taxonKey: number | null, byGbif: ReadonlyMap<number, number>): number {
  const a = speciesKey === null ? undefined : byGbif.get(speciesKey);
  const b = taxonKey === null ? undefined : byGbif.get(taxonKey);
  if (a !== undefined && b !== undefined && a !== b) throw new Error(`speciesKey ${speciesKey} is species ${a}, taxonKey ${taxonKey} is species ${b}`);
  const id = a ?? b;
  if (id === undefined) throw new Error(`neither speciesKey ${speciesKey} nor taxonKey ${taxonKey} is a critwire ids.gbif`);
  return id;
}

const licenseRank = (license: string) => {
  const i = (LICENSE_ORDER as readonly string[]).indexOf(license);
  if (i < 0) throw new Error(`unknown license ${JSON.stringify(license)}`);
  return i;
};

// The more restrictive of a record's and its dataset's license ("if unclear, don't publish").
export function effectiveLicense(record: string, dataset: string): SampleLicense {
  return LICENSE_ORDER[Math.max(licenseRank(record), licenseRank(dataset))];
}

// The cap's order key: md5 of the decimal gbifID text, as DuckDB's and PostgreSQL's md5(CAST(id AS VARCHAR)).
export const orderKey = (gbifId: number) => createHash("md5").update(String(gbifId)).digest("hex");

// At most `cap` rows per species_id, by ascending order key, then gbifID; sorted by id. A duplicate id fails.
export function capSample<T extends { id: number; species_id: number }>(rows: readonly T[], cap = CAP, key = orderKey): T[] {
  const seen = new Set<number>();
  const per = new Map<number, { row: T; key: string }[]>();
  for (const row of rows) {
    if (seen.has(row.id)) throw new Error(`gbifID ${row.id} twice`);
    seen.add(row.id);
    const group = per.get(row.species_id) ?? [];
    group.push({ row, key: key(row.id) });
    per.set(row.species_id, group);
  }
  const kept = [...per.values()].flatMap((group) =>
    group.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : a.row.id - b.row.id)).slice(0, cap).map((x) => x.row),
  );
  return kept.sort((a, b) => a.id - b.id);
}
