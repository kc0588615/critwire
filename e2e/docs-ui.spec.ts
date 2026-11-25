// The docs page's UI (plan 2026-11-25-critwire-web-modernize §7): the page without JavaScript, the copy buttons (and
// without a clipboard), focus, motion, layout (with the chip row's gated fade), axe and the font. Every test opens the page through learnContext (each off-origin request aborted and recorded) and ends with no page error
// and no off-origin request. Screenshots: ARTIFACTS/docs-ui-*.png, attached to the report.
import { expect, test, type Browser, type BrowserContextOptions, type Locator, type Page, type TestInfo } from "@playwright/test";
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

// The copy UI (docs.js): every sample's text, and what each button's own sample holds.
const examples = (page: Page) =>
  page.locator("pre > code").evaluateAll((codes) =>
    codes.map((code) => {
      const example = code.closest(".example");
      return {
        text: code.textContent,
        pres: example ? example.querySelectorAll("pre").length : 0,
        buttons: example ? [...example.querySelectorAll(".copy > button")].map((b) => ({ type: b.getAttribute("type"), inPre: b.closest("pre") !== null, name: b.textContent })) : [],
      };
    }),
  );

// Records each writeText call in window.__copies, then writes as the browser does (clipboard permissions granted).
const recordCopies = () => {
  const calls: string[] = [];
  (window as unknown as { __copies: string[] }).__copies = calls;
  const write = Clipboard.prototype.writeText;
  Clipboard.prototype.writeText = function (text: string) {
    calls.push(text);
    return write.call(this, text);
  };
};
const copies = (page: Page) => page.evaluate(() => [...(window as unknown as { __copies: string[] }).__copies]);
const statusText = (button: Locator) => button.evaluate((b) => b.nextElementSibling!.textContent);
const CLIPBOARD = ["clipboard-read", "clipboard-write"];

test("2. copy: one button per sample, outside its code, copying that code's text", async ({ browser }, info) => {
  const { page, close, load } = await openDocs(browser, { viewport: { width: 375, height: 812 }, permissions: CLIPBOARD, reducedMotion: "reduce" });
  await page.addInitScript(recordCopies);
  await load();

  const samples = await examples(page);
  expect(samples).toHaveLength(10);
  for (const s of samples) expect(s, s.text!.slice(0, 40)).toMatchObject({ pres: 1, buttons: [{ type: "button", inPre: false, name: "Copy" }] });
  const buttons = page.locator(".example > .copy > button");
  await expect(buttons).toHaveCount(10);
  await expect(page.locator('.copy > [role="status"]')).toHaveCount(10);
  for (const b of await buttons.all()) expect(await statusText(b)).toBe("");

  // The status: "Copied", empty again within 4 s, and a repeat differs by a no-break space (announced again).
  const first = buttons.first();
  await first.click();
  await expect.poll(() => statusText(first)).toBe("Copied");
  await expect(first).toHaveAttribute("data-copied", "");
  await shot(page, info, "copied-375", false);
  await expect.poll(() => statusText(first), { timeout: 4000 }).toBe("");
  await expect(first).not.toHaveAttribute("data-copied");
  await first.click();
  await expect.poll(() => statusText(first)).toBe("Copied ");
  expect(await copies(page)).toEqual([samples[0]!.text, samples[0]!.text]);

  // Each button copies its own sample, once per click.
  for (const b of await buttons.all()) await b.click();
  await expect.poll(() => copies(page)).toEqual([samples[0]!.text, samples[0]!.text, ...samples.map((s) => s.text)]);

  // The keyboard: Enter and Space on a focused button copy, through the same click path.
  const last = buttons.last();
  await last.focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Space");
  await expect.poll(async () => (await copies(page)).slice(-2)).toEqual([samples[9]!.text, samples[9]!.text]);
  expect(await copies(page)).toHaveLength(14);
  await close();
});

