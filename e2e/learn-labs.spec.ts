// Learn's lab blocks on their pages and in their downloads (plan D13 learn-labs, S13; 004 §7.2–7.3): each page's
// /learn/labs/ file is served as the build assembled it (assemble.ts, what learn:check ran); each PostGIS block's
// page code appears verbatim in it, or, for an untested or two-session block, commented out under its reason; the
// result a page shows is checked/<id>.txt, and its versions line is checked.json's; a Power BI block lists the star
// files it reads with the manifest's rows and sha256, which the served files match and star-check passes. The setup
// page links the checks' download (pg-checks.sql) and the loader.
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { moduleUrl } from "../scripts/build/learn/module-html.ts";
import { assembleDownloads } from "../scripts/learn/assemble.ts";
import { CHECKED_DIR, type Block } from "../scripts/learn/blocks.ts";
import { SETUP_PAGE, type CoursePage } from "../scripts/learn/course.ts";
import { readCourse } from "../scripts/learn/course-files.ts";
import { readStamp } from "../scripts/learn/freshness.ts";
import { checkInput, type StarManifest } from "../scripts/learn/star-check.ts";
import { distPath, learnContext, repoPath, sha256 } from "./helpers.ts";

const trimEnd = (s: string) => s.replace(/\n+$/, "");
const runnable = (b: Block) => b.status === "ran" && !b.sessions.length;

async function course() {
  const c = await readCourse();
  const url = (p: CoursePage) => (p.page.id === SETUP_PAGE ? "/learn/setup/" : moduleUrl(c.curriculum!.modules.find((m) => m.id === p.page.id)!));
  return { pages: c.pages, url };
}

test("each download is served as assembled; each PostGIS block's page code is in it, verbatim or commented out under its reason", async ({ browser, request }) => {
  const { pages, url } = await course();
  const downloads = assembleDownloads(pages);
  expect(downloads.map((d) => d.name)).toEqual(expect.arrayContaining(["pg-checks.sql", "d6.sql"]));
  const { context, offOrigin } = await learnContext(browser);
  const page = await context.newPage();
  for (const d of downloads) {
    const res = await request.get(`/learn/labs/${d.name}`);
    expect(res.status(), d.name).toBe(200);
    const text = await res.text();
    expect(text, d.name).toBe(d.text);
    const course = pages.find((p) => p.page.id === d.page)!;
    await page.goto(url(course));
    for (const b of course.blocks.filter((x) => x.engine === "postgis")) {
      const code = await page.locator(`#q-${b.id} pre.code`).textContent();
      expect(code, b.id).toBe(trimEnd(b.code));
      if (runnable(b)) expect(text.includes(code!), `${b.id} in ${d.name}`).toBe(true);
      else {
        const reason = b.status === "untested" ? b.reason : `it needs one psql window per session (${b.sessions.join(", ")})`;
        const commented = code!.split("\n").map((l) => (l ? `-- ${l}` : "--")).join("\n");
        expect(text.includes(`-- not run from this file: ${reason}. Run it by hand, as its page says.`), b.id).toBe(true);
        expect(text.includes(commented), `${b.id} commented out in ${d.name}`).toBe(true);
      }
      await expect(page.locator(`#q-${b.id} .download a`)).toHaveAttribute("href", `/learn/labs/${d.name}`);
    }
  }
  expect(offOrigin).toEqual([]);
  await context.close();
});

test("a PostGIS block shows checked/<id>.txt (or its untested reason); the page's versions line is checked.json's, once", async ({ browser }) => {
  const { pages, url } = await course();
  const stamp = readStamp()!;
  const { context, offOrigin } = await learnContext(browser);
  const page = await context.newPage();
  for (const p of pages.filter((x) => x.blocks.some((b) => b.engine === "postgis"))) {
    await page.goto(url(p));
    const v = stamp.versions;
    await expect(page.locator(".checked")).toHaveText([`Checked ${stamp.checked} on PostgreSQL ${v.postgresql}, PostGIS ${v.postgis}, GEOS ${v.geos}.`]);
    for (const b of p.blocks.filter((x) => x.engine === "postgis")) {
      if (b.status === "untested") await expect(page.locator(`#q-${b.id} .untested`)).toHaveText(`Not run here: ${b.reason}.`);
      else expect(await page.locator(`#q-${b.id} pre.recorded`).textContent(), b.id)
        .toBe(trimEnd(await readFile(repoPath(`${CHECKED_DIR}/${b.id}.txt`), "utf8")));
    }
  }
  expect(offOrigin).toEqual([]);
  await context.close();
});

test("a Power BI block lists its star inputs with the manifest's rows and sha256, and the served files match", async ({ browser, request }) => {
  const { pages, url } = await course();
  const manifest = (await (await request.get("/learn/data/star/manifest.json")).json()) as StarManifest;
  const { context } = await learnContext(browser);
  const page = await context.newPage();
  const pbi = pages.flatMap((p) => p.blocks.filter((b) => b.engine === "powerbi").map((b) => [p, b] as const));
  expect(pbi.map(([, b]) => b.id)).toContain("pbi-smoke");
  for (const [p, b] of pbi) {
    await page.goto(url(p));
    await expect(page.locator(`#q-${b.id} .untested`)).toHaveText("Not run by critwire: Power BI Desktop is Windows-only.");
    const rows = await page.locator(`#q-${b.id} table.inputs tbody tr`).evaluateAll((trs) => trs.map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent)));
    const want = b.inputs.map((input) => {
      const f = manifest.files[input.slice("star/".length)]!;
      return [input, f.rows.toLocaleString("en-US"), f.sha256];
    });
    expect(rows, b.id).toEqual(want);
    for (const [input, , hash] of want) expect(sha256(await (await request.get(`/learn/data/${input}`)).body()), input).toBe(hash);
    // What the M reads passes the star's checks: header, rows, sha256, keys (star-check).
    for (const input of b.inputs) expect((await checkInput(distPath("learn/data/star"), input)).errors, `${b.id} ${input}`).toEqual([]);
  }
  await context.close();
});

test("the setup page covers the browser, PostGIS and Power BI, and links pg-checks.sql and the loader", async ({ page }) => {
  expect((await page.goto("/learn/setup/"))?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText(["The browser", "PostgreSQL with PostGIS, on your computer", "Python", "Power BI Desktop"]);
  for (const href of ["/learn/labs/pg-checks.sql", "/learn/data/postgis/learn_curriculum.sql", "/learn/schema/lab/"])
    await expect(page.locator(`main a[href="${href}"]`).first()).toBeVisible();
  for (const id of ["setup-counts", "pg-session", "pg-smoke", "pg-role-smoke", "pg-tx-smoke", "pbi-smoke"]) await expect(page.locator(`#q-${id}`)).toHaveCount(1);
});
