import path from 'node:path'

import { type APIRequestContext, expect, type Page, test } from '@playwright/test'

import type { SiteThemeV1 } from '../../src/lib/game-portal/theme'
import { RestClient } from '../e2e/support/api'
import { type EmbedHost, frameHeights, startEmbedHost } from '../e2e/support/embedHost'
import { BASE_URL } from '../e2e/support/env'
import { newRequestContext } from '../e2e/support/fixtures'
import {
  GROUP_LABELS,
  isPortalGroup,
  type PortalGroup,
  selectedGroups,
  SESSION_STATE_PATHS,
  type Shot,
  shotFile,
  shotsFor,
  shotsTarget,
  type ShotsWorld,
} from './catalog'
import { FOCUS_PAGES, probePage, probeSiteFocus, recordChecks } from './probes'
import { computedRgb, readWorld, reloadUntil, rootBackground, rootStyle, SHOTS_CRON_SECRET } from './support'
import { RISO_THEME } from './themes'

const { set, dir } = shotsTarget()

const THEMES: Record<'riso', SiteThemeV1> = { riso: RISO_THEME }

/** Sets `group`'s theme on the Critter Connect project and waits until its hub renders it. */
async function applyTheme(
  group: PortalGroup,
  world: ShotsWorld,
  request: APIRequestContext,
  page: Page,
): Promise<void> {
  const hub = `/g/${world.cc.slug}`
  if (group === 'critter-connect') {
    const response = await request.post('/api/seed/critter-connect', {
      headers: { Authorization: `Bearer ${SHOTS_CRON_SECRET}` },
    })
    expect(response.status(), await response.text()).toBe(200)
    await reloadUntil(page, hub, rootStyle, world.cc.baselineStyle, 'the hub never showed the seeded theme')
    return
  }
  const theme = THEMES[group]
  const admin = new RestClient(request, world.superToken)
  // The key art comes with Riso, so its shots cover the art-and-plate header; the seed clears it again.
  const { status, body } = await admin.update('game-projects', world.cc.projectID, { theme, banner: world.cc.keyArtID })
  expect(status, JSON.stringify(body)).toBe(200)
  await reloadUntil(
    page,
    hub,
    rootBackground,
    computedRgb(theme.colors.background),
    `the hub never showed the ${group} theme`,
  )
}

