import { randomUUID } from 'node:crypto'

import type { APIRequestContext, Browser, BrowserContext, Page } from '@playwright/test'

import type { GameProject, Tenant } from '../../src/payload-types'
import type { RestClient } from './support/api'
import { BASE_URL, SECOND_BASE_URL } from './support/env'
import { type Account, expect, newRequestContext, onboard, test } from './support/fixtures'

/**
 * Onboarding (§6): a verified user with no studio enters a game's name, their
 * website and a store link, and gets a studio they own and a live portal.
 * Until signup exists (Step 11), the users are ones a super admin created.
 */

const STEAM_URL = 'https://store.steampowered.com/app/480/Spacewar/'
const WEBSITE = 'https://studio.example.com'

/** A name no other test uses, and the slug onboarding gives it. */
const freshName = (label: string): { name: string; slug: string } => {
  const id = randomUUID().slice(0, 8)
  return { name: `${label} ${id}`, slug: `${label.toLowerCase().replace(/ /g, '-')}-${id}` }
}

/** The studios `user` created at onboarding, and the games in them. */
async function onboardedBy(superAdmin: RestClient, user: Account): Promise<{ tenants: Tenant[]; games: GameProject[] }> {
  const tenants = await superAdmin.find('tenants', { where: { createdBy: { equals: user.id } }, depth: 0 })
  expect(tenants.status).toBe(200)
  const ids = tenants.body.docs.map((tenant) => tenant.id)
  if (!ids.length) return { tenants: [], games: [] }
  const games = await superAdmin.find('game-projects', { where: { tenant: { in: ids.join(',') } }, depth: 0 })
  expect(games.status).toBe(200)
  return { tenants: tenants.body.docs, games: games.body.docs }
}

/** A browser context with no session, whatever the project's `storageState`. */
const freshContext = (browser: Browser): Promise<BrowserContext> =>
  browser.newContext({ storageState: { cookies: [], origins: [] } })

/** Fills in Payload's sign-in form; the caller asserts where it lands. */
async function signInForm(page: Page, user: Account): Promise<void> {
  await page.getByLabel('Email').fill(user.email)
  await page.getByLabel('Password').fill(user.password)
  await page.getByRole('button', { name: 'Login' }).click()
}

let request: APIRequestContext

test.beforeAll(async ({ playwright }) => {
  request = await newRequestContext(playwright)
})

test.afterAll(async () => {
  await request.dispose()
})

test('S14.1 a verified user without a studio onboards and gets a live portal', async ({ api, page, seedUser }) => {
  const superAdmin = api('superAdmin')
  const user = await seedUser('s141')
  const { name, slug } = freshName('Harbor Lights')

  const location = await onboard(request, user.token, { name, website: WEBSITE, store: STEAM_URL })
  expect(location).toBe(`/g/${slug}?welcome=1`)

  await test.step('one studio the user owns, with one game', async () => {
    const { tenants, games } = await onboardedBy(superAdmin, user)
    expect(tenants).toHaveLength(1)
    expect(tenants[0]).toMatchObject({ name, suspended: false })
    const account = await superAdmin.findByID('users', user.id, { depth: 0 })
    expect(account.body.tenants).toEqual([expect.objectContaining({ tenant: tenants[0].id, roles: ['owner'] })])

    expect(games).toHaveLength(1)
    expect(games[0]).toMatchObject({
      name,
      slug,
      flagged: false,
      links: expect.objectContaining({ website: WEBSITE, steam: STEAM_URL }),
      reportForm: expect.objectContaining({ acceptIdeas: false, reviewSubmissions: true }),
    })
  })

  await test.step('the hub is public, with the store as "Get the game"', async () => {
    const response = await page.goto(`/g/${slug}`)
    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
    await expect(page.getByRole('link', { name: 'Get the game' })).toHaveAttribute('href', STEAM_URL)
  })
})

test('S14.2 a store link on an unknown host is refused, and nothing is created', async ({ api, seedUser }) => {
  const user = await seedUser('s142')
  const { name } = freshName('Unknown Store')

  const location = await onboard(request, user.token, {
    name,
    website: WEBSITE,
    store: 'https://store.example.com/my-game',
  })
  expect(location).toBe('/onboarding?error=store')

  expect(await onboardedBy(api('superAdmin'), user)).toEqual({ tenants: [], games: [] })
  const account = await api('superAdmin').findByID('users', user.id, { depth: 0 })
  expect(account.body.tenants ?? []).toEqual([])
})

