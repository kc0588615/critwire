// E2E (plan §9): headless Chromium against a local Caddy serving dist/ the way production does.
// Run: pnpm build && E2E_ARTIFACTS=<dir> pnpm e2e
import { defineConfig } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ARTIFACTS, ORIGIN, SECOND_ORIGIN } from "./e2e/helpers.ts";

mkdirSync(ARTIFACTS, { recursive: true });

export default defineConfig({
  testDir: "e2e",
  // e2e/release/ is the release smoke, run against the live site by playwright.release.config.ts.
  testIgnore: "release/**",
  workers: 1,
  forbidOnly: true,
  // Browser block renderings (plan D13): e2e/__snapshots__/<id>.txt, seeded by learn:port; never rewritten by a run.
  snapshotPathTemplate: "{testDir}/__snapshots__/{arg}{ext}",
  updateSnapshots: "none",
  outputDir: `${ARTIFACTS}/test-results`,
  reporter: [
    ["list"],
    ["html", { outputFolder: `${ARTIFACTS}/playwright-report`, open: "never" }],
    ["json", { outputFile: `${ARTIFACTS}/results.json` }],
  ],
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL: ORIGIN, browserName: "chromium", headless: true, trace: "on", screenshot: "on" },
  webServer: {
    command: "caddy run --config e2e/Caddyfile --adapter caddyfile",
    url: `${SECOND_ORIGIN}/`,
    reuseExistingServer: false,
    env: {
      CRITWIRE_DIST: fileURLToPath(new URL("dist", import.meta.url)),
      CRITWIRE_FIXTURES: fileURLToPath(new URL("e2e/fixtures", import.meta.url)),
      E2E_ARTIFACTS: ARTIFACTS,
    },
  },
});
