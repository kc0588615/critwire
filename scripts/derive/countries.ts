// Countries rule (plan §5.4, §5.5): range.countriesWithRecords from a settled GBIF taxon's licensed COUNTRY facet.
// Pure: no fs, network or clock. The field means "countries with records", never native range.
//
// The minimum-records rule (the brief's guard against strays): a country outside the species' core region needs
// more than STRAY_MAX counted records; inside the core one record is enough. Region alone never excludes.
// - core: the region with the most countries (every country votes, strays included); a tie goes to the region with
//   the most records, and regions still tied are all core. Counting countries, not records, keeps zoo-heavy species
//   right: the Asian elephant's top country is US (4,461 of 6,877), but ASIA has 13 of its 20 countries.
// - Outside the core: 1 record is an excluded stray (all 39 such singletons on 2026-10-20 were captive or misplaced,
//   e.g. tiger KE, MW); 2 or more are kept and flagged country-captive-suspect for review (tiger DE 6, RU 8).
// - Inside the core, in species with at least BORDERLINE_MIN_SPECIES_RECORDS records: 1–BORDERLINE_MAX records are
//   kept and flagged country-borderline. Below 50 records, 52% of countries have ≤ 2, so a thin flag means nothing.
//   A global minimum of 2 would drop 62 thin in-core countries, mostly native (aardvark BF, GH; jaguar HN, SR).
// - Regions are GBIF's gbifRegion, with NORTH_AMERICA (only CA, GL, PM, US) and LATIN_AMERICA merged into AMERICAS,
//   so spiny softshell MX, black-footed ferret MX and jaguar US aren't flagged. EUROPE and ASIA stay apart (tiger DE).
// Owner overrides (data/review/country-overrides.json) apply last and replace the country's entry.
import { assertOpenLicenses, type GbifOccurrenceResponse, type GbifSnapshot } from "../raw.ts";
import type { CountryOverride, Mismatch } from "../species.ts";

export const STRAY_MAX = 1;
export const BORDERLINE_MAX = 2;
export const BORDERLINE_MIN_SPECIES_RECORDS = 50;
export const MERGED_REGIONS: Readonly<Record<string, string>> = { NORTH_AMERICA: "AMERICAS", LATIN_AMERICA: "AMERICAS" };

const FIELD = "range.countriesWithRecords";
const UNKNOWN_COUNTRY = "ZZ";
const OVERRIDE_KEYS = ["action", "country", "reason", "speciesId"];

export interface CountriesInput {
  species: { id: number; scientificName: string };
  // The settled GBIF taxon's occurrence response, or null when the taxon isn't settled (countries are then null).
  occurrences: GbifOccurrenceResponse | null;
  regions: GbifSnapshot["countries"];
  // All overrides; only this species' are applied.
  overrides: readonly CountryOverride[];
}

export interface CountriesResult { value: string[] | null; entries: Mismatch[] }

const byCode = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export function deriveCountries({ species, occurrences, regions, overrides }: CountriesInput): CountriesResult {
  const mine = overrides.filter((o) => o.speciesId === species.id);
  if (occurrences === null) {
    if (mine.length) throw new Error(`country-overrides: species ${species.id} (${species.scientificName}) has null countries; remove its overrides`);
    return { value: null, entries: [] };
  }
  assertOpenLicenses(occurrences);

  const counts = countryCounts(occurrences, species.scientificName);
  const entry = (kind: Mismatch["kind"], severity: Mismatch["severity"], country: string | undefined, values: Record<string, unknown>, reason: string): Mismatch => ({
    speciesId: species.id, scientificName: species.scientificName, field: FIELD, kind, severity,
    ...(country === undefined ? {} : { country }), values, reason,
  });
  for (const o of mine) {
    if (o.action === "keep" && !counts.has(o.country)) {
      throw new Error(`country-overrides: keep ${o.country} for species ${species.id} (${species.scientificName}), which has no counted records there`);
    }
  }
  if (counts.size === 0) {
    return { value: [], entries: [entry("no-records", "info", undefined, { gbif: { speciesRecords: 0 } }, "No CC0 or CC BY 4.0 records with a known country match the filters.")] };
  }

  const region = (c: string) => {
    const r = regions[c]?.gbifRegion;
    if (!r) throw new Error(`gbif: country ${c} (${species.scientificName}) is not in GBIF's country enumeration`);
    return MERGED_REGIONS[r] ?? r;
  };
  const total = [...counts.values()].reduce((a, n) => a + n, 0);
  const core = coreRegions(counts, region);
  const coreList = [...core].sort(byCode);
  const coreText = coreList.join(", ");

  const published = new Set<string>();
  const entries = new Map<string, Mismatch>();
  for (const [c, n] of counts) {
    const r = region(c);
    const values = { gbif: { records: n, region: r, speciesRecords: total, coreRegions: coreList } };
    const records = `${n} record${n === 1 ? "" : "s"}`;
    if (!core.has(r) && n <= STRAY_MAX) {
      entries.set(c, entry("country-captive-suspect", "blocking", c, values,
        `${c} (${r}) has ${records}, outside the core region (${coreText}); excluded as a stray. Restore with keep in country-overrides.json.`));
      continue;
    }
    published.add(c);
    if (!core.has(r)) {
      entries.set(c, entry("country-captive-suspect", "review", c, values,
        `${c} (${r}) has ${records}, outside the core region (${coreText}); kept. Settle with keep or remove in country-overrides.json.`));
    } else if (total >= BORDERLINE_MIN_SPECIES_RECORDS && n <= BORDERLINE_MAX) {
      entries.set(c, entry("country-borderline", "review", c, values,
        `${c} has ${records} of ${total}; kept. Settle with keep or remove in country-overrides.json.`));
    }
  }

  for (const o of mine) {
    if (o.action === "keep") published.add(o.country);
    else published.delete(o.country);
    entries.delete(o.country);
  }
  const sortedEntries = [...entries.keys()].sort(byCode).map((c) => entries.get(c)!);
  return { value: [...published].sort(byCode), entries: sortedEntries };
}

