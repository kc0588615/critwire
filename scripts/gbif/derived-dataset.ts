// The GBIF derived dataset (plan §5, §6): the counts critwire registers (contributions.json, written by pnpm derive)
// and what GBIF holds for them (registration.json, written by pnpm gbif:register). Pure, apart from the file URLs.
import { createHash } from "node:crypto";

export const contributionsFile = new URL("../../data/gbif-derived-dataset/contributions.json", import.meta.url);
export const registrationFile = new URL("../../data/gbif-derived-dataset/registration.json", import.meta.url);

// One GBIF taxon whose occurrences the countries count; species on the same key count once.
export interface ContributingTaxon { taxonKey: number; speciesIds: number[]; records: number; url: string }

// Every record the countries queries matched for the settled species, per occurrence dataset (UUID → records).
export interface Contributions {
  retrieved: string;
  records: number;
  taxa: ContributingTaxon[];
  datasets: Record<string, number>;
}

// GBIF's read-back of the registered derived dataset; contributionsSha256 is the sha256 of contributions.json's bytes.
export interface Registration {
  doi: string;
  citation: string;
  title: string;
  description: string;
  sourceUrl: string;
  createdBy: string;
  contributionsSha256: string;
  records: number;
  relatedDatasets: Record<string, number>;
}

// The registration's DOI when it recorded exactly these dataset counts, else null (missing or stale): GBIF can't
// change a DOI's counts, so new counts need a new DOI.
export function currentDoi(contributions: Contributions, registration: Registration | null): string | null {
  if (registration === null || Object.keys(contributions.datasets).length === 0) return null;
  return sameCounts(contributions.datasets, registration.relatedDatasets) ? registration.doi : null;
}

// Two datasetKey → records maps hold the same keys and counts, in any order.
export function sameCounts(a: Record<string, number>, b: Record<string, number>): boolean {
  const entries = Object.entries(a);
  return entries.length === Object.keys(b).length && entries.every(([key, n]) => Object.hasOwn(b, key) && b[key] === n);
}

export function contributionsSha256(bytes: string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

// The git tag that keeps the deposit commit (sourceUrl) reachable after rebases and merges (plan §6, A7).
export const depositTag = (sha256: string) => `gbif-dd-${sha256.slice(0, 12)}`;
