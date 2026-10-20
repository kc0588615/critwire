// GBIF rule (plan §5.3): ids.gbif (the legacy backbone usage key) and which taxon's occurrences the countries come
// from. Pure: no fs, network or clock. Never a source of taxonomy.
// - taxonKey null means the countries are null; the ids.gbif entry explains both, except for the lump guard below.
// - Several Wikidata P846 values: ids.gbif is null; the multi-value entry is the Wikidata rule's.
// - Lump guard (heuristic): a synonym whose accepted name has another epithet keeps ids.gbif, but its countries
//   would be another species' occurrences, so they are null with an identity entry. A matching epithet doesn't prove
//   the accepted taxon has the same scope; the synonym-info entry points a person at those cases.
import { gbifTaxonKey, type GbifMatchResponse } from "../raw.ts";
import type { Mismatch } from "../species.ts";

export interface GbifResult {
  id: number | null;
  // The GBIF taxon whose occurrences are counted (accepted key, else usage key), or null: countries are null.
  taxonKey: number | null;
  entries: Mismatch[];
}

// The backbone's license URL; anything else throws.
const LICENSES: Readonly<Record<string, string>> = { "http://creativecommons.org/licenses/by/4.0/legalcode": "CC BY 4.0" };
export function gbifBackboneLicense(license: string): string {
  const out = LICENSES[license];
  if (!out) throw new Error(`gbif: unknown backbone license ${JSON.stringify(license)}`);
  return out;
}

function integerKey(raw: string, what: string, name: string): number {
  if (!/^\d+$/.test(raw) || !Number.isSafeInteger(Number(raw))) throw new Error(`gbif: ${what} ${JSON.stringify(raw)} is not an integer (${name})`);
  return Number(raw);
}

const epithet = (name: string) => name.split(" ")[1];

export function deriveGbif(species: { id: number; scientificName: string }, match: GbifMatchResponse, p846: readonly number[]): GbifResult {
  const N = species.scientificName;
  const entries: Mismatch[] = [];
  const entry = (field: string, kind: Mismatch["kind"], severity: Mismatch["severity"], values: Record<string, unknown>, reason: string) =>
    entries.push({ speciesId: species.id, scientificName: N, field, kind, severity, values, reason });
  const none = (): GbifResult => ({ id: null, taxonKey: null, entries });

  const u = match.usage, a = match.acceptedUsage;
  const usageKey = u ? integerKey(u.key, "usage key", N) : null;
  const acceptedKey = a ? integerKey(a.key, "accepted key", N) : null;

  if (p846.length > 1) return none();

  const matchType = match.diagnostics.matchType;
  const animal = (match.classification ?? []).some((t) => t.rank === "KINGDOM" && t.name === "Animalia");
  if (!u || usageKey === null || matchType !== "EXACT" || u.rank !== "SPECIES" || u.canonicalName !== N || !animal) {
    entry("ids.gbif", "not-found", "blocking",
      { gbif: { matchType, rank: u?.rank ?? null, canonicalName: u?.canonicalName ?? null, kingdom: animal ? "Animalia" : null } },
      `The GBIF backbone has no exact Animalia species match for ${N} (${matchType}${u ? `: ${u.rank} ${u.canonicalName}` : ""}); ids.gbif and the countries are null.`);
    return none();
  }
  if (p846.length === 1 && p846[0] !== usageKey && p846[0] !== acceptedKey) {
    entry("ids.gbif", "identity", "blocking", { gbif: { usageKey, ...(acceptedKey === null ? {} : { acceptedKey }) }, wikidata: [...p846] },
      `GBIF matches ${N} to ${usageKey}${acceptedKey === null ? "" : ` (accepted ${acceptedKey})`}, but Wikidata P846 is ${p846[0]}; ids.gbif and the countries are null.`);
    return none();
  }

  const status = u.status ?? "";
  if (status === "ACCEPTED") return { id: usageKey, taxonKey: gbifTaxonKey(match), entries };
  if (!status.includes("SYNONYM")) {
    entry("ids.gbif", "identity", "blocking", { gbif: { usageKey, status: status || null } },
      `GBIF backbone ${usageKey} (${N}) has status ${status || "none"}; ids.gbif and the countries are null.`);
    return none();
  }
  if (!a || acceptedKey === null) throw new Error(`gbif: ${status} ${usageKey} (${N}) has no accepted usage`);
  entry("ids.gbif", "synonym-info", "info", { gbif: { usageKey, status, accepted: { key: acceptedKey, name: a.canonicalName } } },
    `The GBIF backbone calls ${N} (${usageKey}) a synonym of ${a.canonicalName} (${acceptedKey}); the countries are counted for ${acceptedKey}, which covers all its synonyms.`);
  if (epithet(a.canonicalName) !== epithet(N)) {
    entry("range.countriesWithRecords", "identity", "blocking", { gbif: { usageKey, accepted: { key: acceptedKey, name: a.canonicalName } } },
      `GBIF's accepted name ${a.canonicalName} has another epithet than ${N} (a lump), so its records may be another species'; the countries are null.`);
    return { id: usageKey, taxonKey: null, entries };
  }
  return { id: usageKey, taxonKey: gbifTaxonKey(match), entries };
}
