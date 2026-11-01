// Review presort evidence (mission plan 2026-11-01-critwire-review-presort, Q1): read-only GBIF, COL and Wikidata lookups
// for the review queue. Fetch and normalize only; no fs. Allowlists keep GBIF's IUCN category, recordedBy and COL's threat
// fields out; free text mentioning IUCN becomes null (assertEvidence is the gate).
import { COL_CITATIONS } from "../build/sources.ts";
import { bindingsByName } from "../derive/wikidata.ts";
import { getJson } from "../http.ts";
import { COL_API } from "../ingest/col.ts";
import { GBIF_API, occurrenceSearchQuery } from "../ingest/gbif.ts";
import { postSparql, WIKIDATA_ENDPOINT } from "../ingest/wikidata.ts";
import { gbifTaxonKey, type Snapshots } from "../raw.ts";
import type { Mismatch, Species } from "../species.ts";
import {
  entryKey, isCountryEntry,
  type ColEvidence, type DatasetEvidence, type Evidence, type EvidenceItem, type FacetEvidence, type GbifEvidence,
  type GbifRecord, type GbifSpeciesEvidence, type WikidataStatement,
} from "./presort.ts";

const FACETS = ["basisOfRecord", "datasetKey", "institutionCode", "establishmentMeans", "degreeOfEstablishment", "year", "stateProvince"];
const FACET_LIMIT = 100;
const RECORD_LIMIT = 20;
const REMARKS_MAX = 200;
const GBIF_404_TRIES = 4;
const IUCN = /iucn/i;
const WITHHELD = "(withheld)";
// Wikidata statement properties: the snapshot's id checks, plus indigenous to and endemic to.
const WIKIDATA_PROPS = ["P627", "P846", "P10585", "P3151", "P2341", "P183"];
const RANGE_PROPS = new Set(["P2341", "P183"]);
// The Red List's item: a P2341 or P183 statement it sources is IUCN range data, whichever site repeats it.
const RED_LIST_ITEM = "Q32059";
const SPARQL_VARS = ["statement", "item", "prop", "value", "rank", "country", "reference", "statedIn", "retrieved", "refUrl"];

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);
const text = (v: unknown): string | null => (typeof v === "string" && v !== "" && !IUCN.test(v) ? v : null);
const qid = (iri: string) => iri.slice(iri.lastIndexOf("/") + 1);

// GBIF sometimes answers a valid URL with an empty 404 (first run: an occurrence search; the same URL then 200s), and
// getJson never retries a 404. A few more tries; a 404 that stays still throws.
async function getGbif(url: string): Promise<unknown> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await getJson(url);
    } catch (e) {
      if (attempt >= GBIF_404_TRIES || !/HTTP 404/.test((e as Error).message)) throw e;
    }
  }
}

// GBIF's facet field for a query parameter: datasetKey → DATASET_KEY.
const facetField = (param: string) => param.replace(/[A-Z]/g, (c) => `_${c}`).toUpperCase();

function toRecord(url: string, r: Record<string, unknown>): GbifRecord {
  if (!Number.isSafeInteger(r.key) || typeof r.datasetKey !== "string" || typeof r.license !== "string" || typeof r.basisOfRecord !== "string") {
    throw new Error(`gbif: ${url}: bad record ${JSON.stringify(r).slice(0, 300)}`);
  }
  const record: GbifRecord = {
    key: r.key as number, datasetKey: r.datasetKey, license: r.license, basisOfRecord: r.basisOfRecord,
    institutionCode: text(r.institutionCode),
    year: r.year as number | undefined,
    month: r.month as number | undefined,
    decimalLatitude: r.decimalLatitude as number | undefined,
    decimalLongitude: r.decimalLongitude as number | undefined,
    coordinateUncertaintyInMeters: r.coordinateUncertaintyInMeters as number | undefined,
    stateProvince: text(r.stateProvince),
    locality: text(r.locality),
    establishmentMeans: text(r.establishmentMeans),
    degreeOfEstablishment: text(r.degreeOfEstablishment),
    issues: ((r.issues as string[] | undefined) ?? []).filter((i) => !IUCN.test(i)),
    occurrenceRemarks: text(typeof r.occurrenceRemarks === "string" ? r.occurrenceRemarks.slice(0, REMARKS_MAX) : null),
  };
  return Object.fromEntries(Object.entries(record).filter(([, v]) => v !== null && v !== undefined)) as unknown as GbifRecord;
}

