import type { APIRequestContext, APIResponse, Browser, Page } from '@playwright/test'

import type { RestClient } from './support/api'
import { ageLegalAcceptance } from './support/db'
import { emailsTo, verificationToken } from './support/email'
import { BASE_URL, PASSWORD, TURNSTILE_DUMMY_TOKEN } from './support/env'
import {
  type Account,
  createProject,
  expect,
  lexical,
  newRequestContext,
  onboard,
  randomEmail,
  startSignup,
  type Studio,
  test,
  verifyAccount,
} from './support/fixtures'
import { acceptLegal, type LegalConsentOptions, legalConsentForm, legalDigest, legalFrontMatter } from './support/legal'

/**
 * Agreement to the Terms of Service and Privacy Policy (plan S3–S5, Goal
 * 2): the `/legal/accept` page and its submit route, the only place an
 * acceptance is recorded; who may read or write the records; signup's
 * boxes, which are required but record nothing; and the gate, which sends
 * an account that hasn't accepted the current versions to `/legal/accept`
 * before the admin, onboarding or any write. Every test makes its own
 * accounts, so `world`'s users never change state.
 */

const LOGIN = '/admin/login?redirect=%2Flegal%2Faccept'
const AGREE = 'I agree to the Terms of Service and acknowledge the Privacy Policy'
const AGE = 'I confirm I’m at least 18 years old.'
const REFUSED = 'Tick both boxes to continue. If a document changed while this page was open, the versions above are the new ones.'
const GATED = 'Accept the current Terms of Service and Privacy Policy at /legal/accept before making changes.'
const DEEP_LINK = '/admin/collections/patch-notes/create'

const jwt = (account: Pick<Account, 'token'>) => ({ Authorization: `JWT ${account.token}` })

/** A redirect's target as path and query. */
const locationOf = (response: APIResponse): string => {
  const location = new URL(response.headers().location ?? '', BASE_URL)
  return `${location.pathname}${location.search}`
}

/** A browser page with `account`'s session only (none without one). */
async function pageAs(browser: Browser, account?: Pick<Account, 'token'>): Promise<Page> {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  if (account) await context.addCookies([{ name: 'payload-token', value: account.token, url: BASE_URL }])
  return context.newPage()
}

/**
 * The two consent boxes on `page`: unticked and required, with the Brief's
 * labels, both documents linked in a new tab, and hidden inputs carrying
 * the current versions. Returns the boxes.
 */
async function expectConsentFields(page: Page) {
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
  return { agree, age }
}

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

      const submit = await request.post('/legal/accept/submit', { form: legalConsentForm(), maxRedirects: 0 })
      expect(submit.status()).toBe(303)
      expect(locationOf(submit)).toBe(LOGIN)
    })

    await test.step('a super admin is never asked', async () => {
      expect(
        await acceptPageRedirect(request, world.users.superAdmin, '?next=%2Fadmin%2Fcollections%2Fgame-projects'),
      ).toEqual({ location: '/admin/collections/game-projects', status: 307 })
    })

    await test.step('an account that accepted goes on to next', async () => {
      const accepted = await seedUser('la1-accepted')
      expect(await acceptPageRedirect(request, accepted, '?next=%2Fonboarding')).toEqual({
        location: '/onboarding',
        status: 307,
      })
    })

    await test.step('an account that hasn’t accepted sees the page', async () => {
      const fresh = await seedUser('la1-fresh', { accept: false })
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
  const user = await seedUser('la2', { accept: false })
  const page = await pageAs(browser, user)
  try {
    await page.goto('/legal/accept?next=%2Fonboarding')

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Agree to the Terms to continue')
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
    const { agree, age } = await expectConsentFields(page)
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
    await page.context().close()
  }
})

test('LA3 a missing box or an old version is refused and records nothing', async ({
  api,
  browser,
  playwright,
  seedUser,
}) => {
  const user = await seedUser('la3', { accept: false })
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
      const page = await pageAs(browser, user)
      try {
        await page.goto('/legal/accept?next=%2Fonboarding&error=1')
        // Scoped to main: Next's route announcer is an alert too.
        await expect(page.getByRole('main').getByRole('alert')).toHaveText(REFUSED)
        await expect(page.getByRole('checkbox', { name: AGREE, exact: true })).not.toBeChecked()
        await expect(page.getByRole('checkbox', { name: AGE, exact: true })).not.toBeChecked()
      } finally {
        await page.context().close()
      }
    })
  } finally {
    await request.dispose()
  }
})

