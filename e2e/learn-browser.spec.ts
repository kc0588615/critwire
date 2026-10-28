// Learn's browser engine (plan D11, D13 learn-browser; S11–S13, S15): boot, the origin fence, SC2's hash check, the
// row cap, Reset and Stop, on the playground; then the playground's refusals, the changed generation, its table list
// and Download CSV, the test hook, cards and "N rows changed"; then every browser block of the course pages against its
// snapshot, every exercise and "Already know this?" check against its answer and a fixed wrong one (a passed skip check
// marks its module done); one engine (one worker) across three pages; the changed generation across pages, and a
// lesson editor's refusal of transaction control. The worker's .wasm fetch must reach context.route first, because the fence
// and the boot cases rely on routing.
import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { dictionaries } from "../scripts/build/learn/erd.ts";
import { moduleUrl } from "../scripts/build/learn/module-html.ts";
import { SETUP_PAGE, type CoursePage } from "../scripts/learn/course.ts";
import { readCourse } from "../scripts/learn/course-files.ts";
import { renderError, renderResult } from "../scripts/learn/result.ts";
import { ERD_DIR } from "../scripts/learn/erd-model.ts";
import { DUCKDB_DIR, ASSETS } from "../site/learn/src/assets.ts";
import { engineState, hookResult, learnContext, learnManifest, ORIGIN, records, repoPath, runPlayground, waitReady } from "./helpers.ts";

const PLAYGROUND = "/learn/playground/";
const WASM = `${ORIGIN}${ASSETS}/${DUCKDB_DIR}/duckdb-eh.wasm`;
const status = (page: Page) => page.locator("#engine-status");
const result = (page: Page) => page.locator("#playground-result");

const run = runPlayground;

// The result table's body as rows of cell text.
const cells = (page: Page) => result(page).locator("tbody tr").evaluateAll((trs) =>
  trs.map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent)));

test("the worker's own .wasm fetch reaches context.route", async ({ browser }) => {
  const { context, offOrigin } = await learnContext(browser);
  const methods: string[] = [];
  await context.route(WASM, (route) => {
    methods.push(route.request().method());
    return route.continue();
  });
  const page = await context.newPage();
  await page.goto(PLAYGROUND);
  await waitReady(page);
  // The page only HEADs the .wasm (boot step 1); the GET is the worker's.
  expect(methods.sort()).toEqual(["GET", "HEAD"]);
  expect(offOrigin).toEqual([]);
  await context.close();
});

test("with the .wasm held back, the text is readable and Run is disabled, with progress", async ({ browser }) => {
  const { context } = await learnContext(browser);
  await context.route(WASM, () => {}); // never answered
  const page = await context.newPage();
  await page.goto(PLAYGROUND);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Playground");
  await expect(page.locator("#playground-sql")).toBeEditable();
  await expect(page.getByRole("button", { name: "Run" })).toBeDisabled();
  await expect(status(page)).toHaveText("Starting the database…");
  await expect(engineState(page)).toHaveAttribute("data-engine", "loading");
  await context.close();
});

test("with the .wasm answering 404, the page says why", async ({ browser }) => {
  const { context } = await learnContext(browser);
  await context.route(WASM, (route) => route.fulfill({ status: 404, body: "" }));
  const page = await context.newPage();
  await page.goto(PLAYGROUND);
  await expect(engineState(page)).toHaveAttribute("data-engine", "failed");
  await expect(status(page)).toHaveText(`The database couldn't start: ${WASM} answered 404.`);
  await expect(page.getByRole("button", { name: "Run" })).toBeDisabled();
  await context.close();
});

test("a tampered /v1/species.parquet is refused (SC2)", async ({ browser }) => {
  const { context } = await learnContext(browser);
  await context.route(`${ORIGIN}/v1/species.parquet`, async (route) => {
    const body = await (await route.fetch()).body();
    body[100] ^= 0xff;
    return route.fulfill({ status: 200, body, contentType: "application/octet-stream" });
  });
  const page = await context.newPage();
  await page.goto(PLAYGROUND);
  await expect(engineState(page)).toHaveAttribute("data-engine", "failed");
  await expect(status(page)).toHaveText(
    /^The database couldn't start: \/v1\/species\.parquet isn't the file \/learn\/data\/ was built from \(sha256 [0-9a-f]{64}\): reload; if it persists, the site is mid-update\.$/);
  await expect(page.getByRole("button", { name: "Run" })).toBeDisabled();
  await context.close();
});

