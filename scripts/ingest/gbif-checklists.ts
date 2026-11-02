// pnpm ingest gbif-checklists: what the allowlisted GBIF checklists say about each species' countries (007, Sources).
// Fetches every species' distributions by its checklistKeys, finds each row's dataset through its sourceTaxonKey, and
// keeps rows on role datasets only (checklist-roles.ts), written field by field: the key allowlist is what keeps
// threatStatus, appendixCites and locality out, assertNoIucnData the second line. The rest is counted, never written.
// No fs: scripts/ingest.ts writes the snapshot. Endpoint: /v1/species/{key}/distributions sits on the legacy backbone;
// if GBIF retires it, this fails loudly and the committed snapshot stands.
import { allPages } from "../gbif/pages.ts";
import { getJson } from "../http.ts";
import { OPEN_LICENSES } from "../learn/sample-rules.ts";
import { assertNoIucnData, type GbifChecklistDataset, type GbifChecklistRow, type GbifChecklistsSnapshot } from "../raw.ts";
import { CHECKLIST_ALLOWLIST } from "./checklist-roles.ts";
import { GBIF_API } from "./gbif.ts";
import { DATASET_LICENSES } from "./gbif-sample.ts";

const API = `${GBIF_API}/v1`;
// The IUCN Red List's own GBIF dataset: its rows are dropped before anything else reads them; only their count is kept.
const RED_LIST_DATASET = "19491596-35ae-4a91-9a98-85cf505f1bd3";

interface Distribution { sourceTaxonKey?: number; country?: string; establishmentMeans?: string; status?: string; threatStatus?: string }

// A role dataset's four kept fields. Throws on a license outside the two, or a missing field: a person removes the role.
function toDataset(key: string, d: { title?: string; license?: string; doi?: string; citation?: { text?: string } }): GbifChecklistDataset {
  const refuse = (why: string) => new Error(`gbif-checklists: role dataset ${key}: ${why} (nothing written; a person removes its role)`);
  const license = DATASET_LICENSES[d.license ?? ""];
  if (!license || !OPEN_LICENSES.includes(license)) throw refuse(`license ${JSON.stringify(d.license ?? null)} isn't CC0 1.0 or CC BY 4.0`);
  if (!d.title) throw refuse("no title");
  if (!d.doi) throw refuse("no doi");
  if (!d.citation?.text) throw refuse("no citation.text");
  return { title: d.title, license: license as GbifChecklistDataset["license"], doi: d.doi, citation: d.citation.text };
}

const text = (v: string | null) => v ?? "";
function byRow(a: GbifChecklistRow, b: GbifChecklistRow): number {
  const fields = (r: GbifChecklistRow) => [r.datasetKey, String(r.sourceTaxonKey).padStart(12, "0"), text(r.country), text(r.establishmentMeans), text(r.status)];
  const [x, y] = [fields(a).join("\0"), fields(b).join("\0")];
  return x < y ? -1 : x > y ? 1 : 0;
}

// keysByName: every base name → its keys (derive's checklistKeys); [] stays in the snapshot as a species with no rows.
export async function fetchGbifChecklists(keysByName: Readonly<Record<string, readonly number[]>>): Promise<Omit<GbifChecklistsSnapshot, "retrieved">> {
  const taxonDataset = new Map<number, string>();
  const datasets: GbifChecklistsSnapshot["datasets"] = {};
  const dropped: GbifChecklistsSnapshot["dropped"] = { noSourceTaxonKey: 0, redList: 0, noRole: {} };
  const species: GbifChecklistsSnapshot["species"] = {};
  let fetched = 0;
  let withThreatStatus = 0;

  const datasetOf = async (taxon: number): Promise<string> => {
    let key = taxonDataset.get(taxon);
    if (!key) {
      key = (await getJson(`${API}/species/${taxon}`) as { datasetKey?: string }).datasetKey;
      if (!key) throw new Error(`gbif-checklists: sourceTaxonKey ${taxon}: no datasetKey`);
      taxonDataset.set(taxon, key);
    }
    return key;
  };

  for (const [name, keys] of Object.entries(keysByName)) {
    const rows: GbifChecklistRow[] = [];
    for (const key of keys) {
      for (const row of await allPages<Distribution>(`${API}/species/${key}/distributions`)) {
        fetched++;
        if (row.threatStatus) withThreatStatus++;
        const sourceTaxonKey = row.sourceTaxonKey;
        if (sourceTaxonKey === undefined || sourceTaxonKey === null) { dropped.noSourceTaxonKey++; continue; }
        const datasetKey = await datasetOf(sourceTaxonKey);
        if (datasetKey === RED_LIST_DATASET) { dropped.redList++; continue; }
        if (!Object.hasOwn(CHECKLIST_ALLOWLIST, datasetKey)) { dropped.noRole[datasetKey] = (dropped.noRole[datasetKey] ?? 0) + 1; continue; }
        datasets[datasetKey] ??= toDataset(datasetKey, await getJson(`${API}/dataset/${datasetKey}`) as Parameters<typeof toDataset>[1]);
        rows.push({ datasetKey, sourceTaxonKey, country: row.country ?? null, establishmentMeans: row.establishmentMeans ?? null, status: row.status ?? null });
      }
    }
    species[name] = { keys: [...keys], rows: rows.sort(byRow) };
  }
  console.error(`gbif-checklists: ${fetched} rows fetched, ${withThreatStatus} with threatStatus (never kept); dropped ${JSON.stringify(dropped)}`);
  const snapshot = { allowlist: { ...CHECKLIST_ALLOWLIST }, datasets, species, dropped };
  assertNoIucnData(snapshot);
  return snapshot;
}
