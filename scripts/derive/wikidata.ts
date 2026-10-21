// Wikidata rule (plan §5.1): ids.wikidata, ids.inaturalist, ids.ncbi, the P627 check against base ids.iucn, and the
// P846/P10585 evidence the GBIF and COL rules cross-check. Pure: no fs, network or clock.
// - Items are found by exact P225 == scientificName. With several items, property values are pooled over all of
//   them, so an ambiguous item can't hide a conflicting P846, P10585 or P627.
// - Cardinality first: a property with more than one distinct value nulls the field it serves (multi-value entry)
//   before any value is used or compared. The P846/P10585 entries are written here; the GBIF/COL rules only null.
// - ids.iucn always keeps the base value. Items reached only through the base IUCN id are used for nothing but the
//   reason of an iucn-id entry.
import { wikidataQuery } from "../ingest/wikidata.ts";
import type { SparqlBinding, WikidataSnapshot } from "../raw.ts";
import type { BaseSpecies, Mismatch } from "../species.ts";

export interface WikidataResult {
  ids: { wikidata: string | null; inaturalist: number | null; ncbi: number | null };
  // Pooled distinct values over all items for the name, sorted. More than one value means the GBIF/COL rule must
  // null its id; its multi-value entry is already in `entries`.
  p846: number[];
  p10585: string[];
  entries: Mismatch[];
}

const ENTITY = /^http:\/\/www\.wikidata\.org\/entity\/(Q[1-9]\d*)$/;
const INTEGER_PROPS = new Set(["P3151", "P685", "P846"]);

const byText = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const byNumber = (a: number, b: number) => a - b;

// Throws unless the snapshot was fetched with the query this base produces (catches renamed names, changed IUCN ids
// and query changes alike).
export function assertWikidataFresh(snapshot: WikidataSnapshot, base: BaseSpecies[]): void {
  if (snapshot.query !== wikidataQuery(base)) throw new Error("data/raw/wikidata is stale: run pnpm ingest wikidata");
}

export function bindingsByName(snapshot: WikidataSnapshot): Map<string, SparqlBinding[]> {
  const out = new Map<string, SparqlBinding[]>();
  for (const b of snapshot.response.results.bindings) {
    const name = b.name.value;
    out.set(name, [...(out.get(name) ?? []), b]);
  }
  return out;
}

