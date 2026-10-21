// pnpm gbif:register (plan §6): registers data/gbif-derived-dataset/contributions.json as a GBIF derived dataset, the
// one network write, and writes registration.json; re-runs verify it, and a run after a crash reconciles with GBIF's
// listing first. The decisions are pure (gbif/register.ts); the lock and the intent are local state (gbif/state.ts).
// Run it on the Oracle VPS only. Usage: pnpm gbif:register
import { execFileSync } from "node:child_process";
import { loadEnv } from "./env.ts";
import { fetchFailure, getJson, logRequest, USER_AGENT, type GetJsonInit } from "./http.ts";
import { formatJson, writeJson } from "./json.ts";
import { assertDerivedFiles, deriveAll, readDeriveInputs } from "./derive/pipeline.ts";
import { contributionsSha256, depositTag, registrationFile, type Contributions, type Registration } from "./gbif/derived-dataset.ts";
import {
  classifyPost, decide, readBackErrors, requestBody, toRegistration, type DatasetUsage, type DerivedDatasetRecord,
  type DerivedDatasetRequest, type PostOutcome,
} from "./gbif/register.ts";
import { createIntent, deleteIntent, intentFile, readIntent, withLock } from "./gbif/state.ts";

const API = "https://api.gbif.org/v1";
const REPO = "kc0588615/critwire";
const POST_TIMEOUT_MS = 60_000;
const PAGE_LIMIT = 1000; // GBIF's maximum page size
// The deposit: the repo's data/ tree at one commit (A7).
const SOURCE_URL = /^https:\/\/github\.com\/kc0588615\/critwire\/tree\/([0-9a-f]{40})\/data$/;
const sourceUrlAt = (commit: string) => `https://github.com/${REPO}/tree/${commit}/data`;

const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" });

// Preconditions 1–4, local, before any network call.
loadEnv();
const user = process.env.GBIF_USERNAME;
const password = process.env.GBIF_PASSWORD;
if (!user || !password) {
  throw new Error("GBIF_USERNAME and GBIF_PASSWORD must be set (in .env): see handoff item H1 (GBIF password)");
}
const createdBy: string = user;
const dirty = git("status", "--porcelain");
if (dirty !== "") throw new Error(`the tree has uncommitted changes; commit and push them first:\n${dirty}`);
const inputs = await readDeriveInputs();
const derived = deriveAll(inputs);
await assertDerivedFiles(derived);
const { contributions } = derived;
if (Object.keys(contributions.datasets).length === 0) throw new Error("contributions.json lists no datasets: nothing to register");
const sha256 = contributionsSha256(formatJson(contributions, { canonical: true }));
const auth: GetJsonInit = { headers: { Authorization: `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}` } };

await withLock(async () => {
  const state = {
    registration: inputs.registration, contributionsSha256: sha256, datasets: contributions.datasets,
    intent: await readIntent(), intentFile: intentFile(),
  };
  let decision = decide({ ...state, listing: null });
  if (decision.action === "list") {
    decision = decide({ ...state, listing: await allPages<DerivedDatasetRecord>(`${API}/derivedDataset/user/${user}`, auth) });
  }
  switch (decision.action) {
    case "refuse":
      throw new Error(decision.reason);
    case "list":
      throw new Error("decide asked to list twice");
    case "verify": {
      const { expected } = decision;
      await readBack(expected.doi, expected, expected.contributionsSha256, contributions);
      if (decision.deleteIntent) await deleteIntent();
      console.log(`verified ${expected.doi}: GBIF holds registration.json's counts, deposit ${expected.sourceUrl}`);
      return;
    }
    case "adopt": {
      await finish(await readBack(decision.doi, decision.expected, sha256, contributions), "adopted");
      return;
    }
    case "post": {
      const request = requestBody(contributions, sha256, sourceUrlAt(git("rev-parse", "HEAD").trim()));
      await checkDeposit(request.sourceUrl, sha256);
      await createIntent({ contributionsSha256: sha256, request, startedAt: new Date().toISOString() });
      const result = classifyPost(await postOnce(`${API}/derivedDataset`, request));
      if (result.kind !== "created") {
        if (result.kind === "ambiguous") {
          throw new Error(`the POST's outcome is unknown (${result.reason}); ${intentFile()} stays; re-run to reconcile`);
        }
        await deleteIntent();
        throw new Error(`GBIF rejected the derived dataset, so nothing was created: ${result.reason}`);
      }
      await finish(await readBack(result.doi, request, sha256, contributions), "registered");
    }
  }
});

