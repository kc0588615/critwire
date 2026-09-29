import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'

import { AUTH_SETUP_PATTERN, BASE_URL, serverEnv } from './tests/e2e/support/env'

// Fails fast, before anything starts, unless the E2E database is disposable.
const env = serverEnv()

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: true,
  fullyParallel: false,
  workers: 1,
  // A retry would hide the races some specs exist to catch.
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // Must be `localhost`: Chromium only accepts the production build's
    // Secure cookies over plain http on localhost.
    baseURL: BASE_URL,
    trace: 'on',
    screenshot: 'on',
    video: 'off',
  },
  projects: [
    { name: 'setup', testMatch: AUTH_SETUP_PATTERN },
    {
      name: 'chromium',
      testMatch: /\.spec\.ts$/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
  ],
  webServer: {
    command: 'pnpm e2e:server',
    url: `${BASE_URL}/api/health`,
    timeout: 420_000,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
    env,
  },
})
