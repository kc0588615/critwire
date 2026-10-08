import type { APIRequestContext, Browser, BrowserContext, PlaywrightWorkerArgs } from '@playwright/test'

import { SITE } from '../../src/lib/site'
import type { RestClient } from './support/api'
import { emailsTo, linkTo, readEmail } from './support/email'
import { SECOND_BASE_URL, TURNSTILE_DUMMY_TOKEN } from './support/env'
import {
  expect,
  newRequestContext,
  randomEmail,
  startSignup,
  submitWithTurnstile,
  test,
} from './support/fixtures'

/**
 * Password recovery (§4a, F12): the only way to send a reset email is the
 * guarded form at `/admin/forgot`, and a reset never verifies an account.
 */

const RESET_SUBJECT = `Reset your ${SITE.name} password`
const NEW_PASSWORD = 'recovered-password-1234'

type Playwright = PlaywrightWorkerArgs['playwright']

/** A browser context with no session, whatever the project's `storageState`. */
const freshContext = (browser: Browser): Promise<BrowserContext> =>
  browser.newContext({ storageState: { cookies: [], origins: [] } })

/** The reset emails sent to `email` so far. */
const resetEmailsTo = async (email: string) =>
  (await emailsTo(email)).filter((message) => message.subject === RESET_SUBJECT)

/** Posts the recovery form for `email` with a Turnstile token and fails the test unless it answers "Check your inbox". */
async function requestReset(request: APIRequestContext, email: string): Promise<void> {
  const response = await request.post('/forgot-password/submit', {
    form: { email, turnstileToken: TURNSTILE_DUMMY_TOKEN },
    maxRedirects: 0,
  })
  expect(response.status(), `recover ${email}`).toBe(303)
  expect(new URL(response.headers().location ?? '', 'http://x').search).toBe('?submitted=1')
}

/** Whether `email` and `password` sign in over REST, and Payload's message when they don't. */
async function logIn(playwright: Playwright, email: string, password: string) {
  const context = await newRequestContext(playwright)
  try {
    const response = await context.post('/api/users/login', { data: { email, password } })
    const body = (await response.json()) as { errors?: { message: string }[] }
    return { ok: response.status() === 200, message: body.errors?.[0]?.message ?? '' }
  } finally {
    await context.dispose()
  }
}

/** The account with `email`, as a super admin reads it. */
async function userByEmail(superAdmin: RestClient, email: string) {
  const { status, body } = await superAdmin.find('users', { where: { email: { equals: email } }, depth: 0 })
  expect(status).toBe(200)
  expect(body.docs, `one user ${email}`).toHaveLength(1)
  return body.docs[0]
}

/** Anonymous: it only ever posts forms that sign nobody in. */
let request: APIRequestContext

test.beforeAll(async ({ playwright }) => {
  request = await newRequestContext(playwright)
})

test.afterAll(async () => {
  await request.dispose()
})

test('S16.1 Payload’s own forgot-password endpoints are closed, and the form needs Turnstile [F12]', async ({
  api,
  seedUser,
}) => {
  const anonymous = api('anonymous')
  const { email } = await seedUser('s161')
  const sent = (await emailsTo(email)).length

  await test.step('REST forgot-password is refused', async () => {
    const response = await anonymous.raw('POST', '/api/users/forgot-password', { data: { email } })
    expect(response.status).toBe(403)
  })

  await test.step('GraphQL forgotPasswordUsers is refused', async () => {
    const response = await anonymous.raw<{ data?: { forgotPasswordUsers: boolean | null } }>('POST', '/api/graphql', {
      data: { query: `mutation { forgotPasswordUsers(email: ${JSON.stringify(email)}) }` },
    })
    expect(response.body.errors?.length ?? 0).toBeGreaterThan(0)
    expect(response.body.data?.forgotPasswordUsers ?? null).toBeNull()
  })

  await test.step('the guarded form refuses a post without a Turnstile token', async () => {
    const response = await anonymous.raw('POST', '/forgot-password/submit', { data: { email } })
    expect(response.status).toBe(400)
  })

  expect(await emailsTo(email), 'no email was sent').toHaveLength(sent)
})

