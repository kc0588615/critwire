// The lab sample's GBIF download request (plan D6, 004 §4.2), pure: the body to POST and the reuse check against
// GBIF's stored echo. The filters are the countries rule's (scripts/ingest/gbif.ts), so the sample and
// /v1 range.countriesWithOpenRecords count the same records.
import { isDeepStrictEqual } from "node:util";
import { BACKBONE_KEY, BASIS_OF_RECORD } from "../ingest/gbif.ts";
import { OPEN_GBIF_LICENSES } from "../raw.ts";

export interface DownloadRequest {
  sendNotification: false;
  format: "SIMPLE_CSV";
  checklistKey: string;
  predicate: { type: "and"; predicates: Record<string, unknown>[] };
}

// The request for these ids.gbif, without `creator` (the account name is added at POST time, never stored). The
// checklist is pinned at the top level and on TAXON_KEY, so GBIF reads the keys as legacy backbone keys (F3).
export function downloadRequest(gbifKeys: readonly number[]): DownloadRequest {
  if (gbifKeys.length === 0) throw new Error("download: no ids.gbif");
  const keys = [...gbifKeys].sort((a, b) => a - b);
  keys.forEach((k, i) => { if (k === keys[i - 1]) throw new Error(`download: ids.gbif ${k} twice`); });
  return {
    sendNotification: false,
    format: "SIMPLE_CSV",
    checklistKey: BACKBONE_KEY,
    predicate: {
      type: "and",
      predicates: [
        { type: "in", key: "TAXON_KEY", values: keys.map(String), checklistKey: BACKBONE_KEY },
        { type: "in", key: "LICENSE", values: [...OPEN_GBIF_LICENSES] },
        { type: "equals", key: "HAS_COORDINATE", value: "true" },
        { type: "equals", key: "HAS_GEOSPATIAL_ISSUE", value: "false" },
        { type: "equals", key: "OCCURRENCE_STATUS", value: "PRESENT" },
        { type: "in", key: "BASIS_OF_RECORD", values: [...BASIS_OF_RECORD] },
      ],
    },
  };
}

// Whether a stored request (GBIF's echo, or download.json's copy) asks for exactly what `built` asks for. Only
// format, checklistKey and predicate are compared, on purpose: the rest of GBIF's echo (sendNotification, type,
// interpretedExtensions, verbatimExtensions) doesn't change which records come back, and full equality would refuse
// the spike's own download (DL1). Don't "fix" this to compare the whole object.
type Compared = { format?: unknown; checklistKey?: unknown; predicate?: unknown };
export function sameRequest(stored: Compared, built: DownloadRequest): boolean {
  const pick = (r: Compared) => ({ format: r.format, checklistKey: r.checklistKey, predicate: r.predicate });
  return isDeepStrictEqual(pick(stored), pick(built));
}