export function deriveWikidata(species: BaseSpecies, bindings: readonly SparqlBinding[]): WikidataResult {
  const N = species.scientificName;
  const qid = (term: { value: string }) => {
    const m = ENTITY.exec(term.value);
    if (!m) throw new Error(`wikidata: item ${JSON.stringify(term.value)} is not a Q-id (${N})`);
    return m[1];
  };

  const items = new Set<string>();
  const props = new Map<string, Set<string>>();
  const baseIdItems = new Map<string, Set<string>>(); // items with P627 == base id → their P225 names
  for (const b of bindings) {
    if (b.name.value !== N) throw new Error(`wikidata: binding for ${b.name.value} passed to ${N}`);
    if (b.item) {
      items.add(qid(b.item));
      if (b.prop) {
        const prop = b.prop.value, value = b.value?.value;
        if (value === undefined) throw new Error(`wikidata: ${prop} without a value (${N})`);
        if (INTEGER_PROPS.has(prop) && !/^[1-9]\d*$/.test(value)) throw new Error(`wikidata: ${prop} value ${JSON.stringify(value)} is not a positive integer (${N})`);
        props.set(prop, (props.get(prop) ?? new Set()).add(value));
      }
    }
    if (b.iucnItem) {
      const q = qid(b.iucnItem);
      const names = baseIdItems.get(q) ?? new Set<string>();
      if (b.iucnItemName) names.add(b.iucnItemName.value);
      baseIdItems.set(q, names);
    }
  }
  const values = (prop: string) => [...(props.get(prop) ?? [])].sort(byText);
  const integers = (prop: string) => values(prop).map(Number).sort(byNumber);

  const entries: Mismatch[] = [];
  const entry = (field: string, kind: Mismatch["kind"], severity: Mismatch["severity"], v: Record<string, unknown>, reason: string) =>
    entries.push({ speciesId: species.id, scientificName: N, field, kind, severity, values: v, reason });

  const itemList = [...items].sort(byText);
  const ids: WikidataResult["ids"] = { wikidata: null, inaturalist: null, ncbi: null };
  if (itemList.length === 0) {
    entry("ids.wikidata", "not-found", "blocking", { wikidata: [] },
      `No Wikidata item has P225 ${N}; ids.wikidata, ids.inaturalist and ids.ncbi are null, and the COL and GBIF ids have no Wikidata cross-check.`);
  } else if (itemList.length > 1) {
    entry("ids.wikidata", "multi-value", "blocking", { wikidata: itemList },
      `Several Wikidata items have P225 ${N} (${itemList.join(", ")}); ids.wikidata, ids.inaturalist and ids.ncbi are null. P627, P846 and P10585 are checked over all of them.`);
  } else {
    ids.wikidata = itemList[0];
    for (const [prop, field] of [["P3151", "inaturalist"], ["P685", "ncbi"]] as const) {
      const vs = integers(prop);
      if (vs.length === 1) ids[field] = vs[0];
      else if (vs.length > 1) entry(`ids.${field}`, "multi-value", "blocking", { wikidata: values(prop) }, `Wikidata ${ids.wikidata} has ${vs.length} ${prop} values (${values(prop).join(", ")}); ids.${field} is null.`);
      else entry(`ids.${field}`, "not-found", "info", { wikidata: [] }, `Wikidata ${ids.wikidata} has no ${prop}.`);
    }
  }
  const itemText = ids.wikidata ? `Wikidata ${ids.wikidata}` : itemList.length ? `Wikidata items ${itemList.join(", ")}` : "Wikidata";

  const p846 = integers("P846");
  if (p846.length > 1) entry("ids.gbif", "multi-value", "blocking", { wikidata: p846 },
    `${itemText} (P225 ${N}) has ${p846.length} P846 values (${p846.join(", ")}); ids.gbif and the countries are null.`);
  const p10585 = values("P10585");
  if (p10585.length > 1) entry("ids.col", "multi-value", "blocking", { wikidata: p10585 },
    `${itemText} (P225 ${N}) has ${p10585.length} P10585 values (${p10585.join(", ")}); ids.col is null and the taxonomy is the base one.`);

  // P627: base ids.iucn is always kept.
  const baseId = species.ids.iucn;
  const p627 = values("P627");
  if (p627.length > 1) entry("ids.iucn", "multi-value", "blocking", { base: baseId, wikidata: p627 },
    `${itemText} (P225 ${N}) has ${p627.length} P627 values (${p627.join(", ")}). Kept ${baseId}.`);
  const foreign = [...baseIdItems].filter(([, names]) => !names.has(N)).sort(([a], [b]) => byText(a, b));
  const differs = p627.length === 1 && p627[0] !== String(baseId);
  if (differs || foreign.length) {
    const foreignNames = foreign.map(([q, names]) => [q, names.size ? [...names].sort(byText).join(" / ") : null] as const);
    const parts: string[] = [];
    if (differs) parts.push(`${itemText} (P225 ${N}) has P627 ${p627[0]}`);
    if (foreign.length) parts.push(`${baseId} is P627 of ${foreignNames.map(([q, n]) => `${q} (${n ?? "no P225"})`).join(", ")}`);
    entry("ids.iucn", "iucn-id", "blocking",
      { base: baseId, wikidata: p627, ...(foreign.length ? { wikidataItemsWithBaseId: Object.fromEntries(foreignNames) } : {}) },
      `${parts.join("; ")}. Kept ${baseId}.`);
  }

  return { ids, p846, p10585, entries };
}
