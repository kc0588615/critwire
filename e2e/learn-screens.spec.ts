// Learn's screenshots (plan S26, D13 artifacts): the map, f3 (the browser tool, its first block run), d3 (PostGIS, its
// recorded results), g3 and g7 (GIS in SQL, with their diagrams; L3 S19), s4, s5 and e2 (Python labs and diagrams; L4
// S26), the lab schema and the setup page, each at
// 1280 and 375 px in light and dark:
// <page>-<width>-<scheme>.png in E2E_ARTIFACTS. Each page fits its width, and nothing leaves the origin.
import { expect, test, type Page } from "@playwright/test";
import { ARTIFACTS, coursePages, firstBrowserBlock, learnContext, rendered, runBlock, waitReady } from "./helpers.ts";

const WIDTHS = [1280, 375];
const SCHEMES = ["light", "dark"] as const;
const courseUrl = async (id: string) => (await coursePages()).find((c) => c.page.page.id === id)!.url;

// Each page, and what it does before its screenshots.
const PAGES: { name: string; url: () => Promise<string>; ready?: (page: Page) => Promise<void> }[] = [
  { name: "map", url: async () => "/learn/" },
  { name: "f3", url: async () => (await firstBrowserBlock("f3")).url, ready: async (page) => {
    const { id } = await firstBrowserBlock("f3");
    await runBlock(page.locator(`#q-${id}`));
    expect(await rendered(page, id)).toMatchSnapshot(`${id}.txt`);
  } },
  { name: "d3", url: () => courseUrl("d3") },
  { name: "g3", url: () => courseUrl("g3") },
  { name: "g7", url: () => courseUrl("g7") },
  { name: "s4", url: () => courseUrl("s4") },
  { name: "s5", url: () => courseUrl("s5") },
  { name: "e2", url: () => courseUrl("e2") },
  { name: "schema-lab", url: async () => "/learn/schema/lab/" },
  { name: "setup", url: async () => "/learn/setup/" },
];

for (const { name, url, ready } of PAGES) {
  test(`${name}: fits 1280 and 375 px, light and dark; screenshots`, async ({ browser }, info) => {
    const { context, offOrigin } = await learnContext(browser);
    const page = await context.newPage();
    await page.goto(await url());
    // A page with an editor starts the engine; its screenshots show it ready.
    if (await page.locator("textarea").count()) await waitReady(page);
    await ready?.(page);
    for (const width of WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      for (const colorScheme of SCHEMES) {
        await page.emulateMedia({ colorScheme });
        expect(await page.evaluate(() => document.documentElement.scrollWidth), `${width} ${colorScheme}`).toBeLessThanOrEqual(width);
        const file = `${name}-${width}-${colorScheme}`;
        const path = `${ARTIFACTS}/${file}.png`;
        await page.screenshot({ path, fullPage: true });
        await info.attach(file, { path, contentType: "image/png" });
      }
    }
    expect(offOrigin).toEqual([]);
    await context.close();
  });
}