function toFacets(url: string, count: number, facets: { field: string; counts: { name: string; count: number }[] }[]): Record<string, FacetEvidence> {
  const out: Record<string, FacetEvidence> = {};
  for (const param of FACETS) {
    const raw = facets.find((f) => f.field === facetField(param))?.counts ?? [];
    for (const c of raw) if (!Number.isSafeInteger(c.count)) throw new Error(`gbif: ${url}: facet ${param} bad count ${JSON.stringify(c)}`);
    const counts = raw.map((c) => ({ name: IUCN.test(c.name) ? WITHHELD : c.name, count: c.count })).sort((a, b) => b.count - a.count || cmp(a.name, b.name));
    out[param] = { counts, truncated: counts.reduce((sum, c) => sum + c.count, 0) < count };
  }
  return out;
}

// One country entry's query: derive's taxon and record filters, plus the country.
async function fetchCountryEvidence(taxonKey: number, country: string): Promise<GbifEvidence> {
  const params = [`country=${country}`, ...FACETS.map((f) => `facet=${f}`), `facetLimit=${FACET_LIMIT}`];
  const url = `${GBIF_API}/v1/occurrence/search?${occurrenceSearchQuery([taxonKey], params, RECORD_LIMIT)}`;
  const r = (await getGbif(url)) as { count?: unknown; results?: unknown; facets?: unknown };
  if (!Number.isSafeInteger(r.count) || !Array.isArray(r.results) || !Array.isArray(r.facets)) {
    throw new Error(`gbif: ${url}: no count/results/facets in ${JSON.stringify(r).slice(0, 300)}`);
  }
  const count = r.count as number;
  return { taxonKey, url, count, facets: toFacets(url, count, r.facets), records: (r.results as Record<string, unknown>[]).map((x) => toRecord(url, x)) };
}

async function fetchDataset(key: string): Promise<DatasetEvidence> {
  const r = (await getGbif(`${GBIF_API}/v1/dataset/${key}`)) as Record<string, unknown>;
  return { title: text(r.title), type: text(r.type), license: text(r.license), doi: text(r.doi), publishingOrganizationKey: text(r.publishingOrganizationKey) };
}

async function fetchGbifSpecies(key: number): Promise<GbifSpeciesEvidence> {
  const url = `${GBIF_API}/v1/species/${key}`;
  const r = (await getGbif(url)) as Record<string, unknown>;
  if (r.key !== key || typeof r.scientificName !== "string" || typeof r.rank !== "string" || typeof r.taxonomicStatus !== "string") {
    throw new Error(`gbif: ${url}: bad species ${JSON.stringify(r).slice(0, 300)}`);
  }
  return {
    key, scientificName: r.scientificName, rank: r.rank, taxonomicStatus: r.taxonomicStatus,
    ...(typeof r.acceptedKey === "number" ? { acceptedKey: r.acceptedKey } : {}),
    ...(typeof r.accepted === "string" ? { accepted: r.accepted } : {}),
  };
}

interface ColUsageResponse { name?: { scientificName?: unknown; rank?: unknown }; status?: unknown; accepted?: { id?: unknown; name?: { scientificName?: unknown } } }

function toColUsage(url: string, u: ColUsageResponse | undefined): ColEvidence {
  if (typeof u?.name?.scientificName !== "string") throw new Error(`col: ${url}: no usage name in ${JSON.stringify(u).slice(0, 300)}`);
  const acceptedName = u.accepted?.name?.scientificName;
  return {
    name: text(u.name.scientificName), rank: text(u.name.rank), status: text(u.status),
    accepted: typeof u.accepted?.id === "string" && typeof acceptedName === "string" ? { id: u.accepted.id, name: acceptedName } : null,
  };
}

// The usage and its distributions in the release derive used; never its source or threat fields.
async function fetchColInfo(release: number, id: string): Promise<ColEvidence> {
  const url = `${COL_API}/dataset/${release}/taxon/${id}/info`;
  const r = (await getJson(url)) as { usage?: ColUsageResponse; distributions?: { area?: Record<string, unknown>; establishmentMeans?: unknown }[] };
  return {
    ...toColUsage(url, r.usage),
    distributions: (r.distributions ?? []).map((d) => ({
      area: text(d.area?.name), globalId: text(d.area?.globalId), gazetteer: text(d.area?.gazetteer), establishmentMeans: text(d.establishmentMeans),
    })),
  };
}

// An id another source names (Wikidata's P10585) may not exist in this release: that's evidence, not a failure.
async function fetchColUsage(release: number, id: string): Promise<ColEvidence> {
  const url = `${COL_API}/dataset/${release}/nameusage/${id}`;
  try {
    return toColUsage(url, (await getJson(url)) as ColUsageResponse);
  } catch (e) {
    if (/HTTP 404/.test((e as Error).message)) return { name: null, rank: null, status: "not in this release", accepted: null };
    throw e;
  }
}

const values = (entry: Mismatch, source: string) => entry.values[source] as Record<string, unknown> | string | string[] | number[] | undefined;

