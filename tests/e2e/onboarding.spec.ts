import { randomUUID } from 'node:crypto'

import type { APIRequestContext } from '@playwright/test'

import type { GameProject, Tenant } from '../../src/payload-types'
import type { RestClient } from './support/api'
import { SECOND_BASE_URL } from './support/env'
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