test("a result is cut at 10,000 rows, 200 drawn, and the next query runs", async ({ browser }) => {
  const { context, offOrigin } = await learnContext(browser);
  const page = await context.newPage();
  await page.goto(PLAYGROUND);
  await waitReady(page);
  await run(page, "SELECT range AS n FROM range(25000)");
  await expect(result(page).locator(".result-summary")).toHaveText("The first 10,000 rows were kept; the rest were cut. Showing 200.");
  expect((await cells(page)).length).toBe(200);
  await run(page, "SELECT 42 AS answer");
  await expect(result(page).locator(".result-summary")).toHaveText("1 row.");
  expect(await cells(page)).toEqual([["42"]]);
  expect(offOrigin).toEqual([]);
  await context.close();
});

test("Reset restores the tables; Stop ends a runaway query; the next query runs", async ({ browser }) => {
  const occurrences = (await learnManifest()).files["occurrences.parquet"]!.rows!;
  const { context, offOrigin } = await learnContext(browser);
  const page = await context.newPage();
  await page.goto(PLAYGROUND);
  await waitReady(page);

  await run(page, "CREATE TABLE mine AS SELECT 1 AS x; DELETE FROM occurrences");
  await run(page, "SELECT count(*) AS n FROM occurrences");
  expect(await cells(page)).toEqual([["0"]]);
  await page.getByRole("button", { name: "Reset database" }).click();
  await waitReady(page);
  await run(page, "SELECT count(*) AS n FROM occurrences");
  expect(await cells(page)).toEqual([[String(occurrences)]]);
  await run(page, "SELECT * FROM mine");
  await expect(result(page).locator(".result-error")).toContainText("statement 1 of 1:");
  await expect(result(page).locator(".result-error")).toContainText("mine");

  await page.locator("#playground-sql").fill("SELECT sum(a.range * b.range) FROM range(100000000) a, range(100000000) b");
  await page.getByRole("button", { name: "Run" }).click();
  await expect(page.getByRole("button", { name: "Stop" })).toBeEnabled();
  await page.getByRole("button", { name: "Stop" }).click();
  await waitReady(page);
  await expect(result(page).locator(".result-summary")).toHaveText("Stopped. The database was restarted.");
  await run(page, "SELECT 1 AS one");
  expect(await cells(page)).toEqual([["1"]]);
  expect(offOrigin).toEqual([]);
  await context.close();
});

