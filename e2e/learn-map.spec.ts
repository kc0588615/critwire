// Learn's map, track pages, progress and navigation (plan D11 nav, D12, D13 learn-map; 004 §7.1, §7.4). Expectations
// come from site/learn/curriculum.json, not from the page code: the map and each track list its modules in order, with
// tools, hours and prerequisites, built modules linked and planned ones unlinked "in preparation"; a done tick survives
// a reload and Clear progress removes it; every /learn/ page returns 200 with one <h1>, no broken internal link and an
// alt on every SVG picture (whose SVG has a <title>); the map links setup, the schemas, the data and the playground;
// nav.ts swaps <main> without a full load, and falls back to one when the swap fails.
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { hoursText, moduleUrl, TOOL_NAMES } from "../scripts/build/learn/module-html.ts";
import { CURRICULUM_FILE, type Curriculum, type Module } from "../scripts/learn/course.ts";
import { learnContext, ORIGIN, repoPath } from "./helpers.ts";

const MAP = "/learn/";
const SCHEMA_PAGES = ["/learn/schema/", "/learn/schema/lab/", "/learn/schema/star/"];
const KEY = "critwire.learn.done.v1";
const curriculum = async (): Promise<Curriculum> => JSON.parse(await readFile(repoPath(CURRICULUM_FILE), "utf8"));
// Curriculum text as the page shows it: `code` spans lose their backticks.
const shown = (s: string) => s.replaceAll("`", "");
const h1 = (page: Page) => page.getByRole("heading", { level: 1 });

// One module's entry on the map or a track page: its link if built, else "in preparation" and no link.
async function expectModule(page: Page, m: Module, prereqs: readonly Module[]): Promise<void> {
  const li = page.locator(`li[data-module="${m.id}"]`);
  const title = li.locator(".module-title");
  await expect(title).toContainText(m.id);
  await expect(li.locator(".badges li")).toHaveText([...m.tools.map((t) => TOOL_NAMES[t]), hoursText(m.hours)]);
  if (m.state === "built") {
    await expect(title.locator(`a[href="${moduleUrl(m)}"]`)).toHaveText(m.title);
    await expect(title).not.toContainText("in preparation");
  } else {
    await expect(li.locator(`a[href="${moduleUrl(m)}"]`)).toHaveCount(0);
    await expect(title).toContainText(m.title);
    await expect(title).toContainText("in preparation");
  }
  for (const p of prereqs) await expect(li.locator(".prereqs")).toContainText(p.id);
  if (!prereqs.length) await expect(li.locator(".prereqs")).toHaveCount(0);
}

test("the map follows curriculum.json: tracks and modules in order, hours, tools, prerequisites, planned unlinked", async ({ page }) => {
  const c = await curriculum();
  const byId = new Map(c.modules.map((m) => [m.id, m]));
  expect((await page.goto(MAP))?.status()).toBe(200);
  await expect(h1(page)).toHaveText("critwire Learn");
  expect(await page.locator("section.track").evaluateAll((s) => s.map((e) => e.id))).toEqual(c.tracks.map((t) => t.id));
  expect(await page.locator("li[data-module]").evaluateAll((l) => l.map((e) => (e as HTMLElement).dataset.module))).toEqual(c.modules.map((m) => m.id));
  for (const t of c.tracks) {
    const section = page.locator(`section.track#${t.id}`);
    const modules = c.modules.filter((m) => m.track === t.id);
    await expect(section.locator("h2 a")).toHaveAttribute("href", `/learn/${t.id}/`);
    await expect(section.locator("h2")).toContainText(t.title);
    await expect(section.locator(".track-hours")).toHaveText(`${modules.length} ${modules.length === 1 ? "module" : "modules"}, ${hoursText(modules.reduce((s, m) => s + m.hours, 0))}`);
  }
  for (const m of c.modules) await expectModule(page, m, m.prereqs.map((id) => byId.get(id)!));
  for (const href of ["/", "/#files", "/learn/data/", "/learn/playground/", "/learn/setup/", ...SCHEMA_PAGES])
    await expect(page.locator(`main a[href="${href}"]`).first()).toBeVisible();
});

