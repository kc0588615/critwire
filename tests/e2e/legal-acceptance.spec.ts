import type { APIRequestContext, APIResponse } from '@playwright/test'

import { BASE_URL } from './support/env'
import { type Account, expect, newRequestContext, test } from './support/fixtures'
import { acceptLegal, legalDigest, legalFrontMatter } from './support/legal'

/**
 * Agreement to the Terms of Service and Privacy Policy (plan S3, Goal 2):
 * the `/legal/accept` page and its submit route, the only place an
 * acceptance is recorded, and who may read or write the records. Nothing
 * sends an account here yet; the gate comes in S5. Every test makes its
 * own accounts, so `world`'s users never change state.
 */

const LOGIN = '/admin/login?redirect=%2Flegal%2Faccept'
const AGREE = 'I agree to the Terms of Service and acknowledge the Privacy Policy'
const AGE = 'I confirm I’m at least 18 years old.'
const REFUSED = 'Tick both boxes to continue. If a document changed while this page was open, the versions above are the new ones.'

const jwt = (account: Pick<Account, 'token'>) => ({ Authorization: `JWT ${account.token}` })

/** A redirect's target as path and query. */
const locationOf = (response: APIResponse): string => {
  const location = new URL(response.headers().location ?? '', BASE_URL)
  return `${location.pathname}${location.search}`
}

/** `/legal/accept/submit`'s form with both boxes and the current versions. */
const completeForm = () => ({
  acceptTerms: 'on',
  confirmAge: 'on',
  privacyVersion: legalFrontMatter('privacy').version,
  termsVersion: legalFrontMatter('terms').version,
})

/** Where GET `/legal/accept<query>` redirects `account`, or the status when it doesn't. */
async function acceptPageRedirect(request: APIRequestContext, account: Pick<Account, 'token'>, query: string) {
  const response = await request.get(`/legal/accept${query}`, { headers: jwt(account), maxRedirects: 0 })
  return response.status() === 307 ? { location: locationOf(response), status: 307 } : { status: response.status() }
}

test('LA1 /legal/accept: sign in first; super admins and accounts that accepted go straight on', async ({
  playwright,
  seedUser,
  world,
}) => {
  const request = await newRequestContext(playwright)
  try {
    await test.step('without a session, the page and the route ask for sign-in', async () => {
      const page = await request.get('/legal/accept', { maxRedirects: 0 })
      expect(page.status()).toBe(307)
      expect(page.headers().location).toBe(LOGIN)

      const submit = await request.post('/legal/accept/submit', { form: completeForm(), maxRedirects: 0 })
      expect(submit.status()).toBe(303)
      expect(locationOf(submit)).toBe(LOGIN)
    })

    await test.step('a super admin is never asked', async () => {
      expect(
        await acceptPageRedirect(request, world.users.superAdmin, '?next=%2Fadmin%2Fcollections%2Fgame-projects'),
      ).toEqual({ location: '/admin/collections/game-projects', status: 307 })
    })

    await test.step('an account that accepted goes on to next', async () => {
      const accepted = await seedUser('la1-accepted', { accept: true })
      expect(await acceptPageRedirect(request, accepted, '?next=%2Fonboarding')).toEqual({
        location: '/onboarding',
        status: 307,
      })
    })

    await test.step('an account that hasn’t accepted sees the page', async () => {
      const fresh = await seedUser('la1-fresh')
      expect(await acceptPageRedirect(request, fresh, '?next=%2Fonboarding')).toEqual({ status: 200 })
    })
  } finally {
    await request.dispose()
  }
})