test('LA4 accepting records both versions and digests once', async ({ api, playwright, seedUser }) => {
  const user = await seedUser('la4', { accept: false })
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
  const user = await seedUser('la5')
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
      form: legalConsentForm(),
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
  const user = await seedUser('la6')
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

/** The account with `email`, if any, as a super admin reads it. */
async function usersWithEmail(superAdmin: RestClient, email: string) {
  const { status, body } = await superAdmin.find('users', { where: { email: { equals: email } }, depth: 0 })
  expect(status).toBe(200)
  return body.docs
}

/** The acceptance records of the account with `email`. */
async function recordsOf(superAdmin: RestClient, email: string): Promise<number> {
  const { status, body } = await superAdmin.find('legal-acceptances', { where: { 'user.email': { equals: email } } })
  expect(status).toBe(200)
  return body.totalDocs
}

test('LA7 signup asks for both boxes, refuses a request without them, and records nothing', async ({
  api,
  browser,
  playwright,
}) => {
  const superAdmin = api('superAdmin')

  await test.step('the form: two unticked, required, linked boxes for the current versions', async () => {
    const page = await pageAs(browser)
    try {
      await page.goto('/signup')
      await expectConsentFields(page)
    } finally {
      await page.context().close()
    }
  })

  const request = await newRequestContext(playwright)
  const { version: terms } = legalFrontMatter('terms')
  const { version: privacy } = legalFrontMatter('privacy')
  try {
    for (const [label, consent] of [
      ['without the agreement box', { omit: 'acceptTerms' }],
      ['without the age box', { omit: 'confirmAge' }],
      ['with an old Terms version', { versions: { terms: `${terms}-old` } }],
      ['with an old Privacy version', { versions: { privacy: `${privacy}-old` } }],
    ] as [string, LegalConsentOptions][]) {
      await test.step(`refused ${label}`, async () => {
        const email = randomEmail('la7-refused')
        const body = { email, turnstileToken: TURNSTILE_DUMMY_TOKEN, ...legalConsentForm(consent) }

        const json = await request.post('/signup/submit', { data: body, maxRedirects: 0 })
        expect(json.status(), 'JSON').toBe(400)

        const form = await request.post('/signup/submit', { form: body, maxRedirects: 0 })
        expect(form.status(), 'form').toBe(303)
        expect(locationOf(form)).toBe('/signup?error=1')

        expect(await usersWithEmail(superAdmin, email), 'no account').toHaveLength(0)
        expect(await emailsTo(email), 'no email').toHaveLength(0)
        expect(await recordsOf(superAdmin, email), 'no record').toBe(0)
      })
    }

    await test.step('a complete signup records nothing, and neither does verifying', async () => {
      const email = randomEmail('la7-complete')
      await startSignup(request, email)
      expect(await usersWithEmail(superAdmin, email), 'a pending account').toHaveLength(1)
      expect(await recordsOf(superAdmin, email), 'after /signup').toBe(0)

      expect(await verifyAccount(request, await verificationToken(email), PASSWORD)).toBe('/onboarding')
      expect(await recordsOf(superAdmin, email), 'after /verify').toBe(0)
    })
  } finally {
    await request.dispose()
  }

  await test.step('the page shows the error with the boxes unticked', async () => {
    const page = await pageAs(browser)
    try {
      await page.goto('/signup?error=1')
      await expect(page.getByRole('main').getByRole('alert')).toHaveText(
        'That didn’t go through. Check your email address, tick both boxes and try again.',
      )
      await expectConsentFields(page)
    } finally {
      await page.context().close()
    }
  })
})

/** Ticks both boxes on `/legal/accept` in the browser and agrees. */
async function agreeInBrowser(page: Page): Promise<void> {
  await expect(page).toHaveURL(/^[^?]*\/legal\/accept\?/)
  await page.getByRole('checkbox', { name: AGREE, exact: true }).check()
  await page.getByRole('checkbox', { name: AGE, exact: true }).check()
  await page.getByRole('button', { name: 'Agree and continue' }).click()
}

/** Where `path` lands in the browser for `account`: path and query. */
async function landing(page: Page, path: string): Promise<string> {
  await page.goto(path)
  const url = new URL(page.url())
  return `${url.pathname}${url.search}`
}

const acceptURL = (next: string) => `/legal/accept?next=${encodeURIComponent(next)}`

/**
 * The writes the gate stops, as `studio`'s owner: a REST create of an
 * update in `project`, a REST rename of the studio, and the same rename
 * over GraphQL. Each answers with the HTTP status (GraphQL's from its
 * error's `statusCode`) and the error message, if any.
 */
async function studioWrites(studio: Studio, projectID: number, label: string) {
  const { client } = studio.owner
  const update = await client.create('patch-notes', {
    content: lexical(`Notes for ${label}`),
    gameProject: projectID,
    slug: label,
    tenant: studio.tenant.id,
    title: `Patch ${label}`,
    _status: 'published',
  })
  const rename = await client.update('tenants', studio.tenant.id, { name: `Renamed ${label}` })
  const graphql = await client.raw<{
    data?: { updateTenant: { name: string } | null }
    errors?: { extensions?: { statusCode?: number }; message: string }[]
  }>('POST', '/api/graphql', {
    data: {
      query: `mutation { updateTenant(id: ${studio.tenant.id}, data: { name: "GraphQL ${label}" }) { name } }`,
    },
  })
  const graphqlError = graphql.body.errors?.[0]
  return {
    update: { status: update.status, message: update.body.errors?.[0]?.message },
    rename: { status: rename.status, message: rename.body.errors?.[0]?.message },
    graphql: graphqlError
      ? { status: graphqlError.extensions?.statusCode, message: graphqlError.message }
      : { status: graphql.status, message: undefined },
  }
}

const refusedByGate = { status: 403, message: GATED }

/** `userID`'s acceptance records, as the super admin reads them. */
async function acceptancesOf(superAdmin: RestClient, userID: number) {
  const { status, body } = await superAdmin.find('legal-acceptances', {
    where: { user: { equals: userID } },
    depth: 0,
  })
  expect(status).toBe(200)
  return body.docs
}

test('LA8 a new account accepts on /legal/accept after verifying, then onboards', async ({
  api,
  browser,
  playwright,
  signIn,
}) => {
  const email = randomEmail('la8')
  const request = await newRequestContext(playwright)
  try {
    await startSignup(request, email)
    expect(await verifyAccount(request, await verificationToken(email), PASSWORD)).toBe('/onboarding')
  } finally {
    await request.dispose()
  }
  const account = await signIn(email, PASSWORD)
  expect(await acceptancesOf(api('superAdmin'), account.id), 'after /signup and /verify').toHaveLength(0)

  const page = await pageAs(browser, account)
  try {
    expect(await landing(page, '/onboarding')).toBe('/legal/accept?next=%2Fonboarding')
    await agreeInBrowser(page)
    await expect(page).toHaveURL('/onboarding')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Set up your game’s portal')
  } finally {
    await page.context().close()
  }

  const records = await acceptancesOf(api('superAdmin'), account.id)
  expect(records).toHaveLength(1)
  expect(records[0]).toMatchObject({
    privacyDigest: legalDigest('privacy'),
    privacyVersion: legalFrontMatter('privacy').version,
    termsDigest: legalDigest('terms'),
    termsVersion: legalFrontMatter('terms').version,
  })
})

test('LA9 until an account accepts, the admin, onboarding and writes send it to /legal/accept', async ({
  api,
  browser,
  playwright,
  seedStudio,
  seedUser,
  signIn,
  uniqueSlug,
}) => {
  const superAdmin = api('superAdmin')
  const studio = await seedStudio('la9', { accept: false })
  const user = await seedUser('la9-user', { accept: false })
  const project = await createProject(superAdmin, studio.tenant.id, uniqueSlug('la9-game'))
  const studioName = (await superAdmin.findByID('tenants', studio.tenant.id)).body.name

  await test.step('a deep admin link and onboarding go to /legal/accept, with that next', async () => {
    for (const [label, account] of [
      ['studio owner', studio.owner],
      ['user without a studio', user],
    ] as const) {
      const page = await pageAs(browser, account)
      try {
        expect(await landing(page, DEEP_LINK), label).toBe(acceptURL(DEEP_LINK))
        expect(await landing(page, '/onboarding'), label).toBe(acceptURL('/onboarding'))
      } finally {
        await page.context().close()
      }
    }
  })

  await test.step('posting the onboarding form goes there too, and makes no studio', async () => {
    const request = await newRequestContext(playwright)
    const name = `La9 Onboard ${uniqueSlug('x')}`
    try {
      expect(await onboard(request, user.token, { name, website: 'https://studio.example.com' })).toBe(
        acceptURL('/onboarding'),
      )
    } finally {
      await request.dispose()
    }
    const { body } = await superAdmin.find('game-projects', { where: { name: { equals: name } }, depth: 0 })
    expect(body.totalDocs).toBe(0)
    expect((await superAdmin.findByID('users', user.id, { depth: 0 })).body.tenants ?? []).toHaveLength(0)
  })

  await test.step('REST and GraphQL writes are refused with the gate’s message', async () => {
    expect(await studioWrites(studio, project.id, uniqueSlug('la9-before'))).toEqual({
      update: refusedByGate,
      rename: refusedByGate,
      graphql: refusedByGate,
    })
    expect((await superAdmin.findByID('tenants', studio.tenant.id)).body.name).toBe(studioName)
    const { body } = await superAdmin.find('patch-notes', { where: { gameProject: { equals: project.id } } })
    expect(body.totalDocs).toBe(0)
  })

  await test.step('me still answers, and Log out still works', async () => {
    const me = await studio.owner.client.raw<{ user: { id: number } | null }>('GET', '/api/users/me')
    expect(me.status).toBe(200)
    expect(me.body.user?.id).toBe(studio.owner.id)

    // A session of its own, so logging it out leaves the others signed in.
    const second = await signIn(user.email, PASSWORD)
    const page = await pageAs(browser, second)
    try {
      expect(await landing(page, '/admin')).toBe(acceptURL('/admin'))
      await page.getByRole('link', { name: 'Log out' }).click()
      await expect(page).toHaveURL(/\/admin\/login/)
      const after = await second.client.raw<{ user: unknown }>('GET', '/api/users/me')
      expect(after.body.user).toBeNull()
    } finally {
      await page.context().close()
    }
  })

  await test.step('after accepting in the browser, the deep link opens and both writes work', async () => {
    const page = await pageAs(browser, studio.owner)
    try {
      await page.goto(DEEP_LINK)
      await agreeInBrowser(page)
      await expect(page).toHaveURL(DEEP_LINK)
      await expect(page.locator('#field-title')).toBeVisible()
    } finally {
      await page.context().close()
    }

    const label = uniqueSlug('la9-after')
    const writes = await studioWrites(studio, project.id, label)
    expect(writes.update.status).toBe(201)
    expect(writes.rename.status).toBe(200)
    expect(writes.graphql).toEqual({ status: 200, message: undefined })
    expect((await superAdmin.findByID('tenants', studio.tenant.id)).body.name).toBe(`GraphQL ${label}`)
  })
})

test('LA10 a version bump sends an account back to /legal/accept', async ({
  api,
  browser,
  playwright,
  seedStudio,
}) => {
  const superAdmin = api('superAdmin')
  const studio = await seedStudio('la10')
  await ageLegalAcceptance(studio.owner.id)

  const page = await pageAs(browser, studio.owner)
  try {
    expect(await landing(page, '/admin')).toBe(acceptURL('/admin'))
    expect(await landing(page, '/onboarding')).toBe(acceptURL('/onboarding'))
  } finally {
    await page.context().close()
  }
  expect(await studio.owner.client.update('tenants', studio.tenant.id, { name: 'La10 renamed' })).toMatchObject({
    status: 403,
    body: { errors: [{ message: GATED }] },
  })

  const request = await newRequestContext(playwright)
  try {
    expect(await acceptLegal(request, studio.owner.token)).toBe('/admin')
  } finally {
    await request.dispose()
  }
  expect(await acceptancesOf(superAdmin, studio.owner.id)).toHaveLength(2)
  expect((await studio.owner.client.update('tenants', studio.tenant.id, { name: 'La10 renamed' })).status).toBe(200)
})

test('LA11 a super admin is never sent to /legal/accept', async ({ api, browser, playwright, seedStudio, world }) => {
  const superAdmin = api('superAdmin')
  const admin = world.users.superAdmin
  expect(await acceptancesOf(superAdmin, admin.id), 'no record').toHaveLength(0)

  const page = await pageAs(browser, admin)
  try {
    expect(await landing(page, '/admin')).toBe('/admin')
    await expect(page.getByRole('heading', { name: 'Across all studios' })).toBeVisible()
  } finally {
    await page.context().close()
  }

  const studio = await seedStudio('la11')
  expect((await superAdmin.update('tenants', studio.tenant.id, { name: 'La11 renamed' })).status).toBe(200)

  const request = await newRequestContext(playwright)
  try {
    expect(await acceptPageRedirect(request, admin, '')).toEqual({ location: '/admin', status: 307 })
  } finally {
    await request.dispose()
  }
})