for (const group of selectedGroups()) {
  test.describe(GROUP_LABELS[group], () => {
    test.describe.configure({ timeout: 120_000 })

    let world: ShotsWorld
    /** The hub's `.fs-root` style under this group's theme; every themed page must match it. */
    let groupStyle: null | string = null
    /** The studio's page that `host` shots load, on another site than the app. */
    let host: EmbedHost | null = null

    test.beforeAll(async ({ browser, playwright }) => {
      world = await readWorld()
      if (group === 'embed') host = await startEmbedHost(BASE_URL)
      // `reach` shows the Critter Connect badge and `embed` its widgets, which the riso group may have left in its theme.
      if (!isPortalGroup(group) && group !== 'reach' && group !== 'embed') return
      const page = await browser.newPage({ baseURL: BASE_URL })
      const request = await newRequestContext(playwright)
      await applyTheme(isPortalGroup(group) ? group : 'critter-connect', world, request, page)
      if (isPortalGroup(group)) groupStyle = await rootStyle(page)
      await request.dispose()
      await page.close()
    })

    test.afterAll(async () => {
      await host?.close()
    })

    const capture = (shot: Shot): void => {
      test(shot.label, async ({ context, page }) => {
        const requests: string[] = []
        page.on('request', (request) => requests.push(request.url()))
        if (shot.adminTheme) {
          await context.addCookies([{ name: 'payload-theme', value: shot.adminTheme, url: BASE_URL }])
        }
        if (shot.scheme) await page.emulateMedia({ colorScheme: shot.scheme })
        if (shot.html) {
          await page.setContent(shot.html(world, BASE_URL))
        } else if (shot.host) {
          if (!host) throw new Error(`${shot.id}: the ${group} group started no embed host`)
          await page.goto(host.url(shot.host(world)))
        } else {
          const url = shot.path(world)
          await page.goto(url)
          // Portal pages are ISR-cached: wait until each one wears the group's theme.
          if (groupStyle !== null) {
            await reloadUntil(page, url, rootStyle, groupStyle, `${url} never showed the ${group} theme`)
          }
        }
        if (shot.click) await page.getByRole('button', { name: shot.click }).click()
        if (shot.tab) {
          const tab = page.getByRole('tab', { name: shot.tab })
          await tab.click()
          await expect(tab).toHaveAttribute('aria-selected', 'true')
        }
        if (shot.ready) await expect(page.locator(shot.ready)).toBeVisible()
        // A redirect would capture another page under this one's name (the legal gate's, for one).
        if (shot.path) expect(new URL(page.url()).pathname, 'the page redirected').toBe(new URL(shot.path(world), BASE_URL).pathname)
        if (shot.host) await embedShown(page)
        if (shot.adminTheme) await expect(page.locator('html')).toHaveAttribute('data-theme', shot.adminTheme)
        await settle(page)
        if (shot.html) {
          // `settle` ignores decode failures; a host page's images are the subject, so a broken one fails.
          const broken = await page.evaluate(() =>
            [...document.images].filter((image) => image.naturalWidth === 0).map((image) => image.src),
          )
          expect(broken, 'images that failed to load').toEqual([])
        }
        const width = page.viewportSize()?.width
        if (!width) throw new Error('the project has no viewport')
        const file = shotFile(group, shot.id, width)
        const probes = set === 'after' ? await probePage(page, { group, shot, width, requests }) : []
        await page.screenshot({ path: path.join(dir, set, file), fullPage: true, animations: 'disabled' })
        if (set !== 'after') return
        if (FOCUS_PAGES.has(shot.id)) probes.push(await probeSiteFocus(page))
        await recordChecks(dir, file, probes)
        for (const probe of probes) expect.soft(probe.pass, `${probe.probe}: ${probe.detail}`).toBe(true)
      })
    }

    for (const shot of shotsFor(group)) {
      const { session } = shot
      if (!session) {
        capture(shot)
        continue
      }
      test.describe(() => {
        // Read when the test's context opens, after the setup project wrote it.
        test.use({ storageState: SESSION_STATE_PATHS[session] })
        capture(shot)
      })
    }
  })
}

/**
 * Waits until the widget's frame, when the page has one, shows its
 * heading and, inline, has resized to its content. The dialog's frame
 * keeps its fixed height and scrolls.
 */
async function embedShown(page: Page): Promise<void> {
  const frame = page.locator('iframe')
  if (!(await frame.count())) return
  await expect(frame.contentFrame().getByRole('heading', { level: 1 })).toBeVisible()
  if (await page.locator('dialog iframe').count()) return
  await expect
    .poll(async () => {
      const { content, frame } = await frameHeights(page)
      return Math.abs(content - frame)
    }, { message: 'the frame never resized to its content' })
    .toBeLessThanOrEqual(1)
}

/**
 * Loads every image (lazy ones included, for full-page captures), the
 * Turnstile widget where a form has one, and the fonts. Not `networkidle`:
 * Turnstile keeps the network busy.
 */
async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('load')
  await page.evaluate(async () => {
    const images = [...document.images]
    for (const image of images) image.loading = 'eager'
    await Promise.all(images.map((image) => image.decode().catch(() => undefined)))
  })
  if (await page.locator('.cf-turnstile').count()) {
    // The always-pass test key fills the token once the widget has rendered.
    await expect(page.locator('input[name="cf-turnstile-response"]')).toHaveValue(/.+/, { timeout: 20_000 })
  }
  await page.evaluate(() => document.fonts.ready.then(() => undefined))
}
