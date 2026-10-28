// gbif:register's pure core (plan §6): the request it sends, what a run does, how its POST ended, and whether GBIF's
// read-back matches. The CLI (scripts/gbif-register.ts) does the io; state.ts holds the lock and the intent.
import { sameCounts, type Contributions, type Registration } from "./derived-dataset.ts";

// The body POSTed to /v1/derivedDataset; originalDownloadDOI only for a target derived from one GBIF download.
export interface DerivedDatasetRequest {
  title: string; description: string; sourceUrl: string; relatedDatasets: Record<string, number>; originalDownloadDOI?: string;
}

// A derived dataset as GBIF returns it (GET /derivedDataset/{doi}, and each row of the user's listing); the fields read.
export interface DerivedDatasetRecord {
  doi: string; title: string; description?: string | null; sourceUrl: string; citation: string; createdBy: string;
  originalDownloadDOI?: string | null; // GBIF omits it when the derived dataset has none
}

// One row of GET /derivedDataset/{doi}/datasets.
export interface DatasetUsage { datasetKey: string; numberRecords: number }

// Written right before the POST; it survives a crash until the POST's outcome is known (state.ts).
export interface Intent { contributionsSha256: string; request: DerivedDatasetRequest; startedAt: string }

// The description line that ties a GBIF derived dataset to one contributions.json: the reconciliation key.
export const hashLine = (sha256: string) => `contributions-sha256: ${sha256}`;
const carriesHash = (description: string | null | undefined, sha256: string) =>
  (description ?? "").split("\n").includes(hashLine(sha256));

export function requestBody(contributions: Contributions, sha256: string, sourceUrl: string): DerivedDatasetRequest {
  const taxa = contributions.taxa.length;
  const species = contributions.taxa.reduce((n, t) => n + t.speciesIds.length, 0);
  return {
    title: `critwire: countries with open (CC0, CC BY 4.0) GBIF occurrence records, ${taxa} taxa`,
    description: [
      `The countries with open GBIF occurrence records for ${species} species (${taxa} GBIF taxa), published by critwire ` +
        "(https://critwire.com/v1/) as range.countriesWithOpenRecords. Records counted: licensed CC0 1.0 or CC BY 4.0, " +
        "occurrenceStatus PRESENT, with coordinates and no geospatial issue, and not living or fossil specimens; every " +
        "record a taxon's query matched counts, including those in countries critwire leaves out.",
      "Files at sourceUrl: species.json (the country lists), gbif-derived-dataset/contributions.json (the records per " +
        "dataset, and each taxon's exact query URL) and raw/gbif/snapshot.json (the GBIF responses).",
      hashLine(sha256),
    ].join("\n"),
    sourceUrl,
    relatedDatasets: contributions.datasets,
  };
}

export interface DecideInput {
  registration: Registration | null; // data/gbif-derived-dataset/registration.json
  contributionsSha256: string; // of contributions.json's bytes
  datasets: Record<string, number>; // contributions.datasets
  intent: Intent | null;
  listing: DerivedDatasetRecord[] | null; // every derived dataset of the GBIF user; null until listed
  intentFile: string; // named in refusals
}

export type Decision =
  | { action: "verify"; expected: Registration; deleteIntent: boolean }
  | { action: "list" }
  | { action: "adopt"; doi: string; expected: DerivedDatasetRequest | null }
  | { action: "post" }
  | { action: "refuse"; reason: string };

const refuse = (reason: string): Decision => ({ action: "refuse", reason });

// The plan §6 decision table; the first matching row wins. "list" asks the caller to list the user's derived
// datasets and decide again: a run with registration.json, or with an intent for another hash, never lists.
export function decide({ registration, contributionsSha256, datasets, intent, listing, intentFile }: DecideInput): Decision {
  if (registration !== null) {
    if (!sameCounts(registration.relatedDatasets, datasets)) {
      return refuse(`registration.json (${registration.doi}) holds other dataset counts than contributions.json, and ` +
        "GBIF can't change a DOI's counts; for a new DOI see AGENTS.md, GBIF DOI refresh");
    }
    return { action: "verify", expected: registration, deleteIntent: intent?.contributionsSha256 === registration.contributionsSha256 };
  }
  if (intent !== null && intent.contributionsSha256 !== contributionsSha256) {
    return refuse(`a POST at ${intent.startedAt} for other contributions (${hashLine(intent.contributionsSha256)}) may have ` +
      `registered ${intent.request.sourceUrl}; check out that commit and re-run to adopt it, or delete ${intentFile} ` +
      "only when sure nothing was created");
  }
  if (listing === null) return { action: "list" };
  const matches = listing.filter((record) => carriesHash(record.description, contributionsSha256));
  if (matches.length === 1) return { action: "adopt", doi: matches[0].doi, expected: intent?.request ?? null };
  if (matches.length > 1) {
    return refuse(`duplicates are already on GBIF: ${matches.map((m) => m.doi).join(", ")} all carry ` +
      `${hashLine(contributionsSha256)}; add a handoff item for the owner`);
  }
  if (intent !== null) {
    return refuse(`a POST at ${intent.startedAt} may have registered, and GBIF lists nothing for it yet; re-run later; ` +
      `delete ${intentFile} only when sure nothing was created`);
  }
  return { action: "post" };
}