test('LA2 the page: two unticked, required, linked boxes for the current versions, then on to next', async ({
  browser,
  seedUser,
}) => {
  const user = await seedUser('la2')
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  try {
    await context.addCookies([{ name: 'payload-token', value: user.token, url: BASE_URL }])
    const page = await context.newPage()
    await page.goto('/legal/accept?next=%2Fonboarding')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Agree to the Terms to continue')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)

    const agree = page.getByRole('checkbox', { name: AGREE, exact: true })
    const age = page.getByRole('checkbox', { name: AGE, exact: true })
    for (const box of [agree, age]) {
      await expect(box).not.toBeChecked()
      await expect(box).toHaveAttribute('required', '')
    }

    const label = page.locator('label[for="acceptTerms"]')
    for (const [name, href] of [
      ['Terms of Service', '/legal/terms'],
      ['Privacy Policy', '/legal/privacy'],
    ] as const) {
      const link = label.getByRole('link', { name, exact: true })
      await expect(link).toHaveAttribute('href', href)
      await expect(link).toHaveAttribute('target', '_blank')
      await expect(link).toHaveAttribute('rel', /noopener/)
    }

    await expect(page.locator('input[type="hidden"][name="termsVersion"]')).toHaveValue(legalFrontMatter('terms').version)
    await expect(page.locator('input[type="hidden"][name="privacyVersion"]')).toHaveValue(
      legalFrontMatter('privacy').version,
    )
    await expect(page.getByRole('link', { name: 'Log out' })).toHaveAttribute('href', '/admin/logout')
    await test.info().attach('legal-accept', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' })

    // The browser itself refuses a submit with a box unticked.
    const form = page.locator('form', { has: agree })
    await agree.check()
    expect(await form.evaluate((element: HTMLFormElement) => element.checkValidity())).toBe(false)

    await age.check()
    await page.getByRole('button', { name: 'Agree and continue' }).click()
    await expect(page).toHaveURL('/onboarding')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Set up your game’s portal')
  } finally {
    await context.close()
  }
})

test('LA3 a missing box or an old version is refused and records nothing', async ({
  api,
  browser,
  playwright,
  seedUser,
}) => {
  const user = await seedUser('la3')
  const request = await newRequestContext(playwright)
  const { version: terms } = legalFrontMatter('terms')
  const { version: privacy } = legalFrontMatter('privacy')
  try {
    for (const [label, options] of [
      ['without the agreement box', { omit: 'acceptTerms' }],
      ['without the age box', { omit: 'confirmAge' }],
      ['with an old Terms version', { versions: { terms: `${terms}-old` } }],
      ['with an old Privacy version', { versions: { privacy: `${privacy}-old` } }],
    ] as const) {
      await test.step(label, async () => {
        expect(await acceptLegal(request, user.token, { next: '/onboarding', ...options })).toBe(
          '/legal/accept?next=%2Fonboarding&error=1',
        )
      })
    }

    const records = await api('superAdmin').find('legal-acceptances', { where: { user: { equals: user.id } } })
    expect(records.status).toBe(200)
    expect(records.body.totalDocs).toBe(0)

    await test.step('the error page explains, with the boxes unticked', async () => {
      const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
      try {
        await context.addCookies([{ name: 'payload-token', value: user.token, url: BASE_URL }])
        const page = await context.newPage()
        await page.goto('/legal/accept?next=%2Fonboarding&error=1')
        // Scoped to main: Next's route announcer is an alert too.
        await expect(page.getByRole('main').getByRole('alert')).toHaveText(REFUSED)
        await expect(page.getByRole('checkbox', { name: AGREE, exact: true })).not.toBeChecked()
        await expect(page.getByRole('checkbox', { name: AGE, exact: true })).not.toBeChecked()
      } finally {
        await context.close()
      }
    })
  } finally {
    await request.dispose()
  }
})

test('LA4 accepting records both versions and digests once', async ({ api, playwright, seedUser }) => {
  const user = await seedUser('la4')
  const request = await newRequestContext(playwright)
  const superAdmin = api('superAdmin')
  try {
    expect(await acceptLegal(request, user.token, { next: '/onboarding' })).toBe('/onboarding')

    const first = await superAdmin.find('legal-acceptances', { where: { user: { equals: user.id } }, depth: 0 })
    expect(first.body.totalDocs).toBe(1)
    expect(first.body.docs[0]).toMatchObject({
      privacyDigest: legalDigest('privacy'),
      privacyVersion: legalFrontMatter('privacy').version,
      termsDigest: legalDigest('terms'),
      termsVersion: legalFrontMatter('terms').version,
      user: user.id,
    })
    expect(Object.keys(first.body.docs[0]).filter((key) => /ip/i.test(key))).toEqual([])

    expect(await acceptLegal(request, user.token, { next: '/onboarding' })).toBe('/onboarding')
    const second = await superAdmin.find('legal-acceptances', { where: { user: { equals: user.id } }, depth: 0 })
    expect(second.body.totalDocs).toBe(1)
  } finally {
    await request.dispose()
  }
})

// Failure modes SN1–SN7: each must land on /admin.
const UNSAFE_NEXT = [
  '//evil.example/admin',
  '///evil.example',
  'https://evil.example/admin',
  'javascript:alert(1)',
  '/\\evil.example',
  '/admin\\@evil.example',
  '/%5cevil.example',
  '/admin%5C..%5Cx',
  '/admin%0d%0aSet-Cookie:x',
  '/admin%09',
  '/admin\r\nSet-Cookie:x',
  '/admin\t',
  '/g/x',
  '/legal/accept',
  '/api/users/logout',
  '/administrator',
  '/admin/../api/x',
]

const SAFE_NEXT = ['/onboarding', '/admin', '/admin/collections/game-projects?limit=10']

test('LA5 next goes only to onboarding or the admin, as its parsed path', async ({ playwright, seedUser }) => {
  const user = await seedUser('la5', { accept: true })
  const request = await newRequestContext(playwright)
  try {
    for (const next of UNSAFE_NEXT) {
      expect(await acceptPageRedirect(request, user, `?next=${encodeURIComponent(next)}`), `page, ${next}`).toEqual({
        location: '/admin',
        status: 307,
      })
      expect(await acceptLegal(request, user.token, { next }), `route, ${next}`).toBe('/admin')
    }

    // SN8: no next, an empty one, or two.
    for (const query of ['', '?next=', '?next=%2Fonboarding&next=%2Fadmin']) {
      expect(await acceptPageRedirect(request, user, query), `page, "${query}"`).toEqual({
        location: '/admin',
        status: 307,
      })
    }
    const twice = await request.post('/legal/accept/submit?next=%2Fonboarding&next=%2Fadmin', {
      form: completeForm(),
      headers: jwt(user),
      maxRedirects: 0,
    })
    expect(twice.status()).toBe(303)
    expect(locationOf(twice), 'route, two next').toBe('/admin')
    expect(await acceptLegal(request, user.token), 'route, no next').toBe('/admin')

    for (const next of SAFE_NEXT) {
      expect(await acceptPageRedirect(request, user, `?next=${encodeURIComponent(next)}`), `page, ${next}`).toEqual({
        location: next,
        status: 307,
      })
      expect(await acceptLegal(request, user.token, { next }), `route, ${next}`).toBe(next)
    }
  } finally {
    await request.dispose()
  }
})

test('LA6 only super admins read the records, and nobody writes one over REST', async ({ api, seedUser }) => {
  const user = await seedUser('la6', { accept: true })
  const superAdmin = api('superAdmin')

  const { status, body } = await superAdmin.find('legal-acceptances', { where: { user: { equals: user.id } } })
  expect(status).toBe(200)
  expect(body.totalDocs).toBe(1)
  const record = body.docs[0]

  const forged = {
    privacyDigest: 'x',
    privacyVersion: legalFrontMatter('privacy').version,
    termsDigest: 'x',
    termsVersion: legalFrontMatter('terms').version,
    user: user.id,
  }
  expect((await superAdmin.create('legal-acceptances', forged)).status, 'create').toBe(403)
  expect((await superAdmin.update('legal-acceptances', record.id, { termsVersion: '9.9' })).status, 'update').toBe(403)
  expect((await superAdmin.remove('legal-acceptances', record.id)).status, 'delete').toBe(403)
  const unchanged = await superAdmin.findByID('legal-acceptances', record.id)
  expect(unchanged.body.termsVersion).toBe(record.termsVersion)

  for (const role of ['aOwner', 'anonymous'] as const) {
    expect((await api(role).find('legal-acceptances')).status, role).toBe(403)
    expect((await api(role).findByID('legal-acceptances', record.id)).status, role).toBe(403)
    expect((await api(role).create('legal-acceptances', forged)).status, role).toBe(403)
  }
  expect((await user.client.find('legal-acceptances')).status, 'the account itself').toBe(403)
})
