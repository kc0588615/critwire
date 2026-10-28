// Shared E2E helpers (plan §9): paths and origins, the committed records, the dist/ check, DuckDB, the local Caddy's
// access log, and Learn's browser pages (learnContext, waitReady).
import { expect, type Browser, type BrowserContext, type Page } from "@playwright/test";
import { DuckDBInstance } from "@duckdb/node-api";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { LabManifest } from "../scripts/build/learn/data.ts";
import { readLabFiles } from "../scripts/learn/lab-files.ts";
import { speciesFile, type Species } from "../scripts/species.ts";

const repo = new URL("../", import.meta.url);
export const repoPath = (path: string) => fileURLToPath(new URL(path, repo));
export const distPath = (path: string) => repoPath(`dist/${path}`);

export const ARTIFACTS = resolve(process.env.E2E_ARTIFACTS ?? repoPath("e2e-artifacts"));
export const ORIGIN = "http://127.0.0.1:3100";
export const SECOND_ORIGIN = "http://127.0.0.1:3101";

export const speciesBytes = () => readFile(speciesFile);
export const records = async (): Promise<Species[]> => JSON.parse(await readFile(speciesFile, "utf8"));

// Record count per range.status.
export function statusCounts(species: readonly Pick<Species, "range">[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of species) counts[s.range.status] = (counts[s.range.status] ?? 0) + 1;
  return counts;
}

export const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");

// /learn/data/manifest.json (scripts/build/learn/data.ts LabManifest), as the specs read it.
export const learnManifest = async (): Promise<LabManifest> => JSON.parse(await readFile(distPath("learn/data/manifest.json"), "utf8"));

// The first check: the specs test dist/, so it must be the build of the committed data: species.json, and (plan D15)
// /learn/data/ through its manifest: the /v1 inputs it was built from, the sample's sha256 and the copied data/learn/
// files.
export async function assertBuilt(): Promise<void> {
  const [built, data] = await Promise.all([readFile(distPath("v1/species.json")).catch(() => null), speciesBytes()]);
  if (!built?.equals(data)) throw new Error("dist/ is missing or older than data/species.json: run pnpm build");
  const manifest = await learnManifest().catch(() => null);
  if (!manifest) throw new Error("dist/learn/data/manifest.json is missing: run pnpm build");
  const stale: string[] = [];
  for (const [file, { sha256: want }] of Object.entries(manifest.inputs.v1)) {
    if (sha256(await readFile(distPath(`v1/${file}`))) !== want) stale.push(`inputs.v1 ${file}`);
  }
  const contributions = JSON.parse(await readFile(repoPath("data/gbif-learn-sample/contributions.json"), "utf8"));
  if (manifest.inputs.sample.sha256 !== contributions.sample.sha256) stale.push("inputs.sample");
  for (const f of await readLabFiles()) if (manifest.files[f.name]?.sha256 !== f.sha256) stale.push(f.name);
  if (stale.length) throw new Error(`dist/learn/data/ is older than data/ (${stale.join(", ")}): run pnpm build`);
}

// A query-string tag that picks one test's requests out of the shared access log.
export const tag = () => `t=${randomUUID()}`;

export const sqlText = (value: string) => `'${value.replaceAll("'", "''")}'`;

// DuckDB for reading the exports. httpfs autoinstalls here on first use (the E2E may use the network; the build never).
export async function openDuckDB() {
  const db = await DuckDBInstance.create(":memory:", {
    extension_directory: repoPath("node_modules/.cache/critwire-duckdb"),
    autoinstall_known_extensions: "true",
    autoload_known_extensions: "true",
  });
  const con = await db.connect();
  return {
    rows: async (sql: string) => (await con.runAndReadAll(sql)).getRowObjectsJS() as Record<string, unknown>[],
    close: () => { con.closeSync(); db.closeSync(); },
  };
}
export type DuckDB = Awaited<ReturnType<typeof openDuckDB>>;

// species.parquet (a path or URL) as JSON records, in file order. A sources key a record leaves out comes back NULL
// (plan §4), so NULL source keys are dropped to compare with the JSON.
export async function parquetRecords(db: DuckDB, source: string): Promise<unknown[]> {
  const rows = await db.rows(`SELECT to_json(t)::VARCHAR AS j FROM read_parquet(${sqlText(source)}) t`);
  return rows.map(({ j }) => {
    const r = JSON.parse(j as string);
    r.sources = r.sources.map((s: object) => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== null)));
    return r;
  });
}

// species.csv (a path or URL) as rows of strings, NULL for an empty field.
export const csvRows = (db: DuckDB, source: string) =>
  db.rows(`SELECT * FROM read_csv(${sqlText(source)}, header=true, all_varchar=true)`);

// One request in Caddy's JSON access log.
export interface Access {
  request: { method: string; uri: string; headers: Record<string, string[]> };
  status: number;
}

export async function accessLog(): Promise<Access[]> {
  const text = await readFile(`${ARTIFACTS}/caddy-access.log`, "utf8").catch(() => "");
  return text.split("\n").filter(Boolean).map((line) => JSON.parse(line) as Access);
}

// Learn's browser pages (plan D13). learnContext: a new context where every request off ORIGIN is aborted and recorded
// in `offOrigin`, so a page that reaches for another host fails its test. Routes a test adds later run first
// (Playwright's order). Routing disables the cache, so learn-timing uses a plain context instead.
export async function learnContext(browser: Browser): Promise<{ context: BrowserContext; offOrigin: string[] }> {
  const context = await browser.newContext();
  const offOrigin: string[] = [];
  await context.route("**/*", (route) => {
    const url = route.request().url();
    if (new URL(url).origin === ORIGIN) return route.continue();
    offOrigin.push(url);
    return route.abort("blockedbyclient");
  });
  return { context, offOrigin };
}

// The engine's state on a Learn page (site/learn/src/app.ts sets body[data-engine]).
export const engineState = (page: Page) => page.locator("body");

// Waits until the page's engine has run setup.sql (data-engine="ready"); fails fast on "failed".
export async function waitReady(page: Page, timeout = 30_000): Promise<void> {
  await expect(engineState(page)).toHaveAttribute("data-engine", /^(ready|failed)$/, { timeout });
  const state = await engineState(page).getAttribute("data-engine");
  if (state !== "ready") throw new Error(`engine failed: ${await page.locator("#engine-status").textContent()}`);
}
