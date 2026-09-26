import path from 'node:path'

/** Shared E2E constants. Imported by `playwright.config.ts`, so keep it free of test-runner imports. */

export const E2E_PORT = Number(process.env.E2E_PORT ?? 3100)
export const BASE_URL = `http://localhost:${E2E_PORT}`

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
export const storageStatePath = (role: Role): string => path.join(AUTH_DIR, `${role}.json`)
export const WORLD_PATH = path.join(AUTH_DIR, 'world.json')
