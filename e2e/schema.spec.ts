// The ERDs' pages and checks (plan D10, D13 schema; S15; 004 §6): schema.mmd against the browser's own catalog, read
// through the playground (META_SQL); /learn/schema/, /learn/schema/lab/ and /learn/schema/star/, each with its SVG
// (alt = the SVG's <title>, also linked alone), its relationships in words, its data dictionary (dictionaries(), from
// the .mmd and the build's source map), planned tables marked and the lab-made list; and the Schema and Lab schema
// dialogs, by keyboard alone. Expectations come from site/learn/erd/*.mmd, not from the page code. The teaching
// diagrams (D14, S25): each on its page, light and dark, its <img alt> the SVG's <title>.
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { dictionaries, type DrawnErd } from "../scripts/build/learn/erd.ts";
import { dbMeta, erdDrift, ERD_DIR, markers, META_SQL, parseErd } from "../scripts/learn/erd-model.ts";
import type { Result } from "../scripts/learn/result.ts";
import { hookResult, learnContext, repoPath, runPlayground, waitReady } from "./helpers.ts";

const mmd = (name: string) => readFile(repoPath(`${ERD_DIR}/${name}.mmd`), "utf8");
const PAGES: { name: DrawnErd; url: string }[] = [
  { name: "schema", url: "/learn/schema/" },
  { name: "lab", url: "/learn/schema/lab/" },
  { name: "star", url: "/learn/schema/star/" },
];
// Text as the page shows it: `code` spans lose their backticks.
const shown = (s: string) => s.replaceAll("`", "");

// A catalog query's hook result as the Result dbMeta reads: NULL back to null, a list cell ("[a, b]") back to a list.
function catalogResult(r: Awaited<ReturnType<typeof hookResult>>): Result {
  if (!r || "error" in r) throw new Error(`catalog query failed: ${JSON.stringify(r)}`);
  const value = (c: string) => (c === "NULL" ? null : /^\[.*\]$/.test(c) ? (c === "[]" ? [] : c.slice(1, -1).split(", ")) : c);
  return { columns: r.columns, rows: r.rows.map((row) => row.map(value)) } as Result;
}

test("schema.mmd matches the browser's catalog, read through the playground", async ({ browser }) => {
  const { context, offOrigin } = await learnContext(browser);
  const page = await context.newPage();
  await page.goto("/learn/playground/");
  await waitReady(page);
  const results: Result[] = [];
  for (const sql of META_SQL) {
    await runPlayground(page, sql);
    results.push(catalogResult(await hookResult(page, "playground")));
  }
  const db = dbMeta(results);
  expect(erdDrift(parseErd(await mmd("schema")), db)).toEqual([]);
  expect(db.views).toEqual(["species_taxonomy"]);
  await expect(page.locator("body")).not.toHaveAttribute("data-changed", "true");
  expect(offOrigin).toEqual([]);
  await context.close();
});

// The dictionary sections of a schema page: table, planned flag, rows of cell text.
const sections = (page: Page) => page.locator("section.dictionary").evaluateAll((ss) => ss.map((s) => ({
  table: (s as HTMLElement).dataset.table!,
  planned: (s as HTMLElement).dataset.planned !== undefined,
  rows: [...s.querySelectorAll("tbody tr")].map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent!)),
})));

test("each schema page: its SVG (alt = <title>, linked alone), relationships in words, dictionary, planned and lab-made lists", async ({ page, request }) => {
  const schema = await mmd("schema");
  for (const { name, url } of PAGES) {
    const text = await mmd(name);
    const erd = parseErd(text);
    const { labMade, planned } = markers(text);
    expect((await page.goto(url))?.status(), url).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);

    const svg = `/learn/schema/${name}.svg`;
    await expect(page.locator(`figure.erd img[src="${svg}"]`)).toHaveAttribute("alt", erd.title!);
    await expect(page.locator(`figure.erd a[href="${svg}"]`)).toBeVisible();
    const res = await request.get(svg);
    expect(res.status(), svg).toBe(200);
    expect(await res.text(), svg).toContain(`<title`);

    const lines = page.locator("ul.relationships li");
    await expect(lines).toHaveCount(erd.relationships.length);
    for (const [i, r] of erd.relationships.entries()) {
      await expect(lines.nth(i)).toContainText(r.one);
      await expect(lines.nth(i)).toContainText(r.many);
      await expect(lines.nth(i)).toContainText(r.label);
    }

    const want = dictionaries(text, name === "lab" ? { except: schema } : {});
    expect(await sections(page), url).toEqual(want.map((d) => ({
      table: d.table,
      planned: planned.includes(d.table),
      rows: d.rows.map((r) => [r.column, r.type, r.key, r.meaning, shown(r.source)]),
    })));
    for (const t of planned) await expect(page.locator(`section.dictionary[data-table="${t}"] h3`)).toContainText("planned");
    expect(await page.locator("ul.planned-tables li code").allTextContents()).toEqual(planned);
    expect(await page.locator("ul.lab-made li code").allTextContents()).toEqual(labMade);
    if (name !== "star") await expect(page.locator("#species_taxonomy")).toContainText("species_taxonomy");
  }
  // The lab page names the tables it shares with schema v2, linked to their entries there.
  await page.goto("/learn/schema/lab/");
  const lab = dictionaries(await mmd("lab")).map((d) => d.table);
  const own = dictionaries(await mmd("lab"), { except: schema }).map((d) => d.table);
  for (const t of lab.filter((x) => !own.includes(x))) await expect(page.locator(`a[href="/learn/schema/#t-${t}"]`)).toBeVisible();
  // L3: the habitat tables are in the lab, so drawn and described with no planned badge, and the page lists none planned.
  for (const t of ["occurrence_habitats", "habitat_clips"]) {
    await expect(page.locator(`section.dictionary[data-table="${t}"]`), t).toHaveCount(1);
    await expect(page.locator(`section.dictionary[data-table="${t}"] .planned`), t).toHaveCount(0);
  }
  // H5: the clips are stored as tiles, keyed (clip, tile).
  await expect(page.locator(`section.dictionary[data-table="habitat_clips"] tbody tr td:first-child`)).toHaveText(["clip", "tile", "rast"]);
  await expect(page.locator("ul.planned-tables")).toHaveCount(0);
  // The star page links each published file.
  await page.goto("/learn/schema/star/");
  const { planned } = markers(await mmd("star"));
  for (const d of dictionaries(await mmd("star"))) {
    const file = page.locator(`section.dictionary[data-table="${d.table}"] a[href="/learn/data/star/${d.table}.csv"]`);
    await expect(file).toHaveCount(planned.includes(d.table) ? 0 : 1);
  }
});

