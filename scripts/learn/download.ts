// The lab sample's GBIF download request (plan D6, 004 §4.2), pure: the body to POST, the reuse check against
// GBIF's stored echo, and which download a run uses (decideDownload: never a second POST while one may exist). The filters are the countries rule's (scripts/ingest/gbif.ts), so the sample and
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

export const DOWNLOAD_KEY = /^\d{7}-\d{15}$/;

// classifyPost's parser for POST /occurrence/download/request: the body is the bare key (text/plain).
export function parseDownloadKey(body: string): { key: string } | null {
  const key = body.trim();
  return DOWNLOAD_KEY.test(key) ? { key } : null;
}

// Written (wx) before the download POST, with key null until GBIF answers with one (scripts/gbif/state.ts).
export interface DownloadIntent { request: DownloadRequest; startedAt: string; searchCount: number; key: string | null }

// One row of GET /occurrence/download/user/<user>, the fields read.
export interface ListedDownload { key: string; created: string; request: Compared }

// --new, or a reuse of --download <key> (null: download.json's key).
export type DownloadArgs = { mode: "new" } | { mode: "reuse"; key: string | null };

export interface DownloadDecideInput {
  args: DownloadArgs;
  intent: DownloadIntent | null;
  built: DownloadRequest; // today's request (downloadRequest over the core's ids.gbif)
  listing: ListedDownload[] | null; // the user's downloads; null until listed
  intentFile: string; // named in refusals
}

export type DownloadDecision =
  | { action: "reuse"; key: string | null }
  | { action: "post" }
  | { action: "list" }
  | { action: "adopt"; key: string }
  | { action: "resume"; key: string }
  | { action: "refuse"; reason: string };

// A listed download created this long before the intent's startedAt may still be its POST's (clock skew).
const ADOPT_SKEW_MS = 5 * 60_000;

// Plan D6's table; the first matching row wins. Without an intent, --new posts and anything else reuses. With one, a
// run only resumes its key or, while the key is unknown, reconciles through the user's listing: "list" asks the caller
// to list and decide again; one download of the intent's request created since startedAt − 5 min is adopted; none or
// several refuse (gbif:register's decide rule: never a second POST while one may exist).
export function decideDownload({ args, intent, built, listing, intentFile }: DownloadDecideInput): DownloadDecision {
  if (intent === null) return args.mode === "new" ? { action: "post" } : { action: "reuse", key: args.key };
  const refuse = (reason: string): DownloadDecision => ({ action: "refuse", reason });
  if (args.mode === "reuse" && args.key !== null && args.key !== intent.key) {
    return refuse(`${intentFile} records the download POSTed at ${intent.startedAt} (key ${intent.key ?? "unknown"}); ` +
      `re-run without --download ${args.key} to finish it first`);
  }
  if (!sameRequest(intent.request, built)) {
    return refuse(`${intentFile} is for another request (ids.gbif or the filters changed since its POST at ${intent.startedAt}), ` +
      `so its download ${intent.key ?? "(key unknown)"} can't be used; delete ${intentFile}` +
      `${intent.key === null ? " only when sure nothing was created, or once GBIF lists it" : ""}, then run pnpm ingest gbif-sample --new`);
  }
  if (intent.key !== null) return { action: "resume", key: intent.key };
  if (listing === null) return { action: "list" };
  const since = Date.parse(intent.startedAt) - ADOPT_SKEW_MS;
  const matches = listing.filter((d) => Date.parse(d.created) >= since && sameRequest(d.request, intent.request));
  if (matches.length === 1) return { action: "adopt", key: matches[0].key };
  if (matches.length > 1) {
    return refuse(`downloads ${matches.map((m) => m.key).join(", ")} all match the POST at ${intent.startedAt}; ` +
      `add a handoff item for the owner; ${intentFile} stays`);
  }
  return refuse(`a POST at ${intent.startedAt} may have created a download and GBIF lists none yet; re-run later; ` +
    `delete ${intentFile} only when sure nothing was created`);
}
