// The lab sample's GBIF ingest (plan D6, 004 §4.2): pnpm ingest gbif-sample [--download <key> | --new]. --new submits
// a download (intent before the one POST, then polling; decideDownload says which download a run uses), otherwise it
// reuses a finished GBIF download (the key given, else download.json's): GBIF's status must be SUCCEEDED and its stored request must
// equal today's (downloadRequest over the species' ids.gbif, computed by derive in memory: never species.json, D7);
// on a re-run of the same key the zip's sha256 must equal download.json's. It streams the zip into a temp folder,
// parses its one SIMPLE_CSV member, applies the species rule, checks rows against GBIF's totalRecords and per-dataset
// listing, reads every dataset's and publisher's metadata, then keeps the effective-open records, at most CAP per
// species. Only after every check does it write data/raw/gbif-sample/{download.json,datasets.json,sample.csv}.
// Country keys are derive's (D7), so sample.csv keeps GBIF's raw countryCode.
import { execFile, spawn } from "node:child_process";
import { mkdir, mkdtemp, rename, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { deriveCore, readCoreInputs, type CoreInputs } from "../derive/pipeline.ts";
import { allPages } from "../gbif/pages.ts";
import { namedState } from "../gbif/state.ts";
import { loadEnv } from "../env.ts";
import { basicAuth, postOnce } from "../gbif/post.ts";
import { classifyPost } from "../gbif/register.ts";
import { downloadFile, getJson, hashFile } from "../http.ts";
import { formatJson, readOptionalText } from "../json.ts";
import {
  decideDownload, DOWNLOAD_KEY, downloadRequest, parseDownloadKey, sameRequest, type DownloadArgs, type DownloadIntent,
  type ListedDownload,
} from "../learn/download.ts";
import { capSample, effectiveLicense, OPEN_LICENSES, SAMPLE_RULES, speciesFor, type SampleLicense } from "../learn/sample-rules.ts";
import { readSimpleCsv, type ParseContext, type SampleRecord } from "../learn/simple-csv.ts";
import {
  SAMPLE_COLUMNS, SAMPLE_FILES, sampleDir, type SampleDataset, type SampleDatasets, type SampleDownload, type SampleRow,
  sampleSpeciesOf, sortByGbif, type SampleSpecies,
} from "../learn/sample-files.ts";
import { utcDate } from "../raw.ts";
import { occurrenceSearchQuery } from "./gbif.ts";

const API = "https://api.gbif.org/v1";
// The zip is ~35 MB.
const ZIP_TIMEOUT_MS = 10 * 60_000;
// GBIF prepared the spike's download in 17 min; a run polls once a minute for up to an hour, then a re-run resumes.
const POLL_MS = 60_000;
const POLL_LIMIT_MS = 60 * 60_000;
// Statuses after which a download never succeeds.
const FINAL_FAILURES = new Set(["KILLED", "FAILED", "CANCELLED", "FILE_ERASED"]);
// totalRecords may differ from the search count at submission by this fraction (records indexed in between).
const SEARCH_COUNT_TOLERANCE = 0.001;
const USAGE = "usage: pnpm ingest gbif-sample [--download <key> | --new]";

// GBIF dataset license URLs → the sample's license names. Another URL fails the ingest.
export const DATASET_LICENSES: Readonly<Record<string, SampleLicense>> = {
  "http://creativecommons.org/publicdomain/zero/1.0/legalcode": "CC0 1.0",
  "http://creativecommons.org/licenses/by/4.0/legalcode": "CC BY 4.0",
  "http://creativecommons.org/licenses/by-nc/4.0/legalcode": "CC BY-NC 4.0",
};

// The lock around every run, and the intent a new download (--new, plan D6) writes before its POST.
export const downloadState = namedState<DownloadIntent>("gbif-sample-download", "ingest gbif-sample");

interface GbifDownload {
  key: string;
  status: string;
  doi: string;
  license: string;
  created: string;
  eraseAfter: string;
  totalRecords: number;
  numberDatasets: number;
  size: number;
  downloadLink: string;
  request: Record<string, unknown>;
}

// The species with an ids.gbif, from derive's in-memory core: species.json is never read, so a stale derived file
// never blocks the sample's re-ingest (D7).
export function sampleSpecies(inputs: CoreInputs): SampleSpecies[] {
  return sampleSpeciesOf(deriveCore(inputs).records);
}

// GBIF's per-dataset record counts for the download, sorted by key.
async function datasetListing(api: string, key: string, numberDatasets: number): Promise<Record<string, number>> {
  const rows = await allPages<{ datasetKey: string; numberRecords: number }>(`${api}/occurrence/download/${key}/datasets`);
  const counts: Record<string, number> = {};
  for (const { datasetKey, numberRecords } of [...rows].sort((a, b) => (a.datasetKey < b.datasetKey ? -1 : 1))) {
    if (Object.hasOwn(counts, datasetKey)) throw new Error(`download ${key}: dataset ${datasetKey} listed twice`);
    counts[datasetKey] = numberRecords;
  }
  if (rows.length !== numberDatasets) throw new Error(`download ${key}: listing has ${rows.length} datasets, numberDatasets ${numberDatasets}`);
  return counts;
}

// The records of the zip's one member, <key>.csv (unzip -Z1 lists it; unzip -p streams it, CRC-checked).
async function readZip(zipPath: string, key: string, ctx: ParseContext): Promise<SampleRecord[]> {
  const names = (await promisify(execFile)("unzip", ["-Z1", zipPath])).stdout.split("\n").filter(Boolean);
  if (names.join() !== `${key}.csv`) throw new Error(`download ${key}: the zip lists ${names.join(", ")}, expected ${key}.csv alone`);
  const child = spawn("unzip", ["-p", zipPath, `${key}.csv`], { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.setEncoding("utf8").on("data", (d: string) => { stderr += d; });
  const exited = new Promise<number | string>((resolve, reject) => {
    child.on("error", reject);
    child.on("close", (code, signal) => resolve(code ?? signal ?? "unknown"));
  });
  try {
    const records = await readSimpleCsv(createInterface({ input: child.stdout, crlfDelay: Infinity }), ctx);
    const code = await exited;
    if (code !== 0) throw new Error(`unzip -p ${key}.csv exited ${code}: ${stderr.slice(0, 300)}`);
    return records;
  } finally {
    child.kill();
  }
}

// Throws unless the rows equal GBIF's totalRecords and its per-dataset listing. Returns each dataset's rows per
// record license.
function checkCounts(key: string, records: SampleRecord[], totalRecords: number, listing: Record<string, number>): Map<string, Record<string, number>> {
  if (records.length !== totalRecords) throw new Error(`download ${key}: the zip holds ${records.length} rows, GBIF's totalRecords ${totalRecords}`);
  const perDataset = new Map<string, Record<string, number>>();
  for (const r of records) {
    const licenses = perDataset.get(r.datasetKey) ?? {};
    licenses[r.license] = (licenses[r.license] ?? 0) + 1;
    perDataset.set(r.datasetKey, licenses);
  }
  const rows = (k: string) => Object.values(perDataset.get(k) ?? {}).reduce((a, b) => a + b, 0);
  const off = Object.keys(listing).filter((k) => rows(k) !== listing[k]).map((k) => `${k}: ${rows(k)} rows, listing ${listing[k]}`);
  if (off.length) throw new Error(`download ${key}: per-dataset rows differ from GBIF's listing: ${off.join("; ")}`);
  return perDataset;
}

// Every dataset's metadata and its publisher's name (one request per publisher). An unknown license, no title or no
// publisher fails, naming every problem.
async function datasetMetadata(api: string, listing: Record<string, number>, recordLicenses: Map<string, Record<string, number>>): Promise<SampleDataset[]> {
  const publishers = new Map<string, string | null>();
  const problems: string[] = [];
  const datasets: SampleDataset[] = [];
  for (const [key, records] of Object.entries(listing)) {
    const ds = await getJson(`${api}/dataset/${key}`) as { title?: string; doi?: string; license?: string; publishingOrganizationKey?: string; deleted?: string };
    const org = ds.publishingOrganizationKey ?? "";
    if (org && !publishers.has(org)) publishers.set(org, ((await getJson(`${api}/organization/${org}`)) as { title?: string }).title || null);
    const licenseUrl = ds.license ?? "";
    const license = DATASET_LICENSES[licenseUrl];
    const publisher = publishers.get(org) ?? null;
    if (!license) problems.push(`${key}: unknown license ${JSON.stringify(ds.license ?? null)}`);
    if (!ds.title) problems.push(`${key}: no title`);
    if (!publisher) problems.push(`${key}: no publisher`);
    datasets.push({
      key, title: ds.title ?? "", publisher: publisher ?? "", publishingOrganizationKey: org, doi: ds.doi ?? null, license, licenseUrl,
      records, recordLicenses: recordLicenses.get(key) ?? {}, ...(ds.deleted ? { deleted: ds.deleted } : {}),
    });
  }
  if (problems.length) throw new Error(`dataset metadata refused (nothing written):\n  ${problems.join("\n  ")}`);
  return datasets;
}

// The sample: every record with its species and effective license; the open ones, capped per species, sorted by id.
function sampleRows(records: SampleRecord[], species: SampleSpecies[], datasets: SampleDataset[]): { open: number; rows: SampleRow[] } {
  const byGbif = new Map(species.map((s) => [s.gbif, s.id]));
  const licenseOf = new Map(datasets.map((d) => [d.key, d.license]));
  const open: SampleRow[] = [];
  for (const r of records) {
    let speciesId: number;
    try {
      speciesId = speciesFor(r.speciesKey, r.taxonKey, byGbif);
    } catch (e) {
      throw new Error(`gbifID ${r.id}: ${(e as Error).message}`);
    }
    const license = effectiveLicense(r.license, licenseOf.get(r.datasetKey)!);
    if (!OPEN_LICENSES.includes(license)) continue;
    open.push({
      id: r.id, species_id: speciesId, dataset_key: r.datasetKey, license, basis_of_record: r.basisOfRecord, longitude: r.longitude,
      latitude: r.latitude, coordinate_uncertainty_m: r.coordinateUncertaintyM, country_code_gbif: r.countryCode, year: r.year, month: r.month,
    });
  }
  return { open: open.length, rows: capSample(open) };
}

// sample.csv: a header, then one line per row; null is empty. No quoting: a value holding a comma, quote or newline fails.
function sampleCsv(rows: SampleRow[]): string {
  const cell = (v: string | number | null) => {
    const text = v === null ? "" : String(v);
    if (/[",\r\n]/.test(text)) throw new Error(`sample.csv: value ${JSON.stringify(text)} needs quoting`);
    return text;
  };
  return [SAMPLE_COLUMNS.join(","), ...rows.map((r) => SAMPLE_COLUMNS.map((c) => cell(r[c])).join(","))].join("\n") + "\n";
}

// Reads, checks and samples download `key` for these species, then writes the three files into `dest` (each to a temp
// file, then renamed). Nothing is written unless every check passed.
export async function ingestGbifSample({ api = API, dest = sampleDir, key, species }: { api?: string; dest?: URL; key: string; species: SampleSpecies[] }): Promise<void> {
  const built = downloadRequest(species.map((s) => s.gbif));
  const stored = await readDownload(dest);
  const meta = await getJson(`${api}/occurrence/download/${key}`) as GbifDownload;
  if (meta.key !== key) throw new Error(`GBIF returned download ${meta.key} for ${key}`);
  if (meta.status !== "SUCCEEDED") throw new Error(`download ${key} is ${meta.status}, not SUCCEEDED; it can't be reused`);
  if (!sameRequest(meta.request, built)) {
    throw new Error(`download ${key} isn't today's request (ids.gbif or the filters changed): run pnpm ingest gbif-sample --new`);
  }
  const listing = await datasetListing(api, key, meta.numberDatasets);

  const tmp = await mkdtemp(join(tmpdir(), "critwire-gbif-sample-"));
  let records: SampleRecord[];
  let zip: SampleDownload["zip"];
  try {
    const zipPath = join(tmp, `${key}.zip`);
    // A re-run of the same key must read the same zip; a new key's zip is hashed here for the first time.
    await downloadFile(meta.downloadLink, zipPath, { sha256: stored?.key === key ? stored.zip.sha256 : null, bytes: meta.size, timeoutMs: ZIP_TIMEOUT_MS });
    zip = { bytes: meta.size, sha256: await hashFile(zipPath) };
    records = await readZip(zipPath, key, { downloadYear: new Date(meta.created).getUTCFullYear(), datasetKeys: new Set(Object.keys(listing)) });
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
  const recordLicenses = checkCounts(key, records, meta.totalRecords, listing);
  const datasets = await datasetMetadata(api, listing, recordLicenses);
  const { open, rows } = sampleRows(records, species, datasets);

  const { creator: _creator, ...request } = meta.request;
  const download: SampleDownload = {
    key, doi: meta.doi, license: meta.license, created: meta.created, eraseAfter: meta.eraseAfter, totalRecords: meta.totalRecords,
    numberDatasets: meta.numberDatasets, request, downloadLink: meta.downloadLink, zip, datasetCounts: listing, sampleRules: SAMPLE_RULES,
    species: sortByGbif(species),
  };
  const texts: Record<(typeof SAMPLE_FILES)[number], string> = {
    "download.json": formatJson(download, { canonical: true }),
    "datasets.json": formatJson({ retrieved: utcDate(), downloadKey: key, datasets } satisfies SampleDatasets, { canonical: true }),
    "sample.csv": sampleCsv(rows),
  };
  await mkdir(dest, { recursive: true });
  const paths = SAMPLE_FILES.map((f) => fileURLToPath(new URL(f, dest)));
  for (const [i, f] of SAMPLE_FILES.entries()) await writeFile(`${paths[i]}.tmp-${process.pid}`, texts[f]);
  for (const path of paths) await rename(`${path}.tmp-${process.pid}`, path);
  const publishers = new Set(datasets.map((d) => d.publishingOrganizationKey)).size;
  console.log(`ingest gbif-sample: ${key}: ${records.length} records → ${open} effective-open → ${rows.length} sample ` +
    `(≤ ${SAMPLE_RULES.cap} per species); ${datasets.length} datasets, ${publishers} publishers`);
}

// download.json in `dest`, or null before the first ingest.
async function readDownload(dest: URL): Promise<SampleDownload | null> {
  const text = await readOptionalText(new URL("download.json", dest));
  return text === null ? null : JSON.parse(text) as SampleDownload;
}

export interface RunOptions {
  api?: string;
  dest?: URL;
  species?: SampleSpecies[]; // default: derive's in-memory core
  credentials?: () => { user: string; password: string }; // for the POST and the listing only
  pollMs?: number;
  pollLimitMs?: number;
}

function envCredentials(): { user: string; password: string } {
  loadEnv();
  const { GBIF_USERNAME: user, GBIF_PASSWORD: password } = process.env;
  if (!user || !password) throw new Error("GBIF_USERNAME and GBIF_PASSWORD must be set (in .env): see handoff item H1 (GBIF password)");
  return { user, password };
}

function parseArgs(args: string[]): DownloadArgs {
  if (args.length === 0) return { mode: "reuse", key: null };
  if (args.length === 1 && args[0] === "--new") return { mode: "new" };
  if (args.length === 2 && args[0] === "--download" && DOWNLOAD_KEY.test(args[1])) return { mode: "reuse", key: args[1] };
  throw new Error(USAGE);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// pnpm ingest gbif-sample [--download <key> | --new], under the download lock. decideDownload picks the row: reuse a
// finished download; POST a new one (intent first); adopt one the user's listing shows for a key-less intent; or
// resume an intent's key. A new download is polled until GBIF finishes it, checked against the search count at
// submission, ingested, and only then is its intent deleted (download.json holds the key first).
export async function runGbifSample(args: string[], {
  api = API, dest = sampleDir, species, credentials = envCredentials, pollMs = POLL_MS, pollLimitMs = POLL_LIMIT_MS,
}: RunOptions = {}): Promise<void> {
  const parsed = parseArgs(args);
  const sp = species ?? sampleSpecies(await readCoreInputs());
  const built = downloadRequest(sp.map((s) => s.gbif));
  const state = downloadState;
  const intentFile = state.intentFile();
  await state.withLock(async () => {
    let intent = await state.readIntent();
    const input = { args: parsed, intent, built, listing: null, intentFile };
    let decision = decideDownload(input);
    if (decision.action === "list") {
      const { user, password } = credentials();
      const listing = await allPages<ListedDownload>(`${api}/occurrence/download/user/${user}`, { headers: { Authorization: basicAuth(user, password) } });
      decision = decideDownload({ ...input, listing });
    }
    switch (decision.action) {
      case "refuse":
        throw new Error(decision.reason);
      case "list":
        throw new Error("decideDownload asked to list twice");
      case "reuse": {
        const key = decision.key ?? (await readDownload(dest))?.key ?? null;
        if (key === null) throw new Error(`no download.json yet: ${USAGE}`);
        await ingestGbifSample({ api, dest, key, species: sp });
        return;
      }
      case "post":
        intent = await postDownload();
        break;
      case "adopt":
        intent = { ...intent!, key: decision.key };
        await state.replaceIntent(intent);
        console.error(`ingest gbif-sample: adopted download ${decision.key} for the POST at ${intent.startedAt}`);
        break;
      case "resume":
        break;
    }
    await finishDownload(intent!);
  });
  console.log("ingest gbif-sample: wrote download.json, datasets.json and sample.csv");

  // Records the search count, writes the intent, then the one POST. Returns the intent with GBIF's key.
  async function postDownload(): Promise<DownloadIntent> {
    const { user, password } = credentials();
    const keys = sp.map((s) => s.gbif).sort((a, b) => a - b);
    const { count } = await getJson(`${api}/occurrence/search?${occurrenceSearchQuery(keys)}`) as { count?: unknown };
    if (!Number.isSafeInteger(count) || (count as number) < 0) throw new Error(`occurrence search count is ${JSON.stringify(count)}`);
    const intent: DownloadIntent = { request: built, startedAt: new Date().toISOString(), searchCount: count as number, key: null };
    await state.createIntent(intent);
    const outcome = await postOnce(`${api}/occurrence/download/request`, { ...built, creator: user },
      { authorization: basicAuth(user, password), accept: "application/json, text/plain" });
    const result = classifyPost(outcome, parseDownloadKey);
    if (result.kind === "ambiguous") throw new Error(`the download POST's outcome is unknown (${result.reason}); ${intentFile} stays; re-run to reconcile`);
    if (result.kind === "rejected") {
      await state.deleteIntent();
      throw new Error(`GBIF rejected the download request, so nothing was created: ${result.reason}`);
    }
    const created = { ...intent, key: result.key };
    await state.replaceIntent(created);
    console.error(`ingest gbif-sample: submitted download ${result.key} (search count ${intent.searchCount})`);
    return created;
  }

  // Polls the intent's download until GBIF finishes it, checks its totalRecords, ingests it, then deletes the intent.
  async function finishDownload(intent: DownloadIntent): Promise<void> {
    const key = intent.key!;
    const start = Date.now();
    let meta: GbifDownload;
    for (;;) {
      meta = await getJson(`${api}/occurrence/download/${key}`) as GbifDownload;
      if (meta.status === "SUCCEEDED") break;
      if (FINAL_FAILURES.has(meta.status)) {
        await state.deleteIntent();
        throw new Error(`download ${key} is ${meta.status}, final on GBIF's side; ${intentFile} deleted; run pnpm ingest gbif-sample --new to submit again`);
      }
      if (Date.now() - start >= pollLimitMs) {
        throw new Error(`download ${key} is still ${meta.status} after ${Math.round((Date.now() - start) / 60_000)} min; ` +
          `re-run to resume (${intentFile} keeps the key)`);
      }
      console.error(`ingest gbif-sample: download ${key} is ${meta.status}`);
      await sleep(pollMs);
    }
    if (Math.abs(meta.totalRecords - intent.searchCount) > intent.searchCount * SEARCH_COUNT_TOLERANCE) {
      throw new Error(`download ${key}: totalRecords ${meta.totalRecords} vs the search count at submission ${intent.searchCount}: ` +
        `off by more than 0.1 %; ${intentFile} stays; delete it and run --new only after checking GBIF's download`);
    }
    await ingestGbifSample({ api, dest, key, species: sp });
    await state.deleteIntent();
  }
}
