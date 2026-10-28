// The release smoke (plan S26, Verification "Release smoke"), against RELEASE_ORIGIN, never run by the default config:
// every dist/ file is served with dist's bytes (each page at its folder URL), the .wasm files as application/wasm, and
// f3's first browser block shows its recorded result. dist/ must be the build of the released commit.
// Run: RELEASE_ORIGIN=https://critwire.com E2E_ARTIFACTS=<dir> pnpm exec playwright test -c playwright.release.config.ts
import { expect, test } from "@playwright/test";
import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { distPath, firstBrowserBlock, rendered, runBlock, sha256, waitReady } from "../helpers.ts";

// Every file under dist/, as its URL path: an index.html as its folder.
async function distFiles(): Promise<{ file: string; url: string }[]> {
  const files = (await readdir(distPath(""), { recursive: true, withFileTypes: true })).filter((d) => d.isFile());
  return files.map((d) => {
    const file = relative(distPath(""), join(d.parentPath, d.name));
    return { file, url: `/${file.replace(/(^|\/)index\.html$/, "$1")}` };
  }).sort((a, b) => a.file.localeCompare(b.file));
}

test("every dist/ file is served with dist's bytes; a page at its folder URL", async ({ request }) => {
  test.setTimeout(600_000);
  const files = await distFiles();
  expect(files.some((f) => f.url === "/learn/")).toBe(true);
  const differ: string[] = [];
  for (const { file, url } of files) {
    const res = await request.get(url);
    if (res.status() !== 200) differ.push(`${url}: ${res.status()}`);
    else if (sha256(await res.body()) !== sha256(await readFile(distPath(file)))) differ.push(`${url}: bytes differ from dist/${file}`);
  }
  expect(differ).toEqual([]);
});

test("the .wasm files are served as application/wasm", async ({ request }) => {
  const wasm = (await distFiles()).filter((f) => f.url.startsWith("/learn/assets/") && f.url.endsWith(".wasm"));
  expect(wasm.length).toBeGreaterThan(0);
  for (const { url } of wasm) {
    const res = await request.head(url);
    expect(res.status(), url).toBe(200);
    expect(res.headers()["content-type"], url).toBe("application/wasm");
  }
});

test("f3's first browser block shows its recorded result", async ({ page }) => {
  const { id, url } = await firstBrowserBlock("f3");
  await page.goto(url);
  await waitReady(page);
  await runBlock(page.locator(`#q-${id}`));
  expect(await rendered(page, id)).toMatchSnapshot(`${id}.txt`);
});
