import path from 'node:path'

import { type APIRequestContext, expect, type Page, test } from '@playwright/test'

import type { SiteThemeV1 } from '../../src/lib/game-portal/theme'
import { RestClient } from '../e2e/support/api'
import { BASE_URL } from '../e2e/support/env'
import { newRequestContext } from '../e2e/support/fixtures'
import {
  GROUP_LABELS,
  isPortalGroup,
  ONBOARDING_STATE_PATH,
  type PortalGroup,
  selectedGroups,
  type Shot,
  shotFile,
  shotsFor,
  shotsTarget,
  type ShotsWorld,
} from './catalog'
import { probeMarketingFocus, probePage, recordChecks } from './probes'
import { readWorld, reloadUntil, rootStyle, rootToken, SHOTS_CRON_SECRET } from './support'
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
  const { status, body } = await admin.update('game-projects', world.cc.projectID, { theme })
  expect(status, JSON.stringify(body)).toBe(200)
  await reloadUntil(
    page,
    hub,
    (p) => rootToken(p, '--fs-bg'),
    theme.colors.background,
    `the hub never showed the ${group} theme`,
  )
}

for (const group of selectedGroups()) {
  test.describe(GROUP_LABELS[group], () => {
    test.describe.configure({ timeout: 120_000 })

    let world: ShotsWorld
    /** The hub's `.fs-root` style under this group's theme; every themed page must match it. */
    let groupStyle: null | string = null

    test.beforeAll(async ({ browser, playwright }) => {
      world = await readWorld()
      if (!isPortalGroup(group)) return
      const page = await browser.newPage({ baseURL: BASE_URL })
      const request = await newRequestContext(playwright)
      await applyTheme(group, world, request, page)
      groupStyle = await rootStyle(page)
      await request.dispose()
      await page.close()
    })

    const capture = (shot: Shot): void => {
      test(shot.label, async ({ page }) => {
        const url = shot.path(world)
        const requests: string[] = []
        page.on('request', (request) => requests.push(request.url()))
        await page.goto(url)
        // Portal pages are ISR-cached: wait until each one wears the group's theme.
        if (groupStyle !== null) {
          await reloadUntil(page, url, rootStyle, groupStyle, `${url} never showed the ${group} theme`)
        }
        if (shot.ready) await expect(page.locator(shot.ready)).toBeVisible()
        await settle(page)
        const width = page.viewportSize()?.width
        if (!width) throw new Error('the project has no viewport')
        const file = shotFile(group, shot.id, width)
        const probes = set === 'after' ? await probePage(page, { group, shot, width, requests }) : []
        await page.screenshot({ path: path.join(dir, set, file), fullPage: true, animations: 'disabled' })
        if (set !== 'after') return
        if (shot.id === 'home') probes.push(await probeMarketingFocus(page))
        await recordChecks(dir, file, probes)
        for (const probe of probes) expect.soft(probe.pass, `${probe.probe}: ${probe.detail}`).toBe(true)
      })
    }

    for (const shot of shotsFor(group)) {
      if (!shot.signedIn) {
        capture(shot)
        continue
      }
      test.describe(() => {
        // Read when the test's context opens, after the setup project wrote it.
        test.use({ storageState: ONBOARDING_STATE_PATH })
        capture(shot)
      })
    }
  })
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
