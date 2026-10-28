// The release smoke (plan S26): e2e/release/ against RELEASE_ORIGIN (no local server), after `deploy critwire`.
// Run: pnpm build && RELEASE_ORIGIN=https://critwire.com E2E_ARTIFACTS=<dir> pnpm exec playwright test -c playwright.release.config.ts
// Dry run: the same against a local Caddy on e2e/Caddyfile, RELEASE_ORIGIN=http://127.0.0.1:3100.
import { defineConfig } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

const origin = process.env.RELEASE_ORIGIN;
if (!origin || !/^https?:\/\/[^/]+$/.test(origin)) throw new Error("RELEASE_ORIGIN must be an origin, such as https://critwire.com");
const ARTIFACTS = resolve(process.env.E2E_ARTIFACTS ?? "e2e-artifacts/release");
mkdirSync(ARTIFACTS, { recursive: true });

export default defineConfig({
  testDir: "e2e/release",
  workers: 1,
  forbidOnly: true,
  snapshotPathTemplate: "{testDir}/../__snapshots__/{arg}{ext}",
  updateSnapshots: "none",
  outputDir: `${ARTIFACTS}/test-results`,
  reporter: [
    ["list"],
    ["html", { outputFolder: `${ARTIFACTS}/playwright-report`, open: "never" }],
    ["json", { outputFile: `${ARTIFACTS}/results.json` }],
  ],
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL: origin, browserName: "chromium", headless: true, trace: "on", screenshot: "on" },
});
