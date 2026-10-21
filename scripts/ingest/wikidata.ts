// Wikidata ingest: one SPARQL query for all base species (plan §3). Fetch and normalize only; no fs.
import { getJson } from "../http.ts";
import type { SparqlBinding, WikidataSnapshot } from "../raw.ts";
import type { BaseSpecies } from "../species.ts";

export const WIKIDATA_ENDPOINT = "https://query.wikidata.org/sparql";
const VARS = ["name", "item", "prop", "value", "iucnItem", "iucnItemName"];
const SPARQL_TIMEOUT_MS = 90_000;

// The exact query for a base, VALUES in base order. Throws on an ids.iucn that isn't a positive integer:
// an unbound ?iucn would make the second UNION branch join every item with a P627.
export function wikidataQuery(base: BaseSpecies[]): string {
  const values = base.map((s) => {
    const iucn: unknown = s.ids?.iucn;
    if (!Number.isInteger(iucn) || (iucn as number) < 1) throw new Error(`wikidataQuery: bad ids.iucn ${String(iucn)} (${s.scientificName})`);
    if (!/^[A-Za-z][A-Za-z -]*$/.test(s.scientificName)) throw new Error(`wikidataQuery: unsafe scientificName ${JSON.stringify(s.scientificName)}`);
    return `("${s.scientificName}" "${iucn}")`;
  });
  return [
    `SELECT DISTINCT ${VARS.map((v) => `?${v}`).join(" ")} WHERE {`,
    `  VALUES (?name ?iucn) { ${values.join(" ")} }`,
    `  { ?item wdt:P225 ?name .`,
    `    OPTIONAL { VALUES (?prop ?p) { ("P627" wdt:P627) ("P846" wdt:P846) ("P10585" wdt:P10585) ("P3151" wdt:P3151) ("P685" wdt:P685) }`,
    `               ?item ?p ?value . } }`,
    `  UNION`,
    `  { ?iucnItem wdt:P627 ?iucn . OPTIONAL { ?iucnItem wdt:P225 ?iucnItemName . } }`,
    `} ORDER BY ${VARS.map((v) => `?${v}`).join(" ")}`,
  ].join("\n");
}

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

// Total order: values in head.vars order (unbound as ""), then the whole binding.
function compareBindings(a: SparqlBinding, b: SparqlBinding): number {
  for (const v of VARS) {
    const c = cmp(a[v]?.value ?? "", b[v]?.value ?? "");
    if (c) return c;
  }
  return cmp(JSON.stringify(a), JSON.stringify(b));
}

export async function fetchWikidata(base: BaseSpecies[]): Promise<Omit<WikidataSnapshot, "retrieved">> {
  const query = wikidataQuery(base);
  const res = (await getJson(WIKIDATA_ENDPOINT, {
    method: "POST",
    headers: { Accept: "application/sparql-results+json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ query }).toString(),
    timeoutMs: SPARQL_TIMEOUT_MS,
  })) as { head?: { vars?: unknown }; results?: { bindings?: unknown } };
  if (JSON.stringify(res.head?.vars) !== JSON.stringify(VARS)) throw new Error(`wikidata: unexpected head.vars ${JSON.stringify(res.head?.vars)}`);
  const bindings = res.results?.bindings;
  if (!Array.isArray(bindings)) throw new Error("wikidata: results.bindings is not an array");
  for (const b of bindings as SparqlBinding[]) {
    for (const [k, t] of Object.entries(b)) {
      if (!VARS.includes(k) || typeof t?.value !== "string") throw new Error(`wikidata: bad binding ${JSON.stringify(b)}`);
    }
    if (!b.name) throw new Error(`wikidata: binding without ?name ${JSON.stringify(b)}`);
  }
  return {
    endpoint: WIKIDATA_ENDPOINT,
    query,
    response: { head: { vars: VARS }, results: { bindings: [...(bindings as SparqlBinding[])].sort(compareBindings) } },
  };
}