// Counted records per country from the COUNTRY facet, ZZ dropped. Throws on malformed counts.
function countryCounts(occurrences: GbifOccurrenceResponse, name: string): Map<string, number> {
  const facet = occurrences.facets.find((f) => f.field === "COUNTRY");
  if (!facet && occurrences.count > 0) throw new Error(`gbif: no COUNTRY facet for ${occurrences.count} records (${name})`);
  const counts = new Map<string, number>();
  for (const { name: c, count } of facet?.counts ?? []) {
    if (!Number.isInteger(count) || count < 1) throw new Error(`gbif: bad count ${count} for ${c} (${name})`);
    if (counts.has(c)) throw new Error(`gbif: duplicate country ${c} (${name})`);
    if (c !== UNKNOWN_COUNTRY) counts.set(c, count);
  }
  return counts;
}

// Regions with the most countries; ties go to the most records; regions still tied are all core.
function coreRegions(counts: Map<string, number>, region: (c: string) => string): Set<string> {
  const tally = new Map<string, { countries: number; records: number }>();
  for (const [c, n] of counts) {
    const t = tally.get(region(c)) ?? { countries: 0, records: 0 };
    tally.set(region(c), { countries: t.countries + 1, records: t.records + n });
  }
  const best = [...tally.values()].reduce((a, b) => (b.countries > a.countries || (b.countries === a.countries && b.records > a.records) ? b : a));
  return new Set([...tally].filter(([, t]) => t.countries === best.countries && t.records === best.records).map(([r]) => r));
}

// Validates data/review/country-overrides.json. Per-species checks (keep without records, null countries) run in
// deriveCountries.
export function parseOverrides(raw: unknown, speciesIds: ReadonlySet<number>): CountryOverride[] {
  if (!Array.isArray(raw)) throw new Error("country-overrides: must be an array");
  const seen = new Set<string>();
  return raw.map((o, i) => {
    const at = `country-overrides[${i}]`;
    if (o === null || typeof o !== "object" || Array.isArray(o)) throw new Error(`${at}: must be an object`);
    const keys = Object.keys(o).sort(byCode);
    if (keys.join() !== OVERRIDE_KEYS.join()) throw new Error(`${at}: keys must be exactly ${OVERRIDE_KEYS.join(", ")}, got ${keys.join(", ")}`);
    const { speciesId, country, action, reason } = o as Record<string, unknown>;
    if (typeof speciesId !== "number" || !speciesIds.has(speciesId)) throw new Error(`${at}: unknown species ${JSON.stringify(speciesId)}`);
    if (typeof country !== "string" || !/^[A-Z]{2}$/.test(country) || country === UNKNOWN_COUNTRY) throw new Error(`${at}: bad country ${JSON.stringify(country)}`);
    if (action !== "keep" && action !== "remove") throw new Error(`${at}: action must be keep or remove, got ${JSON.stringify(action)}`);
    if (typeof reason !== "string" || reason.trim() === "") throw new Error(`${at}: reason must be a non-empty string`);
    const key = `${speciesId}:${country}`;
    if (seen.has(key)) throw new Error(`${at}: duplicate override for species ${speciesId} country ${country}`);
    seen.add(key);
    return { speciesId, country, action, reason };
  });
}
