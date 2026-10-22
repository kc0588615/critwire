// DuckDB over HTTP (plan §9 duckdb): a query on the served species.parquet, answered with range requests; and every
// example on the docs page, run against the local server.
import { expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { accessLog, openDuckDB, ORIGIN, records, statusCounts, tag, type DuckDB } from "./helpers.ts";

let db: DuckDB;
test.beforeAll(async () => { db = await openDuckDB(); });
test.afterAll(() => db.close());

test("DuckDB queries species.parquet over HTTP with range requests", async () => {
  const uri = `/v1/species.parquet?${tag()}`;
  const rows = await db.rows(`SELECT "range".status AS status, count(*)::INTEGER AS n FROM read_parquet('${ORIGIN}${uri}') GROUP BY 1 ORDER BY 1`);
  expect(Object.fromEntries(rows.map((r) => [r.status, r.n]))).toEqual(statusCounts(await records()));
  await expect.poll(async () => (await accessLog()).some((e) =>
    e.request.uri === uri && e.request.method === "GET" && e.status === 206 && e.request.headers.Range !== undefined)).toBe(true);
});

// The docs' examples name the live origin only; here they run against the local copy.
test("every docs example runs, and the curl examples cover every /v1 file", async ({ page }) => {
  await page.goto("/");
  const examples = await page.locator("pre > code[data-example]").evaluateAll((cs) =>
    cs.map((c) => ({ kind: c.getAttribute("data-example"), text: c.textContent! })));
  const local = (text: string) => text.replaceAll("https://critwire.com", ORIGIN);
  expect(examples.map((e) => e.kind).sort()).toEqual(expect.arrayContaining(["shell", "sql"]));

  const fetched = new Set<string>();
  for (const { kind, text } of examples) {
    expect(text).not.toContain(ORIGIN);
    if (kind === "shell") {
      const dir = mkdtempSync(join(tmpdir(), "critwire-docs-"));
      try {
        execFileSync("bash", ["-euo", "pipefail", "-c", local(text)], { cwd: dir, stdio: ["ignore", "pipe", "pipe"] });
      } catch (e) {
        throw new Error(`shell example failed:\n${text}\n${(e as { stderr?: Buffer }).stderr}`);
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
      for (const m of text.matchAll(/curl [^\n]*https:\/\/critwire\.com\/v1\/(\S+)/g)) fetched.add(m[1]);
    } else {
      expect(kind).toBe("sql");
      expect((await db.rows(local(text))).length, text).toBeGreaterThan(0);
    }
  }

  // Every top-level file, plus one per-record file by id and one by slug.
  const species = await records();
  const kinds = new Set([...fetched].map((f) => {
    const m = /^species\/(.+)\.json$/.exec(f);
    if (!m) return f;
    expect(species.some((s) => String(s.id) === m[1] || s.slug === m[1]), f).toBe(true);
    return /^\d+$/.test(m[1]) ? "species/{id}.json" : "species/{slug}.json";
  }));
  expect([...kinds].sort()).toEqual(
    ["attribution.json", "species.csv", "species.json", "species.parquet", "species/{id}.json", "species/{slug}.json"]);
});
