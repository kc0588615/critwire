import { randomUUID } from 'node:crypto'

import type { APIRequestContext, Browser, BrowserContext, PlaywrightWorkerArgs } from '@playwright/test'

import type { RestClient } from './support/api'
import { emailsTo, linkTo, readEmail, tokenOf, verificationToken } from './support/email'
import { BASE_URL, SECOND_BASE_URL } from './support/env'
import {
  expect,
  newRequestContext,
  randomEmail,
  startSignup,
  submitWithTurnstile,
  test,
  verifyAccount,
} from './support/fixtures'

/**
 * Signup and verification (§1, §4, §5): an email address, a link that lets
 * the inbox owner choose a password, then onboarding. Nothing is set by
 * whoever submits an address, and opening the link changes nothing.
 */

const STEAM_URL = 'https://store.steampowered.com/app/480/Spacewar/'
const WEBSITE = 'https://studio.example.com'
const NEW_PASSWORD = 'signup-password-1234'

/** A browser context with no session, whatever the project's `storageState`. */
const freshContext = (browser: Browser): Promise<BrowserContext> =>
  browser.newContext({ storageState: { cookies: [], origins: [] } })

/** The account with `email`, as a super admin reads it. */
async function userByEmail(superAdmin: RestClient, email: string) {
  const { status, body } = await superAdmin.find('users', { where: { email: { equals: email } }, depth: 0 })
  expect(status).toBe(200)
  expect(body.docs, `one user ${email}`).toHaveLength(1)
  return body.docs[0]
}

type Playwright = PlaywrightWorkerArgs['playwright']

/** Runs `run` on a request context of its own, so a session it gets never leaks into `request`. */
async function inOwnContext<T>(playwright: Playwright, run: (context: APIRequestContext) => Promise<T>): Promise<T> {
  const context = await newRequestContext(playwright)
  try {
    return await run(context)
  } finally {
    await context.dispose()
  }
}

/** Whether `email` and `password` sign in over REST. */
const signsIn = (playwright: Playwright, email: string, password: string): Promise<boolean> =>
  inOwnContext(playwright, async (context) => {
    const response = await context.post('/api/users/login', { data: { email, password } })
    return response.status() === 200
  })

/** Anonymous: it only ever posts forms that sign nobody in. */
let request: APIRequestContext

test.beforeAll(async ({ playwright }) => {
  request = await newRequestContext(playwright)
})

test.afterAll(async () => {
  await request.dispose()
})

