// COL rule (plan §5.2): ids.col and the taxonomy from COL's accepted usage of the base name. Pure: no fs, network or
// clock. Whenever ids.col is null the taxonomy is the base one, and the single ids.col entry explains both.
// - Names are compared without a subgenus: COL writes "Marmota (Petromarmota) vancouverensis" for our
//   "Marmota vancouverensis", which is the same name. Any other difference (Zaglossus bruijni vs bruijnii) is not-found.
// - Several Wikidata P10585 values: ids.col is null; the multi-value entry is the Wikidata rule's.
import type { ColMatchResponse, ColTaxon } from "../raw.ts";
import type { BaseSpecies, Mismatch, Taxonomy } from "../species.ts";

export interface ColResult {
  id: string | null;
  taxonomy: Taxonomy;
  // Which source the published taxonomy is cited to.
  taxonomySource: "col" | "base";
  entries: Mismatch[];
}

const RANKS = ["class", "order", "family", "genus"] as const;
const ACCEPTED = new Set(["accepted", "provisionally accepted"]);
const SUBGENUS = /^(\S+) \([^)]+\) /;

// ChecklistBank gives "cc by" with no version; COL's site and GBIF's dataset record say 4.0. Anything else throws.
const LICENSES: Readonly<Record<string, string>> = { "cc by": "CC BY 4.0" };
export function colLicense(license: string): string {
  const out = LICENSES[license];
  if (!out) throw new Error(`col: unknown license ${JSON.stringify(license)}`);
  return out;
}

export function deriveCol(species: BaseSpecies, match: ColMatchResponse, p10585: readonly string[]): ColResult {
  const N = species.scientificName;
  const entries: Mismatch[] = [];
  const entry = (field: string, kind: Mismatch["kind"], severity: Mismatch["severity"], values: Record<string, unknown>, reason: string) =>
    entries.push({ speciesId: species.id, scientificName: N, field, kind, severity, values, reason });
  const fallback = (): ColResult => ({ id: null, taxonomy: { ...species.taxonomy }, taxonomySource: "base", entries });

  if (p10585.length > 1) return fallback();

  const u = match.usage;
  const classification = u?.classification ?? [];
  const animal = classification.some((t) => t.rank === "kingdom" && t.name === "Animalia");
  const sameName = match.match && (match.type === "exact" || match.type === "variant") && u?.rank === "species" && u.name.replace(SUBGENUS, "$1 ") === N;
  if (!u || !sameName || !animal) {
    entry("ids.col", "not-found", "blocking",
      { col: { match: match.match, type: match.type ?? null, name: u?.name ?? null, rank: u?.rank ?? null, kingdom: animal ? "Animalia" : null } },
      `COL has no accepted Animalia species named ${N} (match ${match.type ?? "none"}: ${u ? `${u.rank} ${u.name}` : "no usage"}); ids.col is null and the taxonomy is the base one.`);
    return fallback();
  }
  if (!ACCEPTED.has(u.status ?? "")) {
    const accepted = /synonym/.test(u.status ?? "") ? classification.find((t) => t.id === u.parentId) : undefined;
    if (accepted) {
      entry("ids.col", "identity", "blocking", { col: { id: u.id, status: u.status, accepted: { id: accepted.id, name: accepted.name } } },
        `COL ${u.id} calls ${N} a ${u.status} of ${accepted.name} (${accepted.id}); ids.col is null and the taxonomy is the base one.`);
    } else {
      entry("ids.col", "not-found", "blocking", { col: { id: u.id, status: u.status ?? null } },
        `COL ${u.id} has status ${u.status ?? "none"} for ${N}, with no accepted name; ids.col is null and the taxonomy is the base one.`);
    }
    return fallback();
  }
  if (p10585.length === 1 && p10585[0] !== u.id) {
    entry("ids.col", "identity", "blocking", { col: u.id, wikidata: [...p10585] },
      `COL matches ${N} to ${u.id}, but Wikidata P10585 is ${p10585[0]}; ids.col is null and the taxonomy is the base one.`);
    return fallback();
  }
  const rank = (r: string): ColTaxon | undefined => classification.find((t) => t.rank === r);
  const genus = rank("genus")?.name;
  const firstWord = N.split(" ")[0];
  if (genus !== undefined && genus !== firstWord) {
    entry("ids.col", "identity", "blocking", { col: { id: u.id, genus } },
      `COL ${u.id} puts ${N} in genus ${genus}, not ${firstWord}; ids.col is null and the taxonomy is the base one.`);
    return fallback();
  }

  if (u.status === "provisionally accepted") {
    entry("ids.col", "status-info", "info", { col: { status: u.status } }, `COL ${u.id} lists ${N} as provisionally accepted.`);
  }
  const missing = RANKS.filter((r) => rank(r) === undefined);
  if (missing.length) {
    entry("taxonomy", "not-found", "blocking", { col: { id: u.id, missing } },
      `COL ${u.id} has no ${missing.join(", ")} for ${N}; the taxonomy is the base one.`);
    return { id: u.id, taxonomy: { ...species.taxonomy }, taxonomySource: "base", entries };
  }
  const name = (r: (typeof RANKS)[number]) => rank(r)!.name;
  const taxonomy: Taxonomy = { class: name("class"), order: name("order"), family: name("family"), genus: name("genus") };
  for (const r of RANKS) {
    if (taxonomy[r] !== species.taxonomy[r]) {
      entry(`taxonomy.${r}`, "taxonomy-info", "info", { base: species.taxonomy[r], col: taxonomy[r] },
        `COL ${u.id} gives ${r} ${taxonomy[r]}; base had ${species.taxonomy[r]}.`);
    }
  }
  return { id: u.id, taxonomy, taxonomySource: "col", entries };
}