test("transaction control is refused in the playground before anything runs", async ({ browser }) => {
  const { context, offOrigin } = await learnContext(browser);
  const page = await context.newPage();
  await page.goto(PLAYGROUND);
  await waitReady(page);
  await run(page, "CREATE TABLE mine AS SELECT 1 AS x; COMMIT");
  await expect(result(page).locator(".result-error")).toHaveText(
    "statement 2 of 2: COMMIT isn't run in the playground: an open transaction would break the lesson editors, which roll back their own; transactions are practised in psql");
  expect(await hookResult(page, "playground")).toEqual({ error: expect.stringMatching(/^statement 2 of 2: COMMIT isn't run/) });
  await expect(engineState(page)).not.toHaveAttribute("data-changed", "true");
  await run(page, "SELECT * FROM mine");
  await expect(result(page).locator(".result-error")).toContainText("mine");
  expect(offOrigin).toEqual([]);
  await context.close();
});

test("a playground SELECT leaves the generation unchanged; a DELETE marks it changed; Reset clears it", async ({ browser }) => {
  const { context, offOrigin } = await learnContext(browser);
  const page = await context.newPage();
  await page.goto(PLAYGROUND);
  await waitReady(page);
  await run(page, "SELECT count(*) AS n FROM species; FROM countries LIMIT 1");
  await expect(engineState(page)).not.toHaveAttribute("data-changed", "true");
  await expect(status(page)).toHaveText("The database is ready.");
  await run(page, "DELETE FROM occurrences WHERE species_id = 25");
  await expect(engineState(page)).toHaveAttribute("data-changed", "true");
  await expect(status(page)).toHaveText("The database is ready. You changed its tables: Reset database restores them, and lesson checks wait until then.");
  await page.getByRole("button", { name: "Reset database" }).click();
  await waitReady(page);
  await expect(engineState(page)).not.toHaveAttribute("data-changed", "true");
  await expect(status(page)).toHaveText("The database is ready.");
  expect(offOrigin).toEqual([]);
  await context.close();
});

test("the playground lists schema v2's tables linked to the dictionary, and Download CSV saves the last result", async ({ browser }) => {
  const tables = dictionaries(await readFile(repoPath(`${ERD_DIR}/schema.mmd`), "utf8")).map((d) => d.table);
  const { context, offOrigin } = await learnContext(browser);
  const page = await context.newPage();
  await page.goto(PLAYGROUND);
  for (const t of tables) await expect(page.locator(`#playground-tables a[href="/learn/schema/#t-${t}"]`)).toHaveText(t);
  await expect(page.locator(`#playground-tables a[href="/learn/schema/#species_taxonomy"]`)).toHaveText("species_taxonomy");
  const csv = page.getByRole("button", { name: "Download CSV" });
  await expect(csv).toBeDisabled();
  await waitReady(page);
  await run(page, "SELECT 1 AS n, 'a, \"b\"' AS s, NULL AS v, '' AS e UNION ALL SELECT 2, 'plain', 'x', 'y' ORDER BY n");
  await expect(csv).toBeEnabled();
  const [download] = await Promise.all([page.waitForEvent("download"), csv.click()]);
  expect(download.suggestedFilename()).toBe("result.csv");
  expect(await readFile(await download.path(), "utf8")).toBe('n,s,v,e\n1,"a, ""b""",,""\n2,plain,x,y\n');
  await run(page, "SELECT * FROM nope");
  await expect(csv).toBeDisabled();
  expect(offOrigin).toEqual([]);
  await context.close();
});

test("the test hook reads the last result as cell text, with truncated", async ({ browser }) => {
  const { context } = await learnContext(browser);
  const page = await context.newPage();
  await page.goto(PLAYGROUND);
  await waitReady(page);
  expect(await hookResult(page, "playground")).toBeUndefined();
  await run(page, "SELECT 1::BIGINT AS n, NULL AS v, [1, 2] AS l, 2.50::DECIMAL(4, 2) AS d, DATE '2026-10-20' AS day");
  expect(await hookResult(page, "playground")).toEqual({ columns: ["n", "v", "l", "d", "day"], rows: [["1", "NULL", "[1, 2]", "2.50", "2026-10-20"]], truncated: false });
  await run(page, "SELECT range AS n FROM range(10001)");
  const cut = await hookResult(page, "playground");
  expect(cut && "rows" in cut && [cut.rows.length, cut.truncated]).toEqual([10_000, true]);
  await run(page, "SELECT * FROM nope");
  expect(await hookResult(page, "playground")).toEqual({ error: expect.stringMatching(/^statement 1 of 1: Catalog Error: .*nope/) });
  await context.close();
});

test("-- show: cards draws a card per animal with its photo; the Table tab has the rows; a broken card rule says why", async ({ browser }) => {
  const species = (await records()).filter((r) => r.photo).slice(0, 3);
  const { context, offOrigin, photos } = await learnContext(browser);
  const page = await context.newPage();
  await page.goto(PLAYGROUND);
  await waitReady(page);
  await run(page, `-- show: cards\nSELECT id, scientific_name AS latin FROM species WHERE id IN (${species.map((s) => s.id).join(", ")}) ORDER BY id`);
  const cards = result(page).locator("article.card");
  await expect(cards).toHaveCount(3);
  await expect(cards.first().locator("h3")).toHaveText(species[0]!.commonName);
  await expect(cards.first()).toContainText(`latin: ${species[0]!.scientificName}`);
  await expect(cards.first().locator("img")).toHaveJSProperty("naturalWidth", 1);
  await expect(cards.first().locator(".credit")).toContainText(species[0]!.photo!.credit);
  await expect(result(page).getByRole("tab", { name: "Cards" })).toHaveAttribute("aria-selected", "true");
  await result(page).getByRole("tab", { name: "Table" }).click();
  await expect(result(page).getByRole("tab", { name: "Table" })).toHaveAttribute("aria-selected", "true");
  await expect(cards.first()).toBeHidden();
  expect(await cells(page)).toEqual(species.map((s) => [String(s.id), s.scientificName]));
  expect(photos.sort()).toEqual(species.map((s) => s.photo!.url).sort());

  await run(page, "-- show: cards\nSELECT 1 AS id UNION ALL SELECT 1");
  await expect(result(page).locator(".result-reason")).toHaveText("Cards need one row per animal, with its id in `id` or `species_id` (`id` 1 appears twice).");
  await expect(result(page).locator("article.card")).toHaveCount(0);
  expect(await cells(page)).toEqual([["1"], ["1"]]);
  expect(offOrigin).toEqual([]);
  await context.close();
});

test("a statement that writes rows says N rows changed", async ({ browser }) => {
  const { context } = await learnContext(browser);
  const page = await context.newPage();
  await page.goto(PLAYGROUND);
  await waitReady(page);
  await run(page, "CREATE TABLE mine (a INT); INSERT INTO mine VALUES (1), (2), (3)");
  await expect(result(page).locator(".result-summary")).toHaveText("3 rows changed.");
  await run(page, "DELETE FROM mine WHERE a = 1");
  await expect(result(page).locator(".result-summary")).toHaveText("1 row changed.");
  await context.close();
});

// The course pages (setup, then the built modules) with their URLs.
async function coursePages(): Promise<{ page: CoursePage; url: string }[]> {
  const c = await readCourse();
  return c.pages.map((p) => ({ page: p, url: p.page.id === SETUP_PAGE ? "/learn/setup/" : moduleUrl(c.curriculum!.modules.find((m) => m.id === p.page.id)!) }));
}

// Clicks the block's Run (or Check) and waits for its region.
async function runBlock(block: Locator): Promise<void> {
  await block.locator("[data-run]").click();
  await expect(block.locator(".result")).not.toHaveAttribute("aria-busy", "true", { timeout: 30_000 });
}

// A block's last outcome as the recorded text (scripts/learn/result.ts), the form its snapshot holds.
async function rendered(page: Page, id: string): Promise<string> {
  const r = await hookResult(page, id);
  if (!r) throw new Error(`${id}: no result`);
  return "error" in r ? renderError(id, r.error) : renderResult(id, r);
}

test("every browser block of the course pages equals its snapshot, and cards follow the card rule", async ({ browser }) => {
  const { context, offOrigin } = await learnContext(browser);
  const page = await context.newPage();
  const seen: string[] = [];
  for (const { page: p, url } of await coursePages()) {
    const editors = p.slots.filter((s) => s.kind === "block").map((s) => p.blocks.find((b) => b.id === s.name)!).filter((b) => b.engine === "duckdb");
    if (!editors.length) continue;
    await page.goto(url);
    await waitReady(page);
    for (const b of editors) {
      const block = page.locator(`#q-${b.id}`);
      await expect(block.locator("textarea")).toHaveValue(b.code.replace(/\n+$/, ""));
      await runBlock(block);
      expect(await rendered(page, b.id), b.id).toMatchSnapshot(`${b.id}.txt`);
      const r = await hookResult(page, b.id);
      const cards = /^-- show: cards$/m.test(b.code) && r && "rows" in r ? r.rows.length : 0;
      await expect(block.locator("article.card"), b.id).toHaveCount(cards);
      seen.push(b.id);
    }
  }
  expect(seen).toEqual(expect.arrayContaining(["setup-counts", "f1-no-photo", "f1-page", "f2-count", "f2-distinct", "d6-export"]));
  expect(offOrigin).toEqual([]);
  await context.close();
});

// A fixed wrong answer for each exercise and skip check, and the hint it gets.
const WRONG: Record<string, { sql: string; hint: string }> = {
  // The NOT LIKE alone: a NULL license is neither CC nor not, so the two animals with no photo drop out.
  "f1-skip": {
    sql: "SELECT id, common_name, photo_license FROM species WHERE photo_license NOT LIKE 'CC%' ORDER BY common_name",
    hint: "Your result has 8 rows; the answer has 10.",
  },
  // One id forgotten: Blanding's Turtle, missing only its NCBI id, drops out.
  "f1-ex": {
    sql: "SELECT id, common_name, gbif_id, ncbi_id, inaturalist_id, wikidata_id FROM species WHERE gbif_id IS NULL OR inaturalist_id IS NULL OR wikidata_id IS NULL ORDER BY id",
    hint: "Your result has 5 rows; the answer has 6.",
  },
  // count(dataset_key) counts a dataset once per record, not once.
  "f2-skip": {
    sql: `SELECT species_id, count(*) AS records, count(dataset_key) AS datasets,
       sum(CASE WHEN basis_of_record = 'PRESERVED_SPECIMEN' THEN 1 ELSE 0 END) AS specimens, count(*) - count(year) AS no_year
FROM occurrences GROUP BY species_id HAVING count(DISTINCT dataset_key) > 25 ORDER BY records DESC, species_id`,
    hint: "Some rows differ from the answer.",
  },
  // count(year) counts the records with a year, not those without.
  "f2-ex": {
    sql: `SELECT basis_of_record, count(*) AS records, count(DISTINCT species_id) AS species, count(DISTINCT dataset_key) AS datasets,
       count(year) AS no_year
FROM occurrences GROUP BY basis_of_record HAVING count(*) >= 1000 ORDER BY records DESC, basis_of_record`,
    hint: "Some rows differ from the answer.",
  },
  // No Unknown member: the records without a year fall out of the fact, so it no longer reconciles.
  "d6-ex": {
    sql: `CREATE TABLE dim_decade (decade INTEGER PRIMARY KEY, label VARCHAR NOT NULL);
INSERT INTO dim_decade SELECT DISTINCT year - year % 10, CAST(year - year % 10 AS VARCHAR) || 's' FROM occurrences WHERE year IS NOT NULL;
CREATE TABLE fact_species_decade (species_id INTEGER NOT NULL REFERENCES species (id), decade INTEGER NOT NULL REFERENCES dim_decade (decade), records INTEGER NOT NULL, PRIMARY KEY (species_id, decade));
INSERT INTO fact_species_decade SELECT species_id, year - year % 10, count(*) FROM occurrences WHERE year IS NOT NULL GROUP BY species_id, year - year % 10;
SELECT count(*) AS fact_rows, sum(records) AS records, sum(records) = (SELECT count(*) FROM occurrences) AS reconciles,
       sum(records) FILTER (WHERE decade = -1) AS unknown_decade FROM fact_species_decade;`,
    hint: "Some rows differ from the answer.",
  },
};

test("every exercise and skip check rejects a fixed wrong answer and accepts its own (result = snapshot); a skip check marks its module done", async ({ browser }) => {
  const { context, offOrigin } = await learnContext(browser);
  const page = await context.newPage();
  const seen: string[] = [];
  for (const { page: p, url } of await coursePages()) {
    const exercises = p.slots.filter((s) => (s.kind === "exercise" || s.kind === "skip") && p.blocks.find((b) => b.id === s.name)!.engine === "duckdb");
    if (!exercises.length) continue;
    await page.goto(url);
    await waitReady(page);
    const markDone = page.locator(".mark-done");
    for (const s of exercises) {
      const b = p.blocks.find((x) => x.id === s.name)!;
      const block = page.locator(`#q-${b.id}`);
      const verdict = block.locator(".verdict");
      await expect(block.locator("textarea")).toHaveValue("");
      await block.locator("details summary").click();
      await expect(block.locator("details code")).toHaveText(b.code.replace(/\n+$/, ""));
      const wrong = WRONG[b.id];
      if (!wrong) throw new Error(`${b.id}: no fixed wrong answer in WRONG`);
      await block.locator("textarea").fill(wrong.sql);
      await runBlock(block);
      await expect(verdict, b.id).toHaveText(wrong.hint);
      await expect(verdict).toHaveAttribute("data-ok", "false");
      if (s.kind === "skip") await expect(markDone).toHaveAttribute("aria-pressed", "false");
      await block.locator("textarea").fill(b.code);
      await runBlock(block);
      await expect(verdict, b.id).toHaveText("Correct.");
      await expect(verdict).toHaveAttribute("data-ok", "true");
      expect(await rendered(page, b.id), b.id).toMatchSnapshot(`${b.id}.txt`);
      if (s.kind === "skip") {
        await expect(markDone).toHaveAttribute("aria-pressed", "true");
        expect(await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem("critwire.learn.done.v1") ?? "{}")))).toContain(p.page.id);
      }
      seen.push(b.id);
    }
  }
  expect(seen).toEqual(expect.arrayContaining(["f1-skip", "f1-ex", "f2-skip", "f2-ex", "d6-ex"]));
  expect(offOrigin).toEqual([]);
  await context.close();
});

