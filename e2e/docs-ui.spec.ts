// The docs page's UI (plan 2026-11-25-critwire-web-modernize §7): the page without JavaScript, motion, layout (with the
// chip row's gated fade), axe and the font. Every test opens the page through learnContext (each off-origin request aborted and recorded) and ends with no page error
// and no off-origin request. Screenshots: ARTIFACTS/docs-ui-*.png, attached to the report.
import { expect, test, type Browser, type BrowserContextOptions, type Page, type TestInfo } from "@playwright/test";
import axe from "axe-core";
import { readdir, readFile } from "node:fs/promises";
import { ARTIFACTS, DOCS_SECTIONS, distPath, docsAttribution, learnContext, repoPath, SCHEMES, WIDTHS } from "./helpers.ts";

const FONT_PATH = "/fonts/atkinson-hyperlegible-next.woff2";
const LICENSE_PATH = "/fonts/OFL.txt";

// The docs page at `path` in a fresh learnContext; `close` asserts no page error and no off-origin request.
async function openDocs(browser: Browser, options: BrowserContextOptions, path = "/") {
  const { context, offOrigin } = await learnContext(browser, options);
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const close = async () => {
    expect(errors, "page errors").toEqual([]);
    expect(offOrigin, "off-origin requests").toEqual([]);
    await context.close();
  };
  return { page, close, load: async () => expect((await page.goto(path))?.status()).toBe(200) };
}

async function shot(page: Page, info: TestInfo, name: string, fullPage = true): Promise<void> {
  const path = `${ARTIFACTS}/docs-ui-${name}.png`;
  await page.screenshot({ path, fullPage });
  await info.attach(`docs-ui-${name}`, { path, contentType: "image/png" });
}

test("1. without JavaScript, every section, file link and credit is there", async ({ browser }, info) => {
  const { page, close, load } = await openDocs(browser, { javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  await load();

  expect(await page.locator("nav.toc a").evaluateAll((as) => as.map((a) => a.getAttribute("href")))).toEqual(DOCS_SECTIONS.map((id) => `#${id}`));
  for (const id of DOCS_SECTIONS) await expect(page.locator(`section#${id} h2`)).toBeVisible();

  const v1 = (await readdir(distPath("v1"), { withFileTypes: true })).filter((e) => e.isFile()).map((e) => `/v1/${e.name}`);
  expect(v1.length).toBeGreaterThan(0);
  for (const href of [...v1, "/v1/species/51.json", "/v1/species/jaguar.json"]) await expect(page.locator(`#files a[href="${href}"]`), href).toBeVisible();

  const attribution = await docsAttribution();
  expect(await page.locator("#credits dt").allTextContents()).toEqual(attribution.sources.map((s) => s.source));
  const list = (summary: string) => page.locator("#credits details", { has: page.locator("summary", { hasText: summary }) }).locator("li");
  await expect(list("checklists shared through GBIF")).toHaveCount(attribution.gbifChecklists.length);
  await expect(list("photos from Wikimedia Commons")).toHaveCount(attribution.photos.length);

  await expect(page.locator("button")).toHaveCount(0);
  await expect(page.locator(`footer a[href="${LICENSE_PATH}"]`)).toBeVisible();
  await expect(page.locator(`#credits a[href="${LICENSE_PATH}"]`)).toHaveCount(0);
  expect(await page.locator(`a[href="${LICENSE_PATH}"]`).evaluate((a) => a.closest("section") === null)).toBe(true);

  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
  await shot(page, info, "nojs-375");
  await close();
});

test("6. smooth anchor scrolling only without a reduced-motion preference", async ({ browser }) => {
  for (const [reducedMotion, expected] of [["no-preference", "smooth"], ["reduce", "auto"]] as const) {
    const { page, close, load } = await openDocs(browser, { reducedMotion });
    await load();
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), reducedMotion).toBe(expected);
    await close();
  }
});

// The chip row's and the index's boxes, read in the page.
const layout = (page: Page) =>
  page.evaluate(() => {
    const box = (e: Element) => e.getBoundingClientRect();
    const nav = document.querySelector("nav.toc")!;
    const row = nav.querySelector("ul")!;
    const chips = [...row.querySelectorAll("a")].map(box);
    return {
      scrollWidth: document.documentElement.scrollWidth,
      navTop: box(nav).top,
      navRight: box(nav).right,
      mainLeft: box(document.querySelector("main")!).left,
      rowRight: box(row).right,
      rowOverflows: row.scrollWidth > row.clientWidth,
      rowScrollLeft: row.scrollLeft,
      chipTops: new Set(chips.map((c) => Math.round(c.top))).size,
      cut: chips.filter((c) => c.left < box(row).right && c.right > box(row).right).length,
    };
  });

// The row's fade bands (--fade-start, --fade-end), as computed, after scrolling the row to `left`.
const fades = (page: Page, left: number) =>
  page.evaluate((left) => {
    const row = document.querySelector("nav.toc ul")!;
    row.scrollTo({ left, behavior: "instant" });
    const style = getComputedStyle(row);
    return [style.getPropertyValue("--fade-start"), style.getPropertyValue("--fade-end")];
  }, left);

