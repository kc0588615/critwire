// Learn's walk (QA plan §1): every /learn/ page and the two schema dialogs as a learner leaves them, every block run,
// every exercise filled and checked, every <details> open, at 1280 and 375 px in light and dark: nothing scrolls sideways,
// axe finds no violation, nothing leaves the origin, no page error. Results aren't re-asserted (learn-browser.spec.ts).
// Each test's { page, views, blocks, incomplete } annotation lands in results.json; plans/006-learn-qa.md's tables come
// from there. Then the keyboard: axe says a region can take focus, not that the keys scroll it.
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import axe from "axe-core";
import { readFileSync } from "node:fs";
import { CURRICULUM_FILE, type Curriculum, type Module } from "../scripts/learn/course.ts";
import { moduleUrl } from "../scripts/build/learn/module-html.ts";
import { learnContext, learnPageUrls, repoPath, runBlock, runPlayground, SCHEMES, waitReady, WIDTHS } from "./helpers.ts";

// playwright.config.ts's trace is what makes a full run's artifacts large; 196 views don't need one.
test.use({ trace: "off", screenshot: "only-on-failure" });

const curriculum: Curriculum = JSON.parse(readFileSync(repoPath(CURRICULUM_FILE), "utf8"));
const moduleById = (id: string): Module => curriculum.modules.find((m) => m.id === id)!;
// A page can boot the engine, run its blocks and make 4 axe passes on a busy server.
const PAGE_MS = 60_000;
const VIEW_HEIGHT = 900;

async function runEveryBlock(page: Page): Promise<number> {
  const editors = await page.locator(".block.editor").all();
  for (const block of editors) await runBlock(block);
  const exercises = await page.locator(".block.exercise").all();
  for (const block of exercises) {
    await block.locator("textarea").fill((await block.locator("details code").textContent())!);
    await runBlock(block);
  }
  return editors.length + exercises.length;
}

// The checks of one page as it now stands, in every width and scheme. The soft expects report every view that fails.
async function checkViews(page: Page, info: TestInfo, name: string, blocks: number): Promise<void> {
  await page.evaluate(axe.source);
  let views = 0;
  let incomplete = 0;
  for (const width of WIDTHS) {
    await page.setViewportSize({ width, height: VIEW_HEIGHT });
    for (const colorScheme of SCHEMES) {
      await page.emulateMedia({ colorScheme });
      const view = `${name} ${width} ${colorScheme}`;
      expect.soft(await page.evaluate(() => document.documentElement.scrollWidth), `${view}: scrollWidth`).toBeLessThanOrEqual(width);
      const r = await page.evaluate(() => (window as unknown as { axe: typeof axe }).axe.run());
      expect.soft(r.violations.map((v) => `${v.id}: ${v.nodes.length} (${v.nodes[0]!.target.join(" ")})`), `${view}: axe`).toEqual([]);
      incomplete += r.incomplete.reduce((sum, v) => sum + v.nodes.length, 0);
      views++;
    }
  }
  info.annotations.push({ type: "walk", description: JSON.stringify({ page: name, views, blocks, incomplete }) });
}

// One walk: load, what `act` does, then every view; nothing off-origin, no page error.
function walk(title: string, url: string, act: (page: Page) => Promise<number>): void {
  test(title, async ({ browser }, info) => {
    test.setTimeout(PAGE_MS);
    const { context, offOrigin } = await learnContext(browser);
    const page = await context.newPage();
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(url);
    if (await page.locator("textarea").count()) await waitReady(page);
    const blocks = await act(page);
    await checkViews(page, info, title.replace(/^walk /, ""), blocks);
    expect(offOrigin).toEqual([]);
    expect(errors).toEqual([]);
    await context.close();
  });
}

for (const url of learnPageUrls(curriculum)) {
  walk(`walk ${url}`, url, async (page) => {
    const blocks = await runEveryBlock(page);
    // A wide result: the playground's table has to scroll inside its region, not the page.
    if (url === "/learn/playground/") await runPlayground(page, "SELECT * FROM species LIMIT 5");
    await page.locator("details").evaluateAll((ds) => ds.forEach((d) => ((d as HTMLDetailsElement).open = true)));
    return blocks;
  });
}

for (const [name, dialog, id] of [["Schema", "#dialog-schema", "f1"], ["Lab schema", "#dialog-lab", "d3"]] as const) {
  walk(`walk ${name} dialog on ${id}`, moduleUrl(moduleById(id)), async (page) => {
    await page.getByRole("button", { name, exact: true }).first().click();
    await expect(page.locator(dialog)).toBeVisible();
    return 0;
  });
}

test("the keyboard reaches a code block and a result table on d1, the ring shows and the arrow keys scroll them", async ({ browser }) => {
  test.setTimeout(PAGE_MS);
  const { context, offOrigin } = await learnContext(browser);
  const page = await context.newPage();
  await page.goto(moduleUrl(moduleById("d1")));
  await page.setViewportSize({ width: 375, height: VIEW_HEIGHT });
  await page.emulateMedia({ colorScheme: "dark" });
  await waitReady(page);
  await runEveryBlock(page);
  for (const selector of ["pre.code", ".result .table-wrap"]) {
    // :visible matters: a closed <details> holds overflowing code that can't take focus.
    const all = page.locator(selector);
    const first = await all.evaluateAll((es) => es.findIndex((e) => e.checkVisibility() && e.scrollWidth > e.clientWidth));
    expect(first, `${selector}: one overflows`).toBeGreaterThanOrEqual(0);
    const region = all.nth(first);
    // Chromium focuses a scroller by itself; other browsers need the attribute.
    await expect(region, `${selector}: tabindex`).toHaveAttribute("tabindex", "0");
    const focused = () => region.evaluate((e) => e === document.activeElement);
    await page.locator("a").first().focus();
    for (let tabs = 0; tabs < 200 && !(await focused()); tabs++) await page.keyboard.press("Tab");
    expect(await focused(), `${selector}: Tab reaches it`).toBe(true);
    expect(await region.evaluate((e) => e.matches(":focus-visible")), `${selector}: :focus-visible`).toBe(true);
    expect(await region.evaluate((e) => getComputedStyle(e).outlineStyle), `${selector}: ring`).not.toBe("none");
    await page.keyboard.press("ArrowRight");
    await expect.poll(() => region.evaluate((e) => e.scrollLeft), `${selector}: ArrowRight scrolls`).toBeGreaterThan(0);
  }
  expect(offOrigin).toEqual([]);
  await context.close();
});
