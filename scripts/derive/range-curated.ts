// data/review/range-curated.json: agents' native listings for non-mammals, each citing its own reference (007; the brief's
// addendum: no review gate). A bare array, like country-overrides.json. deriveListings fills the constant columns.
import { isMammal } from "../ingest/mdd.ts";
import { assertNoIucnData } from "../raw.ts";
import type { BaseSpecies } from "../species.ts";
import type { Presence } from "./listings.ts";

export const rangeCuratedFile = new URL("../../data/review/range-curated.json", import.meta.url);

export interface CuratedRow { speciesId: number; country: string; area: string | null; presence: Presence; url: string; sourceTerm: string }

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const CURATED_KEYS = ["area", "country", "presence", "sourceTerm", "speciesId", "url"];
const CURATED_PRESENCE: readonly unknown[] = ["present", "uncertain", "absent"];

// Validates data/review/range-curated.json, agents' rows on non-mammals (one authority per claim: MDD speaks for mammals).
export function parseCurated(raw: unknown, base: readonly BaseSpecies[]): CuratedRow[] {
  if (!Array.isArray(raw)) throw new Error("range-curated: must be an array");
  const byId = new Map(base.map((s) => [s.id, s]));
  const seen = new Set<string>();
  return raw.map((r: unknown, i) => {
    const at = `range-curated[${i}]`;
    if (r === null || typeof r !== "object" || Array.isArray(r)) throw new Error(`${at}: must be an object`);
    const keys = Object.keys(r).sort(byText);
    if (keys.join() !== CURATED_KEYS.join()) throw new Error(`${at}: keys must be exactly ${CURATED_KEYS.join(", ")}, got ${keys.join(", ")}`);
    assertNoIucnData(r, at);
    const { speciesId, country, area, presence, url, sourceTerm } = r as Record<string, unknown>;
    const species = byId.get(speciesId as number);
    if (!species) throw new Error(`${at}: unknown species ${JSON.stringify(speciesId)}`);
    if (isMammal(species)) throw new Error(`${at}: species ${species.id} is a mammal: MDD is the native authority there`);
    if (typeof country !== "string" || !/^[A-Z]{2}$/.test(country)) throw new Error(`${at}: bad country ${JSON.stringify(country)}`);
    if (area !== null && (typeof area !== "string" || area.trim() === "")) throw new Error(`${at}: area must be null or non-blank text`);
    if (!CURATED_PRESENCE.includes(presence)) throw new Error(`${at}: presence must be present, uncertain or absent, got ${JSON.stringify(presence)}`);
    if (typeof url !== "string" || !url.startsWith("https://")) throw new Error(`${at}: url must be https, got ${JSON.stringify(url)}`);
    if (typeof sourceTerm !== "string" || sourceTerm.trim() === "") throw new Error(`${at}: sourceTerm must be non-blank text`);
    const key = JSON.stringify([speciesId, country, area, presence]);
    if (seen.has(key)) throw new Error(`${at}: duplicate of an earlier row (species ${speciesId}, country ${country}, area ${JSON.stringify(area)}, presence ${presence})`);
    seen.add(key);
    return { speciesId: species.id, country, area: area as string | null, presence: presence as Presence, url, sourceTerm };
  });
}
