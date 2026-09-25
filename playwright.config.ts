import { defineConfig, devices } from '@playwright/test'
import 'dotenv/config'

import {
  AUTH_SETUP_PATTERN,
  BASE_URL,
  E2E_PORT,
  TURNSTILE_TEST_SECRET_KEY,
  TURNSTILE_TEST_SITE_KEY,
  WEBHOOK_SINK_ORIGIN,
} from './tests/e2e/support/env'

/**
 * E2E runs against a production build on a dedicated database that is
 * dropped and re-migrated on every run (`pnpm e2e:server`). Refuse to
 * start unless that database is clearly disposable.
 */
function requireDisposableDatabase(): string {
  const e2eURL = process.env.E2E_DATABASE_URL
  const guard = 'E2E_DATABASE_URL: this database is dropped on every run;'
  if (!e2eURL) {
    throw new Error(`${guard} set it to a dedicated database whose name ends in _e2e.`)
  }
  const dbName = (url: string): string => new URL(url).pathname.replace(/^\//, '')
  if (!dbName(e2eURL).endsWith('_e2e')) {
    throw new Error(`${guard} its database name must end in _e2e (got "${dbName(e2eURL)}").`)
  }
  const devURL = process.env.DATABASE_URL
  if (devURL && dbName(devURL) === dbName(e2eURL) && new URL(devURL).host === new URL(e2eURL).host) {
    throw new Error(`${guard} it must not be the same database as DATABASE_URL.`)
  }
  return e2eURL
}

const e2eDatabaseURL = requireDisposableDatabase()

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
    // Next only fills env vars that are undefined, so '' here keeps a
    // developer's .env from switching external services back on.
    env: {
      DATABASE_URL: e2eDatabaseURL,
      PORT: String(E2E_PORT),
      NEXT_PUBLIC_SERVER_URL: BASE_URL,
      NEXT_PUBLIC_TURNSTILE_SITE_KEY: TURNSTILE_TEST_SITE_KEY,
      TURNSTILE_SECRET_KEY: TURNSTILE_TEST_SECRET_KEY,
      PREVIEW_SECRET: 'e2e-preview-secret',
      SKIP_BUILD_STATIC_GENERATION: '1',
      RATE_LIMIT_OPTIONAL: '1',
      DISCORD_WEBHOOK_TEST_ORIGIN: WEBHOOK_SINK_ORIGIN,
      R2_BUCKET: '',
      R2_ENDPOINT: '',
      R2_ACCESS_KEY_ID: '',
      R2_SECRET_ACCESS_KEY: '',
      RESEND_API_KEY: '',
      SENTRY_DSN: '',
      NEXT_PUBLIC_SENTRY_DSN: '',
      OPENAI_API_KEY: '',
      UPSTASH_REDIS_REST_URL: '',
      UPSTASH_REDIS_REST_TOKEN: '',
      CRON_SECRET: '',
    },
  },
})
