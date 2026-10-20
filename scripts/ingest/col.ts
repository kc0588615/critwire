// COL ingest via ChecklistBank (plan §3): resolve the current release (3LR), then one name match per base species.
// Fetch and normalize only; no fs. The classification comes from the match response itself (D3).
import { getJson } from "../http.ts";
import { assertNoIucnData, omitKeys, type ColRelease, type ColSnapshot, type Fetched } from "../raw.ts";
import type { BaseSpecies } from "../species.ts";

const API = "https://api.checklistbank.org";
// ChecklistBank bookkeeping that changes without the data changing.
const VOLATILE = new Set(["created", "modified", "modifiedBy"]);

// The release record is allowlisted: the full one is ~113 KB, mostly `creator`, and carries volatile fields.
function toRelease(r: Record<string, unknown>): ColRelease {
  const release = {
    key: r.key, alias: r.alias, title: r.title, version: r.version, issued: r.issued, doi: r.doi, license: r.license, url: r.url,
  };
  if (!Number.isInteger(release.key)) throw new Error(`col: release key ${String(release.key)} is not an integer`);
  for (const [k, v] of Object.entries(release)) {
    if (k !== "key" && (typeof v !== "string" || !v)) throw new Error(`col: release ${k} missing (${JSON.stringify(v)})`);
  }
  return release as ColRelease;
}

export const colMatchUrl = (key: number, name: string) =>
  `${API}/dataset/${key}/match/nameusage?scientificName=${encodeURIComponent(name)}`;

export async function fetchCol(base: BaseSpecies[]): Promise<Omit<ColSnapshot, "retrieved">> {
  const release = toRelease((await getJson(`${API}/dataset/3LR`)) as Record<string, unknown>);
  const matches: Record<string, Fetched> = {};
  for (const { scientificName } of base) {
    const url = colMatchUrl(release.key, scientificName);
    const response = omitKeys(await getJson(url), VOLATILE) as Record<string, unknown>;
    if (typeof response.match !== "boolean") throw new Error(`col: ${url}: no boolean "match" in ${JSON.stringify(response).slice(0, 300)}`);
    matches[scientificName] = { url, response };
  }
  const snapshot = { release, matches };
  assertNoIucnData(snapshot);
  return snapshot;
}
