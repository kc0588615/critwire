import path from 'node:path'

/** Shared E2E constants. Imported by `playwright.config.ts`, so keep it free of test-runner imports. */

export const E2E_PORT = Number(process.env.E2E_PORT ?? 3100)
export const BASE_URL = `http://localhost:${E2E_PORT}`

/**
 * The second server: the same build and database with the hosted limits
 * on and signup off, so it's also the self-hosted profile (P2).
 */
export const SECOND_PORT = E2E_PORT + 2
export const SECOND_BASE_URL = `http://localhost:${SECOND_PORT}`

/** The low limits the second server runs with. */
export const SECOND_LIMITS = { games: 2, mediaMB: 1, publicFeedback: 3 } as const

/** The only non-Discord origin the server accepts as a contact webhook (F21). */
export const WEBHOOK_SINK_PORT = E2E_PORT + 1
export const WEBHOOK_SINK_ORIGIN = `http://127.0.0.1:${WEBHOOK_SINK_PORT}`

/** Cloudflare's documented always-pass Turnstile test keys. */
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA'
export const TURNSTILE_TEST_SECRET_KEY = '1x0000000000000000000000000000000AA'
/** Token accepted by `siteverify` under the test secret, for API-level tests. */
export const TURNSTILE_DUMMY_TOKEN = 'XXXX.DUMMY.TOKEN.XXXX'

/** Marketing preview secret baked into the E2E build; `/next/preview` must still demand a super admin. */
export const PREVIEW_SECRET = 'e2e-preview-secret'

/** The home page's Contact link in E2E and screenshot runs. */
export const E2E_CONTACT_URL = 'mailto:e2e@critwire.test'

export const AUTH_SETUP_PATTERN = /auth\.setup\.ts/

export const ROLES = ['superAdmin', 'aOwner', 'aMember', 'bOwner'] as const
export type Role = (typeof ROLES)[number]

export const PASSWORD = 'e2e-password-1234'

export const CREDENTIALS: Record<Role, { email: string; name: string }> = {
  superAdmin: { email: 'super@e2e.test', name: 'E2E Super Admin' },
  aOwner: { email: 'a-owner@e2e.test', name: 'Studio A Owner' },
  aMember: { email: 'a-member@e2e.test', name: 'Studio A Member' },
  bOwner: { email: 'b-owner@e2e.test', name: 'Studio B Owner' },
}

const AUTH_DIR = path.join(process.cwd(), 'test-results', '.auth')

/** Where the server's outbox adapter writes every email it would send. */
export const OUTBOX_DIR = path.join(process.cwd(), 'test-results', 'outbox')
export const storageStatePath = (role: Role): string => path.join(AUTH_DIR, `${role}.json`)
export const WORLD_PATH = path.join(AUTH_DIR, 'world.json')

/**
 * The E2E and screenshot servers run on a dedicated database that is
 * dropped and re-migrated on every run (`pnpm e2e:server`). Refuse to
 * start unless that database is clearly disposable.
 */
export function requireDisposableDatabase(): string {
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

/**
 * Environment for `pnpm e2e:server`. Next only fills env vars that are
 * undefined, so '' here keeps a developer's .env from switching external
 * services back on. `cronSecret` stays '' unless a run needs the seed route.
 */
export const serverEnv = ({ cronSecret = '' }: { cronSecret?: string } = {}): Record<string, string> => ({
  DATABASE_URL: requireDisposableDatabase(),
  PORT: String(E2E_PORT),
  NEXT_PUBLIC_SERVER_URL: BASE_URL,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: TURNSTILE_TEST_SITE_KEY,
  TURNSTILE_SECRET_KEY: TURNSTILE_TEST_SECRET_KEY,
  PREVIEW_SECRET,
  RATE_LIMIT_OPTIONAL: '1',
  DISCORD_WEBHOOK_TEST_ORIGIN: WEBHOOK_SINK_ORIGIN,
  R2_BUCKET: '',
  R2_ENDPOINT: '',
  R2_ACCESS_KEY_ID: '',
  R2_SECRET_ACCESS_KEY: '',
  RESEND_API_KEY: '',
  SENTRY_DSN: '',
  NEXT_PUBLIC_SENTRY_DSN: '',
  UPSTASH_REDIS_REST_URL: '',
  UPSTASH_REDIS_REST_TOKEN: '',
  CRON_SECRET: cronSecret,
  CRITWIRE_CONTACT_URL: E2E_CONTACT_URL,
  CRITWIRE_OPEN_SIGNUP: '1',
  EMAIL_OUTBOX_DIR: OUTBOX_DIR,
  CRITWIRE_LIMIT_GAMES_PER_STUDIO: '',
  CRITWIRE_LIMIT_MEDIA_MB_PER_STUDIO: '',
  CRITWIRE_LIMIT_PUBLIC_FEEDBACK_PER_GAME: '',
})

/**
 * Environment for the second server (`pnpm start` on `SECOND_PORT`). It
 * reuses the first server's build and database; the app reads these at
 * runtime, so no rebuild is needed.
 */
export const secondServerEnv = (): Record<string, string> => ({
  ...serverEnv(),
  PORT: String(SECOND_PORT),
  CRITWIRE_OPEN_SIGNUP: '',
  EMAIL_OUTBOX_DIR: '',
  CRITWIRE_LIMIT_GAMES_PER_STUDIO: String(SECOND_LIMITS.games),
  CRITWIRE_LIMIT_MEDIA_MB_PER_STUDIO: String(SECOND_LIMITS.mediaMB),
  CRITWIRE_LIMIT_PUBLIC_FEEDBACK_PER_GAME: String(SECOND_LIMITS.publicFeedback),
})
