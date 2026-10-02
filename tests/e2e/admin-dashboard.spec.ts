import type { Browser, Page } from '@playwright/test'

import { gameEditHref, gameShareHref } from '../../src/lib/admin/paths'
import { BASE_URL, SECOND_BASE_URL, SECOND_LIMITS, storageStatePath } from './support/env'
import { asStudioAdmin, createPatchNote, createProject, expect, test } from './support/fixtures'

/**
 * The admin by role (§13): the super admin's queues, a studio's portals
 * and next steps, "Set up your portal" for a user with no studio, and
 * Critwire's sign-in page. The second server is the self-hosted profile,
 * with the hosted limits on and signup off (P2).
 */

const FLAG_REASON = 'Held by an E2E test.'

/** Runs `run` on a page signed in as the account holding `token`, on `baseURL`. */
async function asAccount(
  browser: Browser,
  token: string,
  baseURL: string,
  run: (page: Page) => Promise<void>,
): Promise<void> {
  const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } })
  try {
    await context.addCookies([{ name: 'payload-token', value: token, url: baseURL }])
    await run(await context.newPage())
  } finally {
    await context.close()
  }
}

test('S18.1 the super admin’s dashboard counts the queues and links to each filtered list', async ({
  api,
  browser,
  seedStudio,
}) => {
  const superAdmin = api('superAdmin')
  const { tenant, owner } = await seedStudio('s181')
  const project = await createProject(owner.client, tenant.id, `${tenant.slug}-game`)
  const note = await createPatchNote(owner.client, project, 'held')
  for (const [collection, id] of [
    ['game-projects', project.id],
    ['patch-notes', note.id],
  ] as const) {
    const { status, body } = await superAdmin.update(collection, id, { flagged: true, flagReasons: FLAG_REASON })
    expect(status, JSON.stringify(body)).toBe(200)
  }

  const context = await browser.newContext({ storageState: storageStatePath('superAdmin') })
  try {
    const page = await context.newPage()
    await page.goto('/admin')
    await expect(page.getByRole('heading', { name: 'Across all studios' })).toBeVisible()

    const queues = [
      { label: 'Held games', href: '/admin/collections/game-projects?where[flagged][equals]=true', atLeast: 1 },
      { label: 'Held updates', href: '/admin/collections/patch-notes?where[flagged][equals]=true', atLeast: 1 },
      { label: 'Open abuse reports', href: '/admin/collections/abuse-reports?where[status][equals]=open', atLeast: 0 },
      { label: 'Studios', href: '/admin/collections/tenants', atLeast: 3 },
    ]
    for (const { label, href, atLeast } of queues) {
      const link = page.getByRole('link', { name: new RegExp(`^\\d+ ${label}$`) })
      await expect(link, label).toBeVisible()
      expect(decodeURIComponent((await link.getAttribute('href')) ?? ''), label).toBe(href)
      const count = Number(/^(\d+)/.exec((await link.innerText()).trim())?.[1])
      expect(count, label).toBeGreaterThanOrEqual(atLeast)
    }

    await page.getByRole('link', { name: /^\d+ Held games$/ }).click()
    await expect(page).toHaveURL(/\/admin\/collections\/game-projects\?/)
    expect(decodeURIComponent(page.url())).toContain('where[flagged][equals]=true')
  } finally {
    await context.close()
  }
})