// How the single POST ended: an HTTP response, or a fetch error ("timeout", "network <message>").
export type PostOutcome = { status: number; body: string } | { error: string };
// Created carries what the parser read from the body ({ doi } by default).
export type PostClass<T extends object = { doi: string }> =
  | ({ kind: "created" } & T) | { kind: "rejected"; reason: string } | { kind: "ambiguous"; reason: string };

const DOI = /^10\.\d{4,9}\/\S+$/;

function parseDoi(body: string): { doi: string } | null {
  try {
    const doi = (JSON.parse(body) as { doi?: unknown } | null)?.doi;
    return typeof doi === "string" && DOI.test(doi) ? { doi } : null;
  } catch {
    return null;
  }
}

// Created only on 200/201 with a body `parse` accepts (default: a DOI). GBIF validates before it creates, so a 4xx
// other than 408/429 created nothing (rejected: drop the intent); anything else may have created something (ambiguous:
// keep the intent, list on the next run).
export function classifyPost(outcome: PostOutcome): PostClass;
export function classifyPost<T extends object>(outcome: PostOutcome, parse: (body: string) => T | null): PostClass<T>;
export function classifyPost(outcome: PostOutcome, parse: (body: string) => object | null = parseDoi): PostClass<object> {
  if ("error" in outcome) return { kind: "ambiguous", reason: outcome.error };
  const { status, body } = outcome;
  const created = status === 200 || status === 201 ? parse(body) : null;
  if (created !== null) return { kind: "created", ...created };
  const reason = `HTTP ${status}: ${body.slice(0, 300)}`;
  const rejected = status >= 400 && status < 500 && status !== 408 && status !== 429;
  return rejected ? { kind: "rejected", reason } : { kind: "ambiguous", reason };
}

// datasetKey → numberRecords of a read-back, and the keys GBIF listed more than once.
function usageCounts(usages: DatasetUsage[]): { counts: Record<string, number>; duplicates: string[] } {
  const counts: Record<string, number> = {};
  const duplicates: string[] = [];
  for (const { datasetKey, numberRecords } of usages) {
    if (Object.hasOwn(counts, datasetKey)) duplicates.push(datasetKey);
    counts[datasetKey] = numberRecords;
  }
  return { counts, duplicates };
}

export interface ReadBack {
  // What was sent: the request after a POST, the intent's request on adopt (null without one), registration.json on verify.
  expected: Pick<DerivedDatasetRequest, "title" | "description" | "sourceUrl"> | null;
  record: DerivedDatasetRecord;
  usages: DatasetUsage[]; // every page of GET /derivedDataset/{doi}/datasets
  datasets: Record<string, number>; // contributions.datasets
  createdBy: string; // GBIF_USERNAME
  hash: string; // contributionsSha256; registration.contributionsSha256 on verify
  expectedDownloadDoi: string | null; // the target's downloadDoi(contributions); null: GBIF must hold none
}

// Hard errors: GBIF holds other counts, another user's dataset, another deposit or download, or no hash line. Warnings: GBIF's title
// or description differs from what was sent (registration.json keeps GBIF's, so a minted DOI is never stuck).
// checkDeposit(record.sourceUrl) is the caller's network check.
export function readBackErrors({ expected, record, usages, datasets, createdBy, hash, expectedDownloadDoi }: ReadBack): { hard: string[]; warnings: string[] } {
  const hard: string[] = [];
  const warnings: string[] = [];
  const { counts, duplicates } = usageCounts(usages);
  for (const key of duplicates) hard.push(`GBIF lists a dataset twice: ${key}`);
  if (!sameCounts(counts, datasets)) {
    hard.push(`the dataset counts on GBIF (${usages.length} rows) differ from contributions.json ` +
      `(${Object.keys(datasets).length} datasets)`);
  }
  if (record.createdBy !== createdBy) hard.push(`createdBy is ${record.createdBy}, not ${createdBy}`);
  if (!carriesHash(record.description, hash)) hard.push(`the description lacks the line "${hashLine(hash)}"`);
  const downloadDoi = record.originalDownloadDOI ?? null;
  if (downloadDoi !== expectedDownloadDoi) {
    hard.push(`originalDownloadDOI is ${downloadDoi ?? "none"}, not ${expectedDownloadDoi ?? "none"}`);
  }
  if (expected !== null) {
    if (record.sourceUrl !== expected.sourceUrl) hard.push(`sourceUrl is ${record.sourceUrl}, not ${expected.sourceUrl}`);
    if (record.title !== expected.title) warnings.push(`GBIF's title differs from the one sent: ${JSON.stringify(record.title)}`);
    if (record.description !== expected.description) warnings.push("GBIF's description differs from the one sent");
  }
  return { hard, warnings };
}

// registration.json from a read-back that passed readBackErrors: GBIF's values, no timestamps. originalDownloadDOI
// only for a target with a download (downloadDoi), so countries' file keeps its keys.
export function toRegistration(record: DerivedDatasetRecord, usages: DatasetUsage[], hash: string, downloadDoi: string | null): Registration {
  const { counts } = usageCounts(usages);
  return {
    doi: record.doi, citation: record.citation, title: record.title, description: record.description ?? "",
    sourceUrl: record.sourceUrl, createdBy: record.createdBy, contributionsSha256: hash,
    records: Object.values(counts).reduce((a, n) => a + n, 0), relatedDatasets: counts,
    ...(downloadDoi === null ? {} : { originalDownloadDOI: downloadDoi }),
  };
}
