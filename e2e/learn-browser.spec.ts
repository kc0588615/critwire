// Learn's browser engine (plan D11, D13 learn-browser; S11, S12): boot, the origin fence, SC2's hash check, the row cap,
// Reset and Stop, on the playground; then the playground's refusals, the changed generation, the test hook, cards and
// "N rows changed". The worker's .wasm fetch must reach context.route first, because the fence and the boot cases rely
// on routing.
import { expect, test, type Page } from "@playwright/test";
import { DUCKDB_DIR, ASSETS } from "../site/learn/src/assets.ts";
import { engineState, hookResult, learnContext, learnManifest, ORIGIN, records, waitReady } from "./helpers.ts";

const PLAYGROUND = "/learn/playground/";
const WASM = `${ORIGIN}${ASSETS}/${DUCKDB_DIR}/duckdb-eh.wasm`;
const status = (page: Page) => page.locator("#engine-status");
const result = (page: Page) => page.locator("#playground-result");

// Runs `sql` in the playground and waits for its result (the region is aria-busy while it runs).
async function run(page: Page, sql: string): Promise<void> {
  await page.locator("#playground-sql").fill(sql);
  await page.getByRole("button", { name: "Run" }).click();
  await expect(result(page)).not.toHaveAttribute("aria-busy", "true", { timeout: 30_000 });
}

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
