import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'

import { BASE_URL, serverEnv } from './tests/e2e/support/env'
import { shotsTarget } from './tests/screenshots/catalog'
import { SHOTS_CRON_SECRET } from './tests/screenshots/support'

/**
 * Design screenshots: the Critter Connect demo under several themes, at
 * 1440 and 390 px, against a production build on the disposable E2E
 * database (dropped on every run, so never alongside `pnpm test:e2e`).
 *
 *   SHOTS_SET=before|after SHOTS_DIR=/abs/dir [SHOTS_THEMES=default,riso,…] pnpm screenshots [--project desktop|mobile]
 *
 * Writes `<SHOTS_DIR>/<set>/<group>--<page>--<width>.png` and rewrites
 * `<SHOTS_DIR>/index.html` with every before/after pair. "after" runs also
 * probe the quality floor into `<SHOTS_DIR>/after/checks.json`.
 */

// Fail fast, before the build starts.
shotsTarget()
const env = serverEnv({ cronSecret: SHOTS_CRON_SECRET })

const shotUse = {
  channel: 'chromium',
  // Captures show final states; the harness never races an animation.
  contextOptions: { reducedMotion: 'reduce' as const },
}

export default defineConfig({
  testDir: './tests/screenshots',
  testMatch: /\.shots\.ts$/,
  outputDir: 'test-results/shots',
  forbidOnly: true,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-shots' }]],
  globalSetup: './tests/screenshots/recordRun.ts',
  globalTeardown: './tests/screenshots/writeIndex.ts',
  use: {
    // Must be `localhost`: Chromium only accepts the production build's
    // Secure cookies over plain http on localhost.
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    video: 'off',
  },
  projects: [
    { name: 'shots-setup', testMatch: /setup\.shots\.ts$/ },
    {
      name: 'desktop',
      testMatch: /design\.shots\.ts$/,
      dependencies: ['shots-setup'],
      use: { ...devices['Desktop Chrome'], ...shotUse, viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      testMatch: /design\.shots\.ts$/,
      dependencies: ['shots-setup'],
      use: {
        ...devices['Desktop Chrome'],
        ...shotUse,
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
  webServer: {
    command: 'pnpm e2e:server',
    url: `${BASE_URL}/api/health`,
    timeout: 420_000,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
    env: process.env.SHOTS_SKIP_BUILD === '1' ? { ...env, E2E_SKIP_BUILD: '1' } : env,
  },
})