test("f1, f2 and the playground, moved between by links, start one engine (one worker)", async ({ browser }) => {
  const c = await readCourse();
  const [f1, f2] = ["f1", "f2"].map((id) => c.curriculum!.modules.find((m) => m.id === id)!);
  const { context, offOrigin } = await learnContext(browser);
  const page = await context.newPage();
  const workers: string[] = [];
  page.on("worker", (w) => workers.push(w.url()));
  await page.goto(moduleUrl(f1!));
  await waitReady(page);
  await runBlock(page.locator("#q-f1-unknown"));
  await expect(page.locator("#q-f1-unknown .result-error")).toHaveCount(0);
  await page.locator(`a[rel="next"][href="${moduleUrl(f2!)}"]`).click();
  await expect(page).toHaveURL(`${ORIGIN}${moduleUrl(f2!)}`);
  await waitReady(page);
  await runBlock(page.locator("#q-f2-count"));
  await expect(page.locator("#q-f2-count .result-error")).toHaveCount(0);
  await page.locator("header.site a[href=\"/learn/\"]").click();
  await page.locator(`main a[href="${PLAYGROUND}"]`).first().click();
  await expect(page).toHaveURL(`${ORIGIN}${PLAYGROUND}`);
  await waitReady(page);
  await run(page, "SELECT 1 AS one");
  expect(await cells(page)).toEqual([["1"]]);
  expect(workers).toEqual([`${ORIGIN}${ASSETS}/${DUCKDB_DIR}/duckdb-browser-eh.worker.js`]);
  expect(offOrigin).toEqual([]);
  await context.close();
});