test('S15.1 sign up, verify through the emailed link, onboard, and see the live portal', async ({ browser }) => {
  const email = randomEmail('s151')
  const id = randomUUID().slice(0, 8)
  const name = `Tidewater ${id}`
  const slug = `tidewater-${id}`
  const context = await freshContext(browser)
  try {
    const page = await context.newPage()

    await test.step('the signup form sends a link', async () => {
      await page.goto('/signup')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Create your portal')
      await expect(page.getByText('We’ll email you a link to choose your password.')).toBeVisible()
      await page.getByLabel('Email').fill(email)
      await submitWithTurnstile(page, 'Send my link')
      await expect(page).toHaveURL('/signup?submitted=1')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Check your inbox')
      // Scoped to main: the site's header and footer have a Sign in link too.
      const main = page.getByRole('main')
      await expect(main.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/admin/login')
      await expect(main.getByRole('link', { name: 'reset your password' })).toHaveAttribute('href', '/admin/forgot')
    })

    await test.step('the emailed link asks for a password, then signs in to onboarding', async () => {
      const message = await readEmail(email)
      expect(message.subject).toBe('Confirm your email and choose a password')
      await page.goto(linkTo(message, '/verify/'))
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Choose a password')
      await expect(page.getByLabel('Email')).toHaveValue(email)
      await page.getByLabel('Password').fill(NEW_PASSWORD)
      await submitWithTurnstile(page, 'Set password and continue')
      await expect(page).toHaveURL('/onboarding')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Set up your game’s portal')
    })

    await test.step('onboarding lands on the live portal with the next steps', async () => {
      await page.getByLabel('Game name').fill(name)
      await page.getByLabel('Your website').fill(WEBSITE)
      await page.getByLabel('Store link (optional)').fill(STEAM_URL)
      await page.getByRole('button', { name: 'Create my portal' }).click()
      await expect(page).toHaveURL(`/g/${slug}?welcome=1`)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
      await expect(page.getByRole('link', { name: 'Get the game' }).first()).toHaveAttribute('href', STEAM_URL)
      const panel = page.getByRole('region', { name: 'Your portal is live' })
      await expect(panel.getByText(`${BASE_URL}/g/${slug}`, { exact: true })).toBeVisible()
      await expect(panel.getByRole('link', { name: 'Add your first update' })).toBeVisible()
      await expect(panel.getByRole('link', { name: 'Turn on ideas' })).toBeVisible()
    })
  } finally {
    await context.close()
  }

  await test.step('an anonymous visitor sees the hub', async () => {
    const anonymous = await freshContext(browser)
    try {
      const page = await anonymous.newPage()
      const response = await page.goto(`/g/${slug}`)
      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
    } finally {
      await anonymous.close()
    }
  })
})

test('S15.2 a pending account: opening its link changes nothing, and it owns nothing', async ({ api }) => {
  const superAdmin = api('superAdmin')
  const email = randomEmail('s152')
  await startSignup(request, email)
  const link = linkTo(await readEmail(email), '/verify/')

  await test.step('opening the link twice, as a mail scanner would, leaves it unverified', async () => {
    for (let visit = 0; visit < 2; visit += 1) {
      const response = await request.get(link)
      expect(response.status()).toBe(200)
      expect(await response.text()).toContain('Choose a password')
    }
    const user = await userByEmail(superAdmin, email)
    expect(user._verified).toBe(false)
    expect(user.roles).toEqual(['user'])
    expect(user.tenants ?? []).toEqual([])
  })

  await test.step('it owns no studio and no game', async () => {
    const user = await userByEmail(superAdmin, email)
    const tenants = await superAdmin.find('tenants', { where: { createdBy: { equals: user.id } } })
    expect(tenants.body.totalDocs).toBe(0)
  })

  await test.step('onboarding asks for a sign-in', async () => {
    const response = await request.get('/onboarding', { maxRedirects: 0 })
    expect(response.status()).toBe(307)
    expect(response.headers().location).toBe('/admin/login?redirect=%2Fonboarding')
  })
})

test('S15.3 signing up again: a pending address gets the same link, a verified one gets nothing', async ({
  api,
  playwright,
}) => {
  const superAdmin = api('superAdmin')
  const email = randomEmail('s153')

  await startSignup(request, email)
  const first = await emailsTo(email)
  expect(first).toHaveLength(1)
  const before = await userByEmail(superAdmin, email)

  await test.step('a pending address gets its stored link again, and nothing is written', async () => {
    await startSignup(request, email)
    const both = await emailsTo(email)
    expect(both).toHaveLength(2)
    expect(linkTo(both[1], '/verify/')).toBe(linkTo(both[0], '/verify/'))
    const after = await userByEmail(superAdmin, email)
    expect(after.updatedAt).toBe(before.updatedAt)
    expect(after._verified).toBe(false)
  })

  await test.step('a verified address gets nothing, with the same answer', async () => {
    const token = tokenOf(linkTo(first[0], '/verify/'))
    expect(await inOwnContext(playwright, (owner) => verifyAccount(owner, token, NEW_PASSWORD))).toBe('/onboarding')
    const sent = (await emailsTo(email)).length
    await startSignup(request, email)
    expect(await emailsTo(email)).toHaveLength(sent)
  })
})

test('S15.4 a used link says so, and posting it again changes nothing', async ({ playwright }) => {
  const email = randomEmail('s154')
  await startSignup(request, email)
  const token = await verificationToken(email)

  expect(await inOwnContext(playwright, (owner) => verifyAccount(owner, token, NEW_PASSWORD))).toBe('/onboarding')

  const page = await request.get(`/verify/${token}`)
  expect(page.status()).toBe(200)
  const html = await page.text()
  expect(html).toContain('This link has been used or is invalid.')
  expect(html).not.toContain('name="password"')

  expect(await verifyAccount(request, token, 'another-password-5678')).toBe(`/verify/${token}`)
  expect(await signsIn(playwright, email, NEW_PASSWORD)).toBe(true)
  expect(await signsIn(playwright, email, 'another-password-5678')).toBe(false)
})

test('S15.5 two verifications at once with one link: exactly one password signs in', async ({ playwright }) => {
  const email = randomEmail('s155')
  await startSignup(request, email)
  const token = await verificationToken(email)
  const passwords = ['race-password-aaaa', 'race-password-bbbb']

  const landed = await Promise.all(
    passwords.map((password) => inOwnContext(playwright, (context) => verifyAccount(context, token, password))),
  )
  expect(landed).toContain('/onboarding')

  const results = await Promise.all(passwords.map((password) => signsIn(playwright, email, password)))
  expect(results.filter(Boolean)).toHaveLength(1)
})

test('S15.6 signup and verification refuse a missing Turnstile token', async ({ api }) => {
  const anonymous = api('anonymous')
  const signup = await anonymous.raw('POST', '/signup/submit', { data: { email: randomEmail('s156') } })
  expect(signup.status).toBe(400)

  const email = randomEmail('s156-verify')
  await startSignup(request, email)
  const token = await verificationToken(email)
  const verify = await anonymous.raw('POST', '/verify/submit', { data: { password: NEW_PASSWORD, token } })
  expect(verify.status).toBe(400)
  expect((await userByEmail(api('superAdmin'), email))._verified).toBe(false)
})

test('S15.7 the self-hosted server has no signup', async ({ playwright }) => {
  const second = await newRequestContext(playwright, SECOND_BASE_URL)
  try {
    for (const path of ['/signup', '/verify/0123456789abcdef']) {
      expect((await second.get(path, { maxRedirects: 0 })).status(), path).toBe(404)
    }
    for (const path of ['/signup/submit', '/verify/submit']) {
      const response = await second.post(path, { form: { email: randomEmail('s157') }, maxRedirects: 0 })
      expect(response.status(), path).toBe(404)
    }
  } finally {
    await second.dispose()
  }
})
