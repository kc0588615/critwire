// gbif:register's targets (plan D8; SC4): the two derived datasets critwire registers, each with its own files, deposit
// tag, lock and intent. countries keeps every name it had before targets existed, so its runs and registration.json
// don't change. Pure, apart from the file URLs and the state directory.
import { fileURLToPath } from "node:url";
import { relative } from "node:path/posix";
import type { DeriveInputs, DeriveResult } from "../derive/pipeline.ts";
import { SAMPLE_RULES } from "../learn/sample-rules.ts";
import {
  contributionsFile, currentDoi, currentSampleDoi, registrationFile, sampleContributionsFile, sampleRegistrationFile,
  type Contributions, type Registration, type SampleContributions,
} from "./derived-dataset.ts";
import { hashLine, requestBody, type DerivedDatasetRequest, type Intent } from "./register.ts";
import { namedState, registerState } from "./state.ts";

const dataDir = fileURLToPath(new URL("../../data/", import.meta.url));

export interface Target<C extends { datasets: Record<string, number> }> {
  name: string;
  contributionsFile: URL; // written by pnpm derive
  registrationFile: URL; // written by pnpm gbif:register
  depositPath: string; // contributionsFile under sourceUrl (the repo's data/ tree)
  tagPrefix: "gbif-dd" | "gbif-learn"; // depositTag(tagPrefix, sha256)
  state: ReturnType<typeof namedState<Intent>>;
  contributions(derived: DeriveResult): C;
  registration(inputs: DeriveInputs): Registration | null;
  requestBody(contributions: C, sha256: string, sourceUrl: string): DerivedDatasetRequest;
  downloadDoi(contributions: C): string | null; // the GBIF download the counts come from; null: none
  // The registration's DOI when it is current, else null. A citation check: GBIF holds these per-dataset counts (and,
  // for learn-sample, this download). It never proves record identity; that is the contributions' sample.sha256 under
  // the hash line, and the manifest's sha256s.
  currentDoi(contributions: C, registration: Registration | null): string | null;
}

const depositPath = (file: URL) => relative(dataDir, fileURLToPath(file));

const countries: Target<Contributions> = {
  name: "countries",
  contributionsFile, registrationFile, depositPath: depositPath(contributionsFile), tagPrefix: "gbif-dd", state: registerState,
  contributions: (derived) => derived.contributions,
  registration: (inputs) => inputs.registration,
  requestBody,
  downloadDoi: () => null,
  currentDoi,
};

const learnSample: Target<SampleContributions> = {
  name: "learn-sample",
  contributionsFile: sampleContributionsFile, registrationFile: sampleRegistrationFile,
  depositPath: depositPath(sampleContributionsFile), tagPrefix: "gbif-learn",
  state: namedState<Intent>("gbif-register-learn-sample", "gbif:register --target learn-sample"),
  contributions: (derived) => derived.learn.contributions,
  registration: (inputs) => inputs.learn.registration,
  requestBody: (c, sha256, sourceUrl) => ({
    title: `critwire Learn: a sample of open (CC0, CC BY 4.0) GBIF occurrence records, ${c.records} records`,
    description: [
      `A capped sample of GBIF occurrence download ${c.downloadKey} (${c.originalDownloadDoi}), published by critwire ` +
        "(https://critwire.com/learn/data/) as the occurrences its Learn labs read. Per critwire species, at most " +
        `${SAMPLE_RULES.cap} records whose effective license (the stricter of the record's and its dataset's) is ` +
        "CC0 1.0 or CC BY 4.0, chosen by ascending md5 of the gbifID; every record counted here is published.",
      "Files at sourceUrl: raw/gbif-sample/sample.csv (the records), raw/gbif-sample/download.json (the download, its " +
        "request and the sample rules), raw/gbif-sample/datasets.json (dataset and publisher metadata) and " +
        `${depositPath(sampleContributionsFile)} (the records per dataset, and sample.csv's sha256).`,
      hashLine(sha256),
    ].join("\n"),
    sourceUrl,
    relatedDatasets: c.datasets,
    originalDownloadDOI: c.originalDownloadDoi,
  }),
  downloadDoi: (c) => c.originalDownloadDoi,
  currentDoi: currentSampleDoi,
};

export const TARGETS = { countries, "learn-sample": learnSample };
export type AnyTarget = Target<{ datasets: Record<string, number> }>;

// pnpm gbif:register [--target countries|learn-sample]: countries by default, so AGENTS.md's steps keep working.
export function parseTarget(args: string[]): AnyTarget {
  if (args.length === 0) return TARGETS.countries as AnyTarget;
  const name = args[1];
  if (args.length !== 2 || args[0] !== "--target" || (name !== "countries" && name !== "learn-sample")) {
    throw new Error("usage: pnpm gbif:register [--target countries|learn-sample]");
  }
  return TARGETS[name] as AnyTarget;
}