test('S14.3 two submits at once for one user make one studio and one game', async ({ api, seedUser }) => {
  const user = await seedUser('s143')
  const { name, slug } = freshName('Double Click')
  const input = { name, website: WEBSITE }

  const locations = await Promise.all([onboard(request, user.token, input), onboard(request, user.token, input)])
  expect(locations.sort()).toEqual(['/admin', `/g/${slug}?welcome=1`])

  const { tenants, games } = await onboardedBy(api('superAdmin'), user)
  expect(tenants).toHaveLength(1)
  expect(games.map((game) => game.slug)).toEqual([slug])

  expect(await onboard(request, user.token, input)).toBe('/admin')
})

test('S14.4 two users onboarding one name at once get distinct slugs', async ({ api, seedUser }) => {
  const [first, second] = await Promise.all([seedUser('s144a'), seedUser('s144b')])
  const { name, slug } = freshName('Same Name')

  const locations = await Promise.all(
    [first, second].map((user) => onboard(request, user.token, { name, website: WEBSITE })),
  )
  expect(locations.sort()).toEqual([`/g/${slug}-2?welcome=1`, `/g/${slug}?welcome=1`])

  for (const user of [first, second]) {
    const { tenants, games } = await onboardedBy(api('superAdmin'), user)
    expect(tenants).toHaveLength(1)
    expect(games).toHaveLength(1)
  }
})

test('S14.5 the demo slug is taken, and a name the filter flags is held', async ({ api, page, seedUser }) => {
  const superAdmin = api('superAdmin')

  await test.step('"Critter Connect" gets critter-connect-2', async () => {
    const user = await seedUser('s145a')
    expect(await onboard(request, user.token, { name: 'Critter Connect', website: WEBSITE })).toBe(
      '/g/critter-connect-2?welcome=1',
    )
  })

  await test.step('a flagged name lands on ?held=1, and its portal isn’t public', async () => {
    const user = await seedUser('s145b')
    const { name, slug } = freshName('Fucking Harbor')
    expect(await onboard(request, user.token, { name, website: WEBSITE })).toBe('/onboarding?held=1')

    const { games } = await onboardedBy(superAdmin, user)
    expect(games).toHaveLength(1)
    expect(games[0]).toMatchObject({ slug, flagged: true, flagReasons: expect.stringMatching(/^Offensive word/) })

    await page.goto(`/g/${slug}`)
    expect(new URL(page.url()).pathname).toBe('/unavailable')
  })
})

test('S14.6 who may onboard: signed in, without a studio, on a hosted instance', async ({
  api,
  playwright,
  seedUser,
  world,
}) => {
  const input = { name: freshName('Nobody').name, website: WEBSITE }

  await test.step('without a session: sign in first, then come back', async () => {
    expect(await onboard(request, undefined, input)).toBe('/admin/login?redirect=%2Fonboarding')
  })

  await test.step('a studio member goes to the admin, and no studio is created', async () => {
    expect(await onboard(request, world.users.aMember.token, input)).toBe('/admin')
    const created = await api('superAdmin').find('tenants', {
      where: { createdBy: { equals: world.users.aMember.id } },
    })
    expect(created.body.totalDocs).toBe(0)
  })

  await test.step('the self-hosted server has no onboarding', async () => {
    const user = await seedUser('s146')
    const second = await newRequestContext(playwright, SECOND_BASE_URL)
    try {
      const response = await second.post('/onboarding/submit', {
        form: input,
        headers: { Authorization: `JWT ${user.token}` },
        maxRedirects: 0,
      })
      expect(response.status()).toBe(404)
    } finally {
      await second.dispose()
    }
  })
})