// Every style rule that masks the row, gives it a scroll timeline or a scroll-padding-inline, and whether each sits
// inside an @supports naming both animation-timeline and animation-range (D7: the fade's gate).
const fadeGate = (page: Page) =>
  page.evaluate(() => {
    const row = document.querySelector("nav.toc ul")!;
    const props = ["mask-image", "animation-timeline", "scroll-padding-inline-start", "scroll-padding-inline-end"];
    const gated = (rule: CSSRule) => {
      for (let r = rule.parentRule; r; r = r.parentRule) {
        if (r instanceof CSSSupportsRule && r.conditionText.includes("animation-timeline") && r.conditionText.includes("animation-range")) return true;
      }
      return false;
    };
    const found: { selector: string; gated: boolean }[] = [];
    const walk = (rules: CSSRuleList) => {
      for (const rule of rules) {
        if (rule instanceof CSSStyleRule && row.matches(rule.selectorText) && props.some((p) => rule.style.getPropertyValue(p) !== "")) {
          found.push({ selector: rule.selectorText, gated: gated(rule) });
        }
        if ("cssRules" in rule) walk((rule as CSSGroupingRule).cssRules);
      }
    };
    for (const sheet of document.styleSheets) walk(sheet.cssRules);
    return found;
  });

for (const width of WIDTHS) {
  test(`8. layout at ${width} px, light and dark`, async ({ browser }, info) => {
    const { page, close, load } = await openDocs(browser, { viewport: { width, height: 800 }, reducedMotion: "reduce" });
    await load();
    const gate = await fadeGate(page);
    expect(gate.length, "rules that fade the row").toBeGreaterThan(0);
    expect(gate.filter((r) => !r.gated), "fade rules outside the gate").toEqual([]);
    for (const colorScheme of SCHEMES) {
      await page.emulateMedia({ colorScheme });
      await page.evaluate(() => window.scrollTo(0, 0));
      const top = await layout(page);
      expect.soft(top.scrollWidth, `${colorScheme}: scrollWidth`).toBeLessThanOrEqual(width);
      if (width < 960) {
        // The chip row: one row, overflowing, a chip cut at its inline end at scrollLeft 0 (the cue without a fade).
        expect.soft(top.chipTops, `${colorScheme}: one row of chips`).toBe(1);
        expect.soft(top.rowOverflows, `${colorScheme}: the row overflows`).toBe(true);
        expect.soft(top.rowScrollLeft).toBe(0);
        expect.soft(top.cut, `${colorScheme}: a chip crosses the row's end`).toBe(1);
        // The fade (Chromium has scroll timelines): none at the start at rest, one at the end; swapped at the far end.
        await expect.poll(() => fades(page, 0), `${colorScheme}: fades at scrollLeft 0`).toEqual(["0px", "48px"]);
        await expect.poll(() => fades(page, 1e5), `${colorScheme}: fades at the row's end`).toEqual(["48px", "0px"]);
        await fades(page, 0);
        await page.evaluate(() => window.scrollTo(0, 6000));
        const scrolled = await layout(page);
        expect.soft(scrolled.navTop, `${colorScheme}: the row sticks at the top`).toBe(0);
        expect.soft(scrolled.chipTops, `${colorScheme}: still one row`).toBe(1);
      } else {
        expect.soft(top.navRight, `${colorScheme}: the index sits left of main`).toBeLessThanOrEqual(top.mainLeft);
        await page.evaluate(() => window.scrollTo(0, 6000));
        expect.soft((await layout(page)).navTop, `${colorScheme}: the index sticks`).toBeGreaterThanOrEqual(0);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await shot(page, info, `layout-${width}-${colorScheme}`);
    }
    await close();
  });
}

test("9. axe: no violation at 1280 and 375 px, light and dark, with a section current and every details open", async ({ browser }) => {
  const { page, close, load } = await openDocs(browser, { viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  await load();
  await page.evaluate(axe.source);
  await page.locator("details").evaluateAll((ds) => ds.forEach((d) => ((d as HTMLDetailsElement).open = true)));
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: 800 });
    await page.locator('nav.toc a[href="#files"]').click();
    await expect(page.locator("nav.toc a:target-current")).toHaveAttribute("href", "#files");
    for (const colorScheme of SCHEMES) {
      await page.emulateMedia({ colorScheme });
      const r = await page.evaluate(() => (window as unknown as { axe: typeof axe }).axe.run());
      expect.soft(r.violations.map((v) => `${v.id}: ${v.nodes.length} (${v.nodes[0]!.target.join(" ")})`), `${width} ${colorScheme}: axe`).toEqual([]);
    }
  }
  await close();
});

test("10. the font: fetched once, in use, and its license served beside it", async ({ browser, request }, info) => {
  const { page, close, load } = await openDocs(browser, { viewport: { width: 1280, height: 800 } });
  const fonts: { status: number; type: string | undefined }[] = [];
  page.on("response", (r) => {
    if (new URL(r.url()).pathname === FONT_PATH) fonts.push({ status: r.status(), type: r.headers()["content-type"] });
  });
  await load();
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return {
      check: document.fonts.check('1em "Atkinson Hyperlegible Next"'),
      faces: [...document.fonts].filter((f) => f.family.replaceAll('"', "") === "Atkinson Hyperlegible Next").map((f) => f.status),
    };
  });
  expect(loaded).toEqual({ check: true, faces: ["loaded"] });
  expect(fonts).toEqual([{ status: 200, type: "font/woff2" }]);

  const license = await request.get(LICENSE_PATH);
  expect(license.status()).toBe(200);
  expect(license.headers()["content-type"]).toMatch(/^text\/plain\b/);
  expect((await license.body()).equals(await readFile(repoPath("site/fonts/OFL.txt")))).toBe(true);

  await shot(page, info, "font-1280", false);
  await close();
});