test('S18.2 a studio owner’s dashboard lists each portal’s status, the next steps and the limits in force', async ({
  api,
  browser,
  seedStudio,
}) => {
  const studio = await seedStudio('s182')
  const { tenant, owner } = studio
  const live = await createProject(owner.client, tenant.id, `${tenant.slug}-live`, { name: `Live ${tenant.slug}` })
  const held = await createProject(owner.client, tenant.id, `${tenant.slug}-held`, { name: `Held ${tenant.slug}` })
  const flag = await api('superAdmin').update('game-projects', held.id, { flagged: true, flagReasons: FLAG_REASON })
  expect(flag.status, JSON.stringify(flag.body)).toBe(200)

  const expectPortals = async (page: Page) => {
    await expect(page.getByRole('heading', { name: 'Your portals' })).toBeVisible()
    const portals = page.getByRole('region', { name: `Studio ${tenant.slug}` })
    for (const [game, status] of [
      [live, 'Live'],
      [held, 'Held for review'],
    ] as const) {
      const row = portals.getByRole('listitem').filter({ hasText: game.name })
      await expect(row, game.name).toContainText(status)
      await expect(row.getByRole('link', { name: game.name, exact: true })).toHaveAttribute('href', gameEditHref(game.id))
      // Each row's Share link opens its own game's Share tab.
      await expect(row.getByRole('link', { name: `Share ${game.name}` })).toHaveAttribute('href', gameShareHref(game.id))
      // Absolute, on the site's configured URL.
      const portal = new RegExp(`^https?://[^/]+/g/${game.slug}$`)
      await expect(row.getByRole('link', { name: portal })).toHaveAttribute('href', portal)
    }
    // The next steps are for the game the studio started with, and each is a plain link.
    const steps = page.getByRole('heading', { name: 'Next steps' }).locator('..')
    await expect(steps.getByRole('link')).toHaveCount(3)
    await expect(steps.getByRole('link', { name: 'Put critwire on your site' })).toHaveAttribute(
      'href',
      gameShareHref(live.id),
    )
    await expect(steps.getByRole('link', { name: 'Add your first update' })).toHaveAttribute(
      'href',
      '/admin/collections/patch-notes/create',
    )
    await expect(steps.getByRole('link', { name: 'Turn on ideas' })).toHaveAttribute('href', gameEditHref(live.id))
  }

  await test.step('with no limits set, none are listed', () =>
    asStudioAdmin(browser, studio, async (page) => {
      await expectPortals(page)
      await expect(page.getByRole('heading', { name: 'Hosted plan limits' })).toHaveCount(0)
    }),
  )

  await test.step('with limits on, the three limits are listed', () =>
    asStudioAdmin(
      browser,
      studio,
      async (page) => {
        await expectPortals(page)
        const limits = page.getByRole('heading', { name: 'Hosted plan limits' }).locator('..')
        await expect(limits.getByRole('listitem')).toHaveText([
          `${SECOND_LIMITS.games} games per studio`,
          `${SECOND_LIMITS.mediaMB} MB of media per studio`,
          `${SECOND_LIMITS.publicFeedback} public feedback items per game`,
        ])
      },
      SECOND_BASE_URL,
    ),
  )
})

test('S18.3 a user with no studio is offered onboarding only while signup is open', async ({
  browser,
  seedUser,
}) => {
  const user = await seedUser('s183')

  await test.step('with signup open: "Set up your portal" leads to onboarding', () =>
    asAccount(browser, user.token, BASE_URL, async (page) => {
      await page.goto('/admin')
      const setUp = page.getByRole('link', { name: 'Set up your portal' })
      await expect(setUp).toHaveAttribute('href', '/onboarding')
      await setUp.click()
      await expect(page).toHaveURL(/\/onboarding$/)
    }),
  )

  await test.step('with signup off: no onboarding, and who to ask', () =>
    asAccount(browser, user.token, SECOND_BASE_URL, async (page) => {
      await page.goto('/admin')
      await expect(page.getByRole('heading', { name: 'You’re not in a studio yet' })).toBeVisible()
      await expect(page.getByRole('link', { name: 'Set up your portal' })).toHaveCount(0)
    }),
  )
})

test('S18.4 the sign-in page carries Critwire’s wordmark, and signup while it’s open', async ({ browser }) => {
  for (const [baseURL, signupOpen] of [
    [BASE_URL, true],
    [SECOND_BASE_URL, false],
  ] as const) {
    const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } })
    try {
      const page = await context.newPage()
      await page.goto('/admin/login')
      await expect(page).toHaveTitle(/ \| Critwire$/)
      await expect(page.locator('.login__brand').getByRole('link', { name: 'Critwire' })).toHaveAttribute('href', '/')
      await expect(page.getByText('Welcome to Critwire.')).toBeVisible()
      const signup = page.getByRole('link', { name: 'Create your portal' })
      if (signupOpen) await expect(signup).toHaveAttribute('href', '/signup')
      else await expect(signup).toHaveCount(0)
    } finally {
      await context.close()
    }
  }
})