test('S14.7 in the browser: sign in, onboard, and land on the portal with the next steps', async ({
  api,
  browser,
  seedUser,
}) => {
  const user = await seedUser('s147')
  const { name, slug } = freshName('Lantern Moss')
  const context = await freshContext(browser)
  try {
    const page = await context.newPage()

    await test.step('sign in, then fill in the onboarding form', async () => {
      await page.goto('/admin/login')
      await signInForm(page, user)
      await expect(page).not.toHaveURL(/\/admin\/login/)
      await page.goto('/onboarding')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Set up your game’s portal')
      await page.getByLabel('Game name').fill(name)
      await page.getByLabel('Your website').fill(WEBSITE)
      await page.getByLabel('Store link (optional)').fill(STEAM_URL)
      // The admin bar's actions are a super admin's; a new studio never sees it.
      await expect(page.locator('.admin-bar')).toBeHidden()
      await page.getByRole('button', { name: 'Create my portal' }).click()
      await expect(page).toHaveURL(`/g/${slug}?welcome=1`)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
    })

    const { body } = await api('superAdmin').find('game-projects', { where: { slug: { equals: slug } }, depth: 0 })
    const [project] = body.docs
    const tenantID = typeof project.tenant === 'object' ? project.tenant?.id : project.tenant

    await test.step('the next steps: the link to share, the first update, ideas', async () => {
      const panel = page.getByRole('region', { name: 'Your portal is live' })
      const hubURL = `${BASE_URL}/g/${slug}`
      await expect(panel.getByText(hubURL, { exact: true })).toBeVisible()
      await context.grantPermissions(['clipboard-read', 'clipboard-write'])
      await panel.getByRole('button', { name: 'Copy' }).click()
      await expect(panel.getByText('Copied')).toBeVisible()
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(hubURL)

      await expect(panel.getByRole('link', { name: 'Add your first update' })).toHaveAttribute(
        'href',
        '/admin/collections/patch-notes/create',
      )
      await expect(panel.getByRole('link', { name: 'Turn on ideas' })).toHaveAttribute(
        'href',
        `/admin/collections/game-projects/${project.id}`,
      )
    })

    await test.step('the new studio is selected, so a create form opened first has one', async () => {
      const cookie = (await context.cookies()).find((c) => c.name === 'payload-tenant')
      expect(cookie?.value).toBe(String(tenantID))
    })
  } finally {
    await context.close()
  }

  await test.step('an anonymous visitor sees the hub without the panel', async () => {
    const anonymous = await freshContext(browser)
    try {
      const page = await anonymous.newPage()
      await page.goto(`/g/${slug}`)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(name)
      await expect(page.getByRole('region', { name: 'Your portal is live' })).toHaveCount(0)
    } finally {
      await anonymous.close()
    }
  })
})

test('S14.8 the onboarding page: sign in first, studios go to the admin, hosted only', async ({
  browser,
  playwright,
  seedStudio,
  seedUser,
}) => {
  await test.step('without a session it asks for sign-in, then comes back', async () => {
    const user = await seedUser('s148')
    const context = await freshContext(browser)
    try {
      const page = await context.newPage()
      await page.goto('/onboarding')
      await expect(page).toHaveURL('/admin/login?redirect=%2Fonboarding')
      await signInForm(page, user)
      await expect(page).toHaveURL('/onboarding')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Set up your game’s portal')

      await page.goto('/onboarding?error=store')
      // Scoped to main: Next's route announcer is an alert too.
      const notice = page.getByRole('main').getByRole('alert')
      await expect(notice).toContainText('That store link isn’t one we know')
      await expect(notice).toContainText('Steam')
    } finally {
      await context.close()
    }
  })

  await test.step('a studio owner goes to the admin, except to read the held notice', async () => {
    const { owner } = await seedStudio('s148')
    const context = await freshContext(browser)
    try {
      await context.addCookies([{ name: 'payload-token', value: owner.token, url: BASE_URL }])
      const page = await context.newPage()
      await page.goto('/onboarding')
      await expect(page).toHaveURL(/\/admin\/?$/)

      await page.goto('/onboarding?held=1')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(
        'Your portal is set up and waiting for a quick review',
      )
      await expect(page.getByRole('link', { name: 'Go to your admin' })).toHaveAttribute('href', '/admin')
    } finally {
      await context.close()
    }
  })

  await test.step('the self-hosted server has no onboarding page', async () => {
    const user = await seedUser('s148b')
    const second = await newRequestContext(playwright, SECOND_BASE_URL)
    try {
      const response = await second.get('/onboarding', {
        headers: { Authorization: `JWT ${user.token}` },
        maxRedirects: 0,
      })
      expect(response.status()).toBe(404)
    } finally {
      await second.dispose()
    }
  })
})