test("across pages, one engine: a playground SELECT leaves d6-ex's Check working; a DELETE makes it refuse until Reset", async ({ browser }) => {
  const c = await readCourse();
  const d6 = c.curriculum!.modules.find((m) => m.id === "d6")!;
  const ex = c.pages.find((p) => p.page.id === "d6")!.blocks.find((b) => b.id === "d6-ex")!;
  const { context, offOrigin } = await learnContext(browser);
  const page = await context.newPage();
  await page.goto(PLAYGROUND);
  await waitReady(page);
  await run(page, "SELECT count(*) AS n FROM occurrences");
  // To d6 through the map, by nav.ts's swaps: the database keeps running.
  await page.locator("header.site a[href=\"/learn/\"]").click();
  await page.locator(`li[data-module="d6"] .module-title a`).click();
  await expect(page).toHaveURL(`${ORIGIN}${moduleUrl(d6)}`);
  const block = page.locator("#q-d6-ex");
  const verdict = block.locator(".verdict");
  await block.locator("textarea").fill(ex.code);
  await runBlock(block);
  await expect(verdict).toHaveText("Correct.");

  await page.goBack(); // the map
  await page.goBack(); // the playground
  await expect(page).toHaveURL(`${ORIGIN}${PLAYGROUND}`);
  await run(page, "DELETE FROM occurrences WHERE year IS NULL");
  await expect(engineState(page)).toHaveAttribute("data-changed", "true");
  await page.goForward();
  await page.goForward();
  await expect(page).toHaveURL(`${ORIGIN}${moduleUrl(d6)}`);
  await block.locator("textarea").fill(ex.code);
  await runBlock(block);
  await expect(verdict).toHaveText("Changed the tables? Reset database brings them back.");
  await expect(verdict).toHaveAttribute("data-ok", "false");

  await block.locator("[data-reset]").click();
  await waitReady(page);
  await expect(engineState(page)).not.toHaveAttribute("data-changed", "true");
  await runBlock(block);
  await expect(verdict).toHaveText("Correct.");
  expect(offOrigin).toEqual([]);
  await context.close();
});

test("a COMMIT typed in a lesson editor is refused before anything runs, and the next run's result is unchanged", async ({ browser }) => {
  const c = await readCourse();
  const d6 = c.curriculum!.modules.find((m) => m.id === "d6")!;
  const lesson = c.pages.find((p) => p.page.id === "d6")!.blocks.find((b) => b.id === "d6-export")!;
  const { context, offOrigin } = await learnContext(browser);
  const page = await context.newPage();
  await page.goto(moduleUrl(d6));
  await waitReady(page);
  const block = page.locator(`#q-${lesson.id}`);
  await block.locator("textarea").fill("DELETE FROM countries;\nCOMMIT;");
  await runBlock(block);
  await expect(block.locator(".result-error")).toHaveText(
    "statement 2 of 2: COMMIT isn't run here: this editor's changes are rolled back; use the playground");
  await expect(engineState(page)).not.toHaveAttribute("data-changed", "true");
  await block.locator("textarea").fill(lesson.code);
  await runBlock(block);
  expect(await rendered(page, lesson.id)).toMatchSnapshot(`${lesson.id}.txt`);
  expect(offOrigin).toEqual([]);
  await context.close();
});