test("each track page lists its modules in order with their skills and questions", async ({ page }) => {
  const c = await curriculum();
  const byId = new Map(c.modules.map((m) => [m.id, m]));
  for (const t of c.tracks) {
    const modules = c.modules.filter((m) => m.track === t.id);
    expect((await page.goto(`/learn/${t.id}/`))?.status(), t.id).toBe(200);
    await expect(h1(page)).toHaveText(t.title);
    expect(await page.locator("li[data-module]").evaluateAll((l) => l.map((e) => (e as HTMLElement).dataset.module))).toEqual(modules.map((m) => m.id));
    for (const m of modules) {
      await expectModule(page, m, m.prereqs.map((id) => byId.get(id)!));
      const li = page.locator(`li[data-module="${m.id}"]`);
      await expect(li.locator(".skill")).toContainText(shown(m.skill));
      expect(await li.locator(".questions li").allTextContents()).toEqual(m.questions.map(shown));
    }
    await expect(page.locator(`main a[href="${MAP}"]`).first()).toBeVisible();
  }
});

// L3 and L4: these tracks are built in full, so a module set back to planned fails here, not only on its own page.
const BUILT_TRACKS: [title: string, track: string, ids: string[]][] = [
  ["GIS in SQL", "gis-in-sql", ["g1", "g2", "g3", "g4", "g5", "g6", "g7"]],
  ["Spatial statistics", "spatial-statistics", ["s1", "s2", "s3", "s4", "s5", "s6"]],
  ["ETL", "etl", ["e1", "e2", "e3", "e4", "e5"]],
];
for (const [title, track, ids] of BUILT_TRACKS) {
  test(`${title}: ${ids[0]}–${ids.at(-1)} built, each linked from the map and its track page and returning 200`, async ({ page, request }) => {
    const ms = (await curriculum()).modules.filter((m) => m.track === track);
    expect(ms.map((m) => [m.id, m.state])).toEqual(ids.map((id) => [id, "built"]));
    for (const path of [MAP, `/learn/${track}/`]) {
      await page.goto(path);
      for (const m of ms) await expect(page.locator(`li[data-module="${m.id}"] .module-title a[href="${moduleUrl(m)}"]`), `${path} ${m.id}`).toHaveText(m.title);
    }
    for (const m of ms) expect((await request.get(moduleUrl(m))).status(), m.id).toBe(200);
  });
}

test("a done tick survives a reload, shows on the map and its track, and Clear progress removes it", async ({ page }) => {
  const c = await curriculum();
  const m = c.modules.find((x) => x.state === "built")!;
  const tick = (p: Page) => p.locator(`li[data-module="${m.id}"] .done`);
  await page.goto(moduleUrl(m));
  await page.getByRole("button", { name: "Mark done" }).click();
  await expect(page.locator(".mark-done")).toHaveAttribute("aria-pressed", "true");

  await page.goto(MAP);
  await expect(tick(page)).toBeVisible();
  await expect(page.locator("li[data-module] .done:visible")).toHaveCount(1);
  await page.reload();
  await expect(tick(page)).toBeVisible();
  await page.goto(`/learn/${m.track}/`);
  await expect(tick(page)).toBeVisible();

  await page.goto(MAP);
  await page.getByRole("button", { name: "Clear progress" }).click();
  await expect(tick(page)).toBeHidden();
  expect(await page.evaluate((k) => localStorage.getItem(k), KEY)).toBeNull();
  await page.reload();
  await expect(tick(page)).toBeHidden();
  await page.goto(moduleUrl(m));
  await expect(page.locator(".mark-done")).toHaveAttribute("aria-pressed", "false");
});