test("3. copy fails: the status says so, and the button stays enabled and focused", async ({ browser }) => {
  const { page, close, load } = await openDocs(browser, { viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
  await page.addInitScript(() => {
    Clipboard.prototype.writeText = () => Promise.reject(new DOMException("Write permission denied.", "NotAllowedError"));
  });
  await load();
  const button = page.locator(".example > .copy > button").nth(2);
  await button.focus();
  await page.keyboard.press("Enter");
  await expect.poll(() => statusText(button)).toBe("Copy failed");
  await expect(button).toHaveAttribute("data-failed", "");
  await expect(button).toBeEnabled();
  await expect(button).toBeFocused();
  await expect.poll(() => statusText(button), { timeout: 4000 }).toBe("");
  await close();
});

test("4. no clipboard: no copy buttons and no wrappers", async ({ browser }) => {
  const { page, close, load } = await openDocs(browser, { viewport: { width: 1280, height: 800 } });
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, "clipboard", { get: () => undefined, configurable: true }));
  await load();
  expect(await page.evaluate(() => navigator.clipboard)).toBeUndefined();
  await expect(page.locator("pre > code")).toHaveCount(10);
  await expect(page.locator("button")).toHaveCount(0);
  await expect(page.locator(".example, .copy")).toHaveCount(0);
  await close();
});

// The focused element and its ring, as computed.
const focused = (page: Page) =>
  page.evaluate(() => {
    const e = document.activeElement!;
    const s = getComputedStyle(e);
    return {
      tag: e.tagName.toLowerCase(),
      firstNav: e === document.querySelector("nav.toc a"),
      copy: e.matches(".copy > button"),
      overflowingPre: e.matches("pre") && e.scrollWidth > e.clientWidth,
      visible: e.matches(":focus-visible"),
      ring: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0,
    };
  });

// A viewport shot clipped to the focused element plus room for its ring.
async function focusShot(page: Page, info: TestInfo, name: string): Promise<void> {
  const r = await page.evaluate(() => {
    const b = document.activeElement!.getBoundingClientRect();
    return { x: b.x, y: b.y, width: b.width, height: b.height };
  });
  const pad = 12;
  const vp = page.viewportSize()!;
  const x = Math.max(0, r.x - pad);
  const y = Math.max(0, r.y - pad);
  const path = `${ARTIFACTS}/docs-ui-${name}.png`;
  await page.screenshot({ path, clip: { x, y, width: Math.min(vp.width - x, r.width + 2 * pad), height: Math.min(vp.height - y, r.height + 2 * pad) } });
  await info.attach(`docs-ui-${name}`, { path, contentType: "image/png" });
}

for (const width of WIDTHS) {
  test(`7. focus at ${width} px: Tab reaches the index, a copy button and a scrolling sample, each with a ring`, async ({ browser }, info) => {
    const { page, close, load } = await openDocs(browser, { viewport: { width, height: 800 }, permissions: CLIPBOARD, reducedMotion: "reduce" });
    await load();
    await expect(page.locator(".copy > button")).toHaveCount(10);

    await page.keyboard.press("Tab");
    const nav = await focused(page);
    expect(nav, "the first Tab").toMatchObject({ firstNav: true, visible: true, ring: true });
    await focusShot(page, info, `focus-nav-${width}`);

    const seen = { copy: false, pre: false };
    for (let i = 0; i < 300 && !(seen.copy && seen.pre); i++) {
      await page.keyboard.press("Tab");
      const f = await focused(page);
      const kind = f.copy ? "copy" : f.overflowingPre ? "pre" : null;
      if (!kind || seen[kind]) continue;
      seen[kind] = true;
      expect(f, `Tab to a ${kind}`).toMatchObject({ visible: true, ring: true });
      await focusShot(page, info, `focus-${kind}-${width}`);
      if (kind === "pre" && width < 960) {
        // The keyboard scrolls a focused sample sideways.
        const pre = page.locator("pre:focus");
        expect(await pre.evaluate((e) => e.scrollLeft)).toBe(0);
        await page.keyboard.press("ArrowRight");
        await expect.poll(() => pre.evaluate((e) => e.scrollLeft)).toBeGreaterThan(0);
      }
    }
    expect(seen, "Tab reached both").toEqual({ copy: true, pre: true });
    await close();
  });
}

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