// Writes registration.json, then drops the intent: the order that never loses a minted DOI.
async function finish(registration: Registration, verb: string): Promise<void> {
  await writeJson(registrationFile, registration, { canonical: true });
  await deleteIntent();
  console.log(`${verb} ${registration.doi} (${registration.records} records, ` +
    `${Object.keys(registration.relatedDatasets).length} datasets); now pnpm derive, commit and push`);
}

// Reads the derived dataset back from GBIF and checks it (readBackErrors, then the deposit). Throws on a hard error,
// writing nothing; warnings are printed. Returns registration.json's content.
async function readBack(doi: string, expected: Pick<DerivedDatasetRequest, "title" | "description" | "sourceUrl"> | null,
  hash: string, { datasets }: Contributions): Promise<Registration> {
  const record = await getJson(`${API}/derivedDataset/${doi}`) as DerivedDatasetRecord;
  if (record.doi !== doi) throw new Error(`GBIF returned ${record.doi} for ${doi}`);
  const usages = await allPages<DatasetUsage>(`${API}/derivedDataset/${doi}/datasets`);
  const { hard, warnings } = readBackErrors({ expected, record, usages, datasets, createdBy, hash });
  for (const warning of warnings) console.warn(`warning: ${doi}: ${warning}`);
  if (hard.length > 0) throw new Error(`GBIF's read-back of ${doi} doesn't match: ${hard.join("; ")}`);
  await checkDeposit(record.sourceUrl, hash);
  return toRegistration(record, usages, hash);
}

// The deposit is public and exact (network reads; every failure throws): sourceUrl is the data/ tree at a commit,
// origin's tag gbif-dd-<hex12> holds that commit (it stays reachable after rebases and merges), and that commit's
// contributions.json, served unauthenticated by GitHub, hashes to sha256.
async function checkDeposit(sourceUrl: string, sha256: string): Promise<void> {
  const commit = SOURCE_URL.exec(sourceUrl)?.[1];
  if (commit === undefined) throw new Error(`sourceUrl ${sourceUrl} isn't https://github.com/${REPO}/tree/<commit>/data`);
  const tag = depositTag(sha256);
  const refs = new Map(git("ls-remote", "origin", `refs/tags/${tag}`, `refs/tags/${tag}^{}`).trim().split("\n")
    .filter(Boolean).map((line) => line.split("\t").reverse() as [string, string]));
  const tagged = refs.get(`refs/tags/${tag}^{}`) ?? refs.get(`refs/tags/${tag}`);
  if (tagged === undefined) {
    throw new Error(`origin has no tag ${tag} for the deposit; push it first: git tag ${tag} ${commit} && git push origin ${tag}`);
  }
  if (tagged !== commit) throw new Error(`origin's tag ${tag} is at ${tagged}, not the deposit ${commit}; never move a gbif-dd-* tag`);
  const raw = `https://raw.githubusercontent.com/${REPO}/${commit}/data/gbif-derived-dataset/contributions.json`;
  if (contributionsSha256(formatJson(await getJson(raw), { canonical: true })) !== sha256) {
    throw new Error(`${raw} doesn't hash to contributions-sha256 ${sha256}`);
  }
}

// Every row of a GBIF paged listing (offset/limit, until endOfRecords).
async function allPages<T>(url: string, init: GetJsonInit = {}): Promise<T[]> {
  const rows: T[] = [];
  for (;;) {
    const page = await getJson(`${url}?offset=${rows.length}&limit=${PAGE_LIMIT}`, init) as
      { endOfRecords: boolean; count?: number; results: T[] };
    rows.push(...page.results);
    if (page.endOfRecords) {
      if (page.count !== undefined && page.count !== rows.length) throw new Error(`${url}: ${rows.length} rows, count ${page.count}`);
      return rows;
    }
    if (page.results.length === 0) throw new Error(`${url}: an empty page at offset ${rows.length} before endOfRecords`);
  }
}

// The single POST: its own fetch, never retried (getJson retries), one log line like getJson's.
async function postOnce(url: string, request: DerivedDatasetRequest): Promise<PostOutcome> {
  const start = Date.now();
  let outcome: PostOutcome;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { ...auth.headers as Record<string, string>, "User-Agent": USER_AGENT, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(POST_TIMEOUT_MS),
    });
    outcome = { status: res.status, body: await res.text() };
  } catch (error) {
    outcome = { error: fetchFailure(error) };
  }
  logRequest(start, "error" in outcome ? outcome.error : outcome.status, 1, "POST", url);
  return outcome;
}