test("every /learn/ page returns 200, has one <h1> and no broken internal link", async ({ page, request }) => {
  const pages = [MAP];
  const seen = new Set(pages);
  const checked = new Map<string, number>();
  for (let i = 0; i < pages.length; i++) {
    const path = pages[i]!;
    expect((await page.goto(path))?.status(), path).toBe(200);
    expect(await page.locator("h1").count(), path).toBe(1);
    // Every SVG picture has an alt, and the SVG a <title>.
    for (const img of await page.locator("img[src$='.svg']").evaluateAll((is) => is.map((i) => ({ src: (i as HTMLImageElement).src, alt: i.getAttribute("alt") })))) {
      expect(img.alt, `${path}: ${img.src} alt`).toBeTruthy();
      expect(await (await request.get(img.src)).text(), `${path}: ${img.src}`).toMatch(/<title[ >]/);
    }
    const hrefs = await page.locator("a[href]").evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
    for (const href of new Set(hrefs)) {
      const url = new URL(href);
      if (url.origin !== ORIGIN) continue;
      if (url.hash && url.pathname === path) expect(await page.locator(`[id="${url.hash.slice(1)}"]`).count(), `${path} → ${href}`).toBe(1);
      if (!checked.has(url.pathname)) checked.set(url.pathname, (await request.get(url.pathname)).status());
      expect(checked.get(url.pathname), `${path} → ${url.pathname}`).toBe(200);
      if (/^\/learn\/(?!assets\/)([a-z0-9-]+\/)*$/.test(url.pathname) && !seen.has(url.pathname)) {
        seen.add(url.pathname);
        pages.push(url.pathname);
      }
    }
  }
  const c = await curriculum();
  const want = [MAP, "/learn/playground/", "/learn/data/", "/learn/setup/", ...SCHEMA_PAGES, ...c.tracks.map((t) => `/learn/${t.id}/`), ...c.modules.filter((m) => m.state === "built").map(moduleUrl)];
  expect(want.filter((p) => !seen.has(p))).toEqual([]);
});

test("nav swaps <main>, keeps the page, focuses the <h1>, works with Back, and falls back to a full load", async ({ browser }) => {
  const c = await curriculum();
  const { context, offOrigin } = await learnContext(browser);
  const page = await context.newPage();
  await page.goto(MAP);
  await page.evaluate(() => ((window as unknown as { stayed: boolean }).stayed = true));
  const stayed = () => page.evaluate(() => (window as unknown as { stayed?: boolean }).stayed === true);

  const first = c.tracks[0]!;
  await page.locator(`section.track#${first.id} h2 a`).click();
  await expect(page).toHaveURL(`${ORIGIN}/learn/${first.id}/`);
  await expect(h1(page)).toHaveText(first.title);
  await expect(h1(page)).toBeFocused();
  await expect(page).toHaveTitle(`${first.title} · critwire Learn`);
  await expect(page.locator("#nav-status")).toHaveText(`${first.title} · critwire Learn`);
  expect(await stayed()).toBe(true);

  // A module page's script runs after the swap: its Mark done works.
  const m = c.modules.find((x) => x.state === "built")!;
  await page.goto(MAP);
  await page.evaluate(() => ((window as unknown as { stayed: boolean }).stayed = true));
  await page.locator(`li[data-module="${m.id}"] .module-title a`).click();
  await expect(h1(page)).toContainText(m.title);
  await expect(page.locator("body")).toHaveAttribute("data-page", "module");
  await page.getByRole("button", { name: "Mark done" }).click();
  await expect(page.locator(".mark-done")).toHaveAttribute("aria-pressed", "true");
  await page.goBack();
  await expect(page).toHaveURL(`${ORIGIN}${MAP}`);
  await expect(h1(page)).toHaveText("critwire Learn");
  await expect(page.locator(`li[data-module="${m.id}"] .done`)).toBeVisible();
  expect(await stayed()).toBe(true);

  // The swap's fetch fails: the link loads the page in full.
  const second = c.tracks[1]!;
  await context.route(`${ORIGIN}/learn/${second.id}/`, (route) =>
    route.request().resourceType() === "fetch" ? route.abort("failed") : route.continue());
  await page.locator(`section.track#${second.id} h2 a`).click();
  await expect(page).toHaveURL(`${ORIGIN}/learn/${second.id}/`);
  await expect(h1(page)).toHaveText(second.title);
  await expect.poll(stayed).toBe(false);
  expect(offOrigin).toEqual([]);
  await context.close();
});
