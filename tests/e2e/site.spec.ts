import type { APIRequestContext } from '@playwright/test'
import sharp from 'sharp'

import type { GameProject } from '../../src/payload-types'
import { portalNavLinks, portalPaths } from '../../src/lib/game-portal/paths'
import { LEGAL_LINKS, LEGAL_SLUGS } from '../../src/lib/legal/paths'
import { SITE } from '../../src/lib/site'
import { BASE_URL } from './support/env'
import { createProject, expect, newRequestContext, test } from './support/fixtures'

/**
 * critwire.com is Critter Connect's site (`src/lib/site.ts`): `/` opens the
 * game's hub, and critwire's own pages carry the game's lockup, the hub's
 * pages and the operator's legal links, and the icons are the game's own
 * files. The game exists only while this spec runs, as on a fresh
 * instance nobody has set up.
 */

const HUB = portalPaths(SITE.gameSlug).hub

/** `Location` resolved against the server, so relative and absolute answers compare equal. */
const locationOf = (headers: Record<string, string>): string =>
  new URL(headers.location ?? '', BASE_URL).href

let game: GameProject
let visitor: APIRequestContext

test.beforeAll(async ({ api, playwright, world }) => {
  // createProject asserts the 201: a leftover `critter-connect` would fail here, not later (D50).
  game = await createProject(api('superAdmin'), world.tenants.A.id, SITE.gameSlug, {
    name: SITE.name,
  })
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
      await expect(nav.getByRole('link', { exact: true, name: label })).toHaveAttribute(
        'href',
        href,
      )
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

test('X3 the icons are the game’s own files', async () => {
  const bytesOf = async (path: string): Promise<Buffer> => {
    const response = await visitor.get(path)
    expect(response.status(), path).toBe(200)
    return response.body()
  }

  expect(Buffer.compare(await bytesOf('/favicon.svg'), await bytesOf('/brand/favicon.svg'))).toBe(0)

  // The ICO's 16-byte directory entries give each image's byte length (at 8) and offset (at 12).
  const ico = await bytesOf('/favicon.ico')
  for (const [index, size] of [16, 32, 48].entries()) {
    const entry = 6 + index * 16
    const image = ico.subarray(
      ico.readUInt32LE(entry + 12),
      ico.readUInt32LE(entry + 12) + ico.readUInt32LE(entry + 8),
    )
    expect(Buffer.compare(image, await bytesOf(`/brand/favicon-${size}.png`)), `${size} px`).toBe(0)
  }

  const appleTouch = await visitor.get('/apple-touch-icon.png')
  expect(appleTouch.status()).toBe(200)
  expect(appleTouch.headers()['content-type']).toBe('image/png')
  const { format, height, width } = await sharp(await appleTouch.body()).metadata()
  expect({ format, height, width }).toEqual({ format: 'png', height: 512, width: 512 })
})

test('X4 the head: the icons, the share defaults and the browser colour per scheme', async ({
  page,
}) => {
  for (const path of [HUB, '/legal/terms']) {
    await test.step(path, async () => {
      await page.goto(path)
      const head = page.locator('head')

      const icons = await head
        .locator('link[rel="icon"], link[rel="apple-touch-icon"]')
        .evaluateAll((links) =>
          links.map((link) => new URL(link.getAttribute('href') ?? '', document.baseURI).pathname),
        )
      expect(new Set(icons), path).toEqual(
        new Set(['/favicon.svg', '/favicon.ico', '/apple-touch-icon.png']),
      )
      for (const icon of icons) expect((await visitor.get(icon)).status(), icon).toBe(200)

      await expect(head.locator('meta[property="og:site_name"]'), path).toHaveAttribute(
        'content',
        SITE.name,
      )
      expect(
        new URL(
          (await head.locator('meta[property="og:image"]').first().getAttribute('content')) ?? '',
        ).pathname,
        path,
      ).toBe('/og.png')

      // play.critterconnect.org's own pair: n1 in each mode.
      for (const [scheme, colour] of [
        ['light', '#ffffff'],
        ['dark', '#051411'],
      ]) {
        await expect(
          head.locator(`meta[name="theme-color"][media="(prefers-color-scheme: ${scheme})"]`),
          `${path} ${scheme}`,
        ).toHaveAttribute('content', colour)
      }
    })
  }
})

test('X5 the titles: the game names its own pages, the site names the rest', async ({
  api,
  page,
  uniqueSlug,
  world,
}) => {
  const other = await createProject(api('superAdmin'), world.tenants.A.id, uniqueSlug('x5'), {
    name: 'Tidewater Isles',
  })
  const paths = portalPaths(other.slug)

  for (const [path, title] of [
    [paths.hub, other.name],
    [paths.updates, `${other.name} updates`],
    [paths.contact, `Contact the ${other.name} team`],
    ['/legal/terms', `Terms of Service | ${SITE.name}`],
  ]) {
    await page.goto(path)
    await expect(page, path).toHaveTitle(title)
  }

  for (const path of ['/admin/login', `/g/${uniqueSlug('x5-missing')}`]) {
    await page.goto(path)
    await expect(page, path).toHaveTitle(new RegExp(`. \\| ${SITE.name}$`))
  }
})