// The COL ids a non-country ids.col entry is about: derive's, its accepted name, Wikidata's, or the name match's usage.
function colIdsOf(entry: Mismatch, snapshots: Pick<Snapshots, "col">): string[] {
  if (entry.field !== "ids.col") return [];
  if (entry.kind === "not-found") {
    const id = snapshots.col.matches[entry.scientificName]?.response.usage?.id;
    if (!id) throw new Error(`col: ${entryKey(entry)}: no usage in the snapshot's match`);
    return [id];
  }
  if (entry.kind !== "identity") return [];
  const col = values(entry, "col") as string | { id: string; accepted?: { id: string } };
  const wikidata = (values(entry, "wikidata") ?? []) as string[];
  return typeof col === "string" ? [col, ...wikidata] : [col.id, ...(col.accepted ? [col.accepted.id] : []), ...wikidata];
}

// The GBIF keys a non-country ids.gbif entry is about: both sides of an identity conflict, or a variant match's usage.
function gbifKeysOf(entry: Mismatch, snapshots: Pick<Snapshots, "gbif">): number[] {
  if (entry.field !== "ids.gbif") return [];
  if (entry.kind === "identity") return [(values(entry, "gbif") as { usageKey: number }).usageKey, ...(values(entry, "wikidata") as number[])];
  if (entry.kind !== "not-found") return [];
  const key = snapshots.gbif.species[entry.scientificName]?.match.response.usage?.key;
  if (!key) throw new Error(`gbif: ${entryKey(entry)}: no usage in the snapshot's match`);
  return [Number(key)];
}

// Label-free (Q1): no label service, rdfs:label or schema:name; items and references stay Q-ids. ?refUrl is read for the
// range filter below and never stored.
export function statementsQuery(items: readonly string[]): string {
  return [
    `SELECT DISTINCT ${SPARQL_VARS.map((v) => `?${v}`).join(" ")} WHERE {`,
    `  VALUES ?item { ${items.map((q) => `wd:${q}`).join(" ")} }`,
    `  VALUES (?prop ?p ?ps) { ${WIKIDATA_PROPS.map((P) => `("${P}" p:${P} ps:${P})`).join(" ")} }`,
    `  ?item ?p ?statement .`,
    `  ?statement ?ps ?value ; wikibase:rank ?rank .`,
    `  OPTIONAL { ?value wdt:P297 ?country . }`,
    `  OPTIONAL { ?statement prov:wasDerivedFrom ?reference .`,
    `             OPTIONAL { ?reference pr:P248 ?statedIn . }`,
    `             OPTIONAL { ?reference pr:P813 ?retrieved . }`,
    `             OPTIONAL { ?reference pr:P854 ?refUrl . } }`,
    `}`,
  ].join("\n");
}

type Binding = Record<string, { value: string } | undefined>;

