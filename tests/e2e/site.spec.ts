import type { APIRequestContext } from '@playwright/test'

import type { GameProject } from '../../src/payload-types'
import { portalNavLinks, portalPaths } from '../../src/lib/game-portal/paths'
import { LEGAL_LINKS, LEGAL_SLUGS } from '../../src/lib/legal/paths'
import { SITE } from '../../src/lib/site'
import { BASE_URL } from './support/env'
import { createProject, expect, newRequestContext, test } from './support/fixtures'

/**
 * critwire.com is Critter Connect's site (`src/lib/site.ts`): `/` opens the
 * game's hub, and critwire's own pages carry the game's lockup, the hub's
 * pages and the operator's legal links. The game exists only while this
 * spec runs, as on a fresh instance nobody has set up.
 */

const HUB = portalPaths(SITE.gameSlug).hub

/** `Location` resolved against the server, so relative and absolute answers compare equal. */
const locationOf = (headers: Record<string, string>): string => new URL(headers.location ?? '', BASE_URL).href

let game: GameProject
let visitor: APIRequestContext

test.beforeAll(async ({ api, playwright, world }) => {
  // createProject asserts the 201: a leftover `critter-connect` would fail here, not later (D50).
  game = await createProject(api('superAdmin'), world.tenants.A.id, SITE.gameSlug, { name: SITE.name })
  expect(game.slug).toBe(SITE.gameSlug)
  visitor = await newRequestContext(playwright)
})

test.afterAll(async ({ api }) => {
  await visitor.dispose()
  const { status } = await api('superAdmin').remove('game-projects', game.id)
  expect(status).toBe(200)
})

test('X1 / opens the game’s hub, keeping the query', async ({ page }) => {
  for (const [from, to] of [
    ['/', HUB],
    ['/?ref=x', `${HUB}?ref=x`],
  ]) {
    const hop = await visitor.get(from, { maxRedirects: 0 })
    expect(hop.status(), from).toBe(307)
    expect(locationOf(hop.headers()), from).toBe(`${BASE_URL}${to}`)
  }

  await page.goto('/')
  await expect(page).toHaveURL(`${BASE_URL}${HUB}`)
  await expect(page.getByRole('heading', { level: 1, name: SITE.name })).toBeVisible()
})

test('X2 the site chrome: the lockup, the hub’s pages and the legal links', async ({ page }) => {
  const banner = page.getByRole('banner')
  const footer = page.getByRole('contentinfo')

  await test.step('one lockup per system scheme, linking home', async () => {
    for (const colorScheme of ['light', 'dark'] as const) {
      await page.emulateMedia({ colorScheme })
      await page.goto('/legal/terms')
      const home = banner.getByRole('link', { name: SITE.name })
      await expect(home, colorScheme).toHaveAttribute('href', '/')
      const shown = home.getByRole('img', { name: SITE.name })
      await expect(shown, colorScheme).toHaveCount(1)
      await expect(shown, colorScheme).toHaveAttribute('src', SITE.logo[colorScheme])
    }
  })

  await test.step('the nav reaches the hub’s pages', async () => {
    const nav = banner.getByRole('navigation', { name: 'Main' })
    for (const { href, label } of portalNavLinks(SITE.gameSlug)) {
      await expect(nav.getByRole('link', { exact: true, name: label })).toHaveAttribute('href', href)
    }
    await nav.getByRole('link', { exact: true, name: 'Feedback' }).click()
    await expect(page).toHaveURL(`${BASE_URL}${portalPaths(SITE.gameSlug).feedback}`)
    await page.goBack()
  })

  await test.step('the footer: the three documents and the operator', async () => {
    const legal = footer.getByRole('navigation', { name: 'Legal' })
    for (const slug of LEGAL_SLUGS) {
      await expect(legal.getByRole('link', { name: LEGAL_LINKS[slug].label })).toHaveAttribute(
        'href',
        LEGAL_LINKS[slug].href,
      )
    }
    await expect(footer).toContainText(`© ${new Date().getFullYear()} ${SITE.operator}`)
  })
})