test("the Schema and Lab schema dialogs open and close by keyboard alone and return focus", async ({ page }) => {
  await page.goto("/learn/setup/");
  for (const [name, dialog, svg] of [["Schema", "#dialog-schema", "schema"], ["Lab schema", "#dialog-lab", "lab"]] as const) {
    const button = page.getByRole("button", { name, exact: true }).first();
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(dialog)).toBeVisible();
    await expect(page.locator(`${dialog} img`)).toHaveAttribute("src", `/learn/schema/${svg}.svg`);
    await expect(page.locator(`${dialog} a[href="${svg === "lab" ? "/learn/schema/lab/" : "/learn/schema/"}"]`)).toBeVisible();
    expect(await page.evaluate((d) => document.querySelector(d)!.contains(document.activeElement), dialog)).toBe(true);
    await page.keyboard.press("Escape");
    await expect(page.locator(dialog)).toBeHidden();
    await expect(button).toBeFocused();
    // Close, by keyboard: Tab to it from inside, then Enter.
    await page.keyboard.press("Enter");
    await expect(page.locator(dialog)).toBeVisible();
    await page.locator(`${dialog} button`, { hasText: "Close" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(dialog)).toBeHidden();
    await expect(button).toBeFocused();
  }
});

// The teaching diagrams (plan D14) and the pages that show them; the alt text is read from the served SVG.
const DIAGRAMS = [
  { name: "critwire-pipeline", url: "/learn/setup/" },
  { name: "d3-scans", url: "/learn/database-architecture/indexes/" },
  { name: "d4-mvcc", url: "/learn/database-architecture/transactions/" },
  { name: "d6-drill-across", url: "/learn/database-architecture/star/" },
  { name: "g3-predicates", url: "/learn/gis-in-sql/spatial-join/" },
  { name: "g7-cells", url: "/learn/gis-in-sql/raster/" },
];
const svgTitle = (svg: string) => /<svg\b[^>]*>\s*<title\b[^>]*>([^<]+)<\/title>/.exec(svg)?.[1]?.trim();

test("each teaching diagram: light and dark SVGs served with a <title>, the page's <img alt> equal to it, dark in dark mode", async ({ page, request }) => {
  for (const { name, url } of DIAGRAMS) {
    const titles: string[] = [];
    for (const file of [`${name}.svg`, `${name}-dark.svg`]) {
      const res = await request.get(`/learn/diagrams/${file}`);
      expect(res.status(), file).toBe(200);
      expect(res.headers()["content-type"], file).toContain("image/svg+xml");
      const title = svgTitle(await res.text());
      expect(title, `${file} <title>`).toBeTruthy();
      titles.push(title!);
    }
    expect((await page.goto(url))?.status(), url).toBe(200);
    const img = page.locator(`figure#diagram-${name} img`);
    await expect(img).toHaveAttribute("src", `/learn/diagrams/${name}.svg`);
    await expect(img).toHaveAttribute("alt", titles[0]!);
    await expect(page.locator(`figure#diagram-${name} source[media="(prefers-color-scheme: dark)"]`)).toHaveAttribute("srcset", `/learn/diagrams/${name}-dark.svg`);
    await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
    await page.emulateMedia({ colorScheme: "dark" });
    await expect.poll(() => img.evaluate((i: HTMLImageElement) => i.currentSrc)).toMatch(new RegExp(`/learn/diagrams/${name}-dark\\.svg$`));
    await page.emulateMedia({ colorScheme: "light" });
  }
});
