// The docs page (plan §8, §9 docs): every section, every field, the GBIF DOI in the credits, readable at 375 px,
// and no broken links. Expectations come from data/, not from the build's code.
import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { ARTIFACTS, ORIGIN, records, repoPath } from "./helpers.ts";

const SECTIONS = ["about", "files", "fields", "licenses", "credits", "cite"];
const REGISTRATION = repoPath("data/gbif-derived-dataset/registration.json");
// External links are checked against this list, not fetched (gbif.org returns 403 to bots).
const HOSTS = new Set([
  "github.com", "doi.org", "creativecommons.org", "commons.wikimedia.org", "www.catalogueoflife.org", "www.gbif.org",
  "www.wikidata.org", "www.iucnredlist.org", "www.inaturalist.org", "www.ncbi.nlm.nih.gov", "duckdb.org",
  "play.critterconnect.org",
]);

// Every key path in the records, e.g. "taxonomy.class" or "sources[].doi".
function keyPaths(value: unknown, prefix = ""): string[] {
  if (Array.isArray(value)) return value.flatMap((v) => (v !== null && typeof v === "object" ? keyPaths(v, `${prefix}[]`) : []));
  if (value === null || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return [path, ...keyPaths(v, path)];
  });
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  expect((await page.goto("/"))?.status()).toBe(200);
});

test("every section renders, and every field is described", async ({ page }) => {
  for (const id of SECTIONS) await expect(page.locator(`section#${id} h2`)).toBeVisible();
  const described = new Set(await page.locator("#fields dt code").allTextContents());
  const paths = [...new Set((await records()).flatMap((r) => keyPaths(r)))].sort();
  expect(paths.filter((p) => !described.has(p))).toEqual([]);
  for (const status of ["ok", "no-open-records", "identity-unsettled"]) await expect(page.locator("#fields")).toContainText(status);
});

test("the credits cite the GBIF derived-dataset DOI", async ({ page }) => {
  test.skip(!existsSync(REGISTRATION), "no GBIF registration yet (H1)");
  const { doi, relatedDatasets } = JSON.parse(await readFile(REGISTRATION, "utf8"));
  const credits = page.locator("#credits");
  await expect(credits.locator(`a[href="https://doi.org/${doi}"]`)).toBeVisible();
  await expect(credits).toContainText(`${Object.keys(relatedDatasets).length} datasets`);
  await expect(credits.locator('a[href="/v1/attribution.json"]').first()).toBeVisible();
});

test("fits a 375 px phone screen", async ({ page }, info) => {
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  const path = `${ARTIFACTS}/docs-375.png`;
  await page.screenshot({ path, fullPage: true });
  await info.attach("docs-375", { path, contentType: "image/png" });
});

test("same-origin links return 200, anchors exist, external links are https on the allowlist", async ({ page, request }) => {
  const hrefs = await page.locator("a[href]").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of new Set(hrefs)) {
    const url = new URL(href);
    if (url.origin === ORIGIN) {
      if (url.hash) expect(await page.locator(`[id="${url.hash.slice(1)}"]`).count(), href).toBe(1);
      expect((await request.get(url.pathname)).status(), href).toBe(200);
    } else {
      expect(url.protocol, href).toBe("https:");
      expect(HOSTS.has(url.host), href).toBe(true);
    }
  }
});
