// Setup timing (plan D15, T13): 5 first visits to the playground (no photos), each in a new context with no routes,
// because routing disables the cache. Each visit's time is navigation start to the engine's `setup` mark (setup.sql
// done). The median must be at most 1.5 × A1's 2.9 s first visit; setup-timing.json in the artifacts records them.
import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { ARTIFACTS, waitReady } from "./helpers.ts";

const VISITS = 5;
const A1_FIRST_VISIT_MS = 2_900;
const LIMIT_MS = 1.5 * A1_FIRST_VISIT_MS;

test("setup: median of 5 first visits ≤ 4,350 ms", async ({ browser }) => {
  test.setTimeout(VISITS * 60_000);
  const visits: number[] = [];
  for (let i = 0; i < VISITS; i++) {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto("/learn/playground/");
    await waitReady(page);
    visits.push(Math.round(await page.evaluate(() => performance.getEntriesByName("setup")[0]!.startTime)));
    await context.close();
  }
  const medianMs = [...visits].sort((a, b) => a - b)[Math.floor(VISITS / 2)]!;
  await writeFile(`${ARTIFACTS}/setup-timing.json`, JSON.stringify({
    page: "/learn/playground/", measure: "navigation start → performance mark 'setup'", visits, medianMs,
    limitMs: LIMIT_MS, a1FirstVisitMs: A1_FIRST_VISIT_MS, command: "pnpm build && pnpm e2e learn-timing",
  }, null, 2) + "\n");
  expect(medianMs).toBeLessThanOrEqual(LIMIT_MS);
});