test('S16.2 a signed-up owner resets a forgotten password through the form', async ({
  browser,
  playwright,
  signUpStudio,
}) => {
  const { owner } = await signUpStudio('Recovery Studio')
  const context = await freshContext(browser)
  try {
    const page = await context.newPage()

    await test.step('sign in at /admin/login, then sign out', async () => {
      // Payload's forms reset a value typed before they hydrate.
      await page.goto('/admin/login', { waitUntil: 'networkidle' })
      await page.getByLabel('Email').fill(owner.email)
      await page.getByLabel('Password').fill(owner.password)
      await page.getByRole('button', { name: 'Login' }).click()
      await expect(page).toHaveURL(/\/admin\/?$/)
      await page.goto('/admin/logout')
      await expect(page).toHaveURL(/\/admin\/login/)
    })

    await test.step('“Forgot password?” opens the guarded form, which sends a link', async () => {
      await page.getByRole('link', { name: 'Forgot password?' }).click()
      await expect(page).toHaveURL('/admin/forgot')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Reset your password')
      await page.getByLabel('Email').fill(owner.email)
      await submitWithTurnstile(page, 'Send reset link')
      await expect(page).toHaveURL('/admin/forgot?submitted=1')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your inbox')
    })

    await test.step('the emailed link chooses a new password and signs in', async () => {
      const message = await readEmail(owner.email)
      expect(message.subject).toBe(RESET_SUBJECT)
      await page.goto(linkTo(message, '/admin/reset/'), { waitUntil: 'networkidle' })
      await page.getByLabel('New Password').fill(NEW_PASSWORD)
      await page.getByLabel('Confirm Password').fill(NEW_PASSWORD)
      await expect(page.getByLabel('New Password')).toHaveValue(NEW_PASSWORD)
      await page.getByRole('button', { name: 'Reset Password' }).click()
      await expect(page).toHaveURL(/\/admin\/?$/)
    })
  } finally {
    await context.close()
  }

  await test.step('REST sign-in takes the new password, not the old one', async () => {
    expect((await logIn(playwright, owner.email, NEW_PASSWORD)).ok).toBe(true)
    expect((await logIn(playwright, owner.email, owner.password)).ok).toBe(false)
  })
})

test('S16.3 recovering a pending account sets a password but never verifies it', async ({ api, playwright }) => {
  const anonymous = api('anonymous')
  const email = randomEmail('s163')
  await startSignup(request, email)
  await requestReset(request, email)

  const [message] = await resetEmailsTo(email)
  expect(message, 'a reset email').toBeDefined()
  const token = decodeURIComponent(new URL(linkTo(message, '/admin/reset/')).pathname.replace(/^\/admin\/reset\//, ''))

  const reset = await anonymous.raw<{ token?: string }>('POST', '/api/users/reset-password', {
    data: { password: NEW_PASSWORD, token },
  })
  expect(reset.status).toBe(200)
  expect(reset.body.token, 'reset returns a token').toBeTruthy()
  const jwt = { Authorization: `JWT ${reset.body.token}` }

  await test.step('the token authenticates nobody', async () => {
    const me = await anonymous.raw<{ user: unknown }>('GET', '/api/users/me', { headers: jwt })
    expect(me.status).toBe(200)
    expect(me.body.user).toBeNull()

    const user = await userByEmail(api('superAdmin'), email)
    const verify = await anonymous.raw('PATCH', `/api/users/${user.id}`, { data: { _verified: true }, headers: jwt })
    expect(verify.status).toBe(403)

    const onboarding = await request.get('/onboarding', { headers: jwt, maxRedirects: 0 })
    expect(onboarding.status()).toBe(307)
    expect(onboarding.headers().location).toBe('/admin/login?redirect=%2Fonboarding')
  })

  await test.step('signing in with the new password asks for verification', async () => {
    const login = await logIn(playwright, email, NEW_PASSWORD)
    expect(login.ok).toBe(false)
    expect(login.message).toMatch(/verify/i)
    expect((await userByEmail(api('superAdmin'), email))._verified).toBe(false)
  })
})

test('S16.4 without deliverable email, the form asks for the site’s operator and posts are refused', async ({
  browser,
  playwright,
}) => {
  const context = await browser.newContext({ baseURL: SECOND_BASE_URL, storageState: { cookies: [], origins: [] } })
  try {
    const page = await context.newPage()
    await page.goto('/admin/forgot')
    await expect(page.getByText('ask the person who runs it to reset your password')).toBeVisible()
    await expect(page.getByLabel('Email')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Send reset link' })).toHaveCount(0)
  } finally {
    await context.close()
  }

  const second = await newRequestContext(playwright, SECOND_BASE_URL)
  try {
    const response = await second.post('/forgot-password/submit', {
      data: { email: randomEmail('s164'), turnstileToken: TURNSTILE_DUMMY_TOKEN },
    })
    expect(response.status()).toBe(500)
  } finally {
    await second.dispose()
  }
})