// One statement per ?statement; a P2341 or P183 statement the Red List sources is dropped whole, its count returned.
function toStatements(bindings: readonly Binding[]): { statements: WikidataStatement[]; dropped: number } {
  const byStatement = new Map<string, Binding[]>();
  for (const b of bindings) {
    if (!b.statement || !b.item || !b.prop || !b.value || !b.rank) throw new Error(`wikidata: bad binding ${JSON.stringify(b)}`);
    byStatement.set(b.statement.value, [...(byStatement.get(b.statement.value) ?? []), b]);
  }
  const statements: WikidataStatement[] = [];
  let dropped = 0;
  for (const rows of byStatement.values()) {
    const first = rows[0]!;
    const property = first.prop!.value;
    const statedIn = (b: Binding) => (b.statedIn ? qid(b.statedIn.value) : null);
    if (RANGE_PROPS.has(property) && rows.some((b) => statedIn(b) === RED_LIST_ITEM || IUCN.test(b.refUrl?.value ?? ""))) {
      dropped++;
      continue;
    }
    const references = new Map<string, { statedIn: string | null; retrieved: string | null }>();
    for (const b of rows) {
      if (!b.reference) continue;
      const reference = { statedIn: statedIn(b), retrieved: b.retrieved?.value.slice(0, 10) ?? null };
      references.set(JSON.stringify(reference), reference);
    }
    const value = first.value!.value;
    statements.push({
      item: qid(first.item!.value),
      property,
      value: value.startsWith("http://www.wikidata.org/entity/") ? qid(value) : value,
      rank: qid(first.rank!.value).replace(/^.*#/, "").replace(/Rank$/, "").toLowerCase(),
      country: rows.map((b) => b.country?.value).filter((c) => c !== undefined).sort()[0] ?? null,
      references: [...references.entries()].sort(([a], [b]) => cmp(a, b)).map(([, r]) => r),
    });
  }
  statements.sort((a, b) => cmp(a.item, b.item) || cmp(a.property, b.property) || cmp(a.value, b.value));
  return { statements, dropped };
}

async function fetchWikidataStatements(entries: readonly Mismatch[], snapshots: Pick<Snapshots, "wikidata">): Promise<Evidence["wikidata"]> {
  const byName = bindingsByName(snapshots.wikidata);
  const items = new Set<string>();
  for (const e of entries) {
    for (const b of byName.get(e.scientificName) ?? []) if (b.item) items.add(qid(b.item.value));
    for (const q of Object.keys((e.values["wikidataItemsWithBaseId"] ?? {}) as object)) items.add(q);
  }
  const query = statementsQuery([...items].sort());
  const r = (await postSparql(query)) as { head?: { vars?: unknown }; results?: { bindings?: unknown } };
  if (JSON.stringify(r.head?.vars) !== JSON.stringify(SPARQL_VARS)) throw new Error(`wikidata: unexpected head.vars ${JSON.stringify(r.head?.vars)}`);
  if (!Array.isArray(r.results?.bindings)) throw new Error("wikidata: results.bindings is not an array");
  const { statements, dropped } = toStatements(r.results.bindings as Binding[]);
  console.error(`review:evidence: wikidata ${items.size} items, ${statements.length} statements, ${dropped} Red List-sourced range statements dropped`);
  return { query, statements };
}

// The whole evidence for a queue, in memory: any request that fails after getJson's retries throws, and nothing is written.
export async function fetchEvidence(entries: readonly Mismatch[], snapshots: Pick<Snapshots, "gbif" | "col" | "wikidata">, species: readonly Species[], retrieved: string): Promise<Evidence> {
  const speciesById = new Map(species.map((s) => [s.id, s]));
  const release = snapshots.col.release;

  const items: EvidenceItem[] = [];
  for (const entry of entries) {
    if (!isCountryEntry(entry)) {
      items.push({ key: entryKey(entry), entry, gbif: null });
      continue;
    }
    const match = snapshots.gbif.species[entry.scientificName]?.match.response;
    if (!match) throw new Error(`gbif: ${entryKey(entry)}: ${entry.scientificName} isn't in the snapshot`);
    items.push({ key: entryKey(entry), entry, gbif: await fetchCountryEvidence(gbifTaxonKey(match), entry.country!) });
  }

  const datasetKeys = new Set(items.flatMap((i) => [...(i.gbif?.records.map((r) => r.datasetKey) ?? []), ...(i.gbif?.facets["datasetKey"]?.counts.map((c) => c.name) ?? [])]));
  const datasets: Evidence["datasets"] = {};
  for (const key of [...datasetKeys].sort()) datasets[key] = await fetchDataset(key);

  const organizationKeys = new Set(Object.values(datasets).flatMap((d) => d.publishingOrganizationKey ?? []));
  const organizations: Evidence["organizations"] = {};
  for (const key of [...organizationKeys].sort()) {
    organizations[key] = { title: text(((await getGbif(`${GBIF_API}/v1/organization/${key}`)) as { title?: unknown }).title) };
  }

  const col: Evidence["col"] = {};
  for (const id of new Set(entries.flatMap((e) => colIdsOf(e, snapshots)))) col[id] = await fetchColUsage(release.key, id);
  const flagged = new Set(entries.filter(isCountryEntry).map((e) => e.speciesId));
  for (const id of new Set([...flagged].map((s) => speciesById.get(s)?.ids.col).filter((c) => typeof c === "string"))) {
    col[id] = await fetchColInfo(release.key, id);
  }

  const gbifSpecies: Evidence["gbifSpecies"] = {};
  for (const key of new Set(entries.flatMap((e) => gbifKeysOf(e, snapshots)))) gbifSpecies[String(key)] = await fetchGbifSpecies(key);

  return {
    retrieved,
    sources: [
      { source: "GBIF.org occurrence search", license: "CC0 1.0 or CC BY 4.0, per record", url: "https://www.gbif.org/occurrence/search", citation: `GBIF.org occurrence search, accessed ${retrieved}; per-entry query URLs in entries[].gbif.url` },
      { source: "Catalogue of Life", license: release.license, url: release.url, citation: COL_CITATIONS[release.key], release: { key: release.key, version: release.version } },
      { source: "Wikidata", license: "CC0 1.0", url: WIKIDATA_ENDPOINT, citation: "Wikidata, https://www.wikidata.org/ (CC0 1.0)" },
    ],
    entries: items,
    datasets,
    organizations,
    col,
    gbifSpecies,
    wikidata: await fetchWikidataStatements(entries, snapshots),
  };
}
