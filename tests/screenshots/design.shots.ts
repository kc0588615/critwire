import path from 'node:path'

import { type APIRequestContext, expect, type Page, test } from '@playwright/test'

import type { GamePage } from '../../src/payload-types'
import type { SiteThemeV1 } from '../../src/site-templates/flagship-game-v1/schema/theme'
import { RestClient } from '../e2e/support/api'
import { BASE_URL } from '../e2e/support/env'
import { newRequestContext } from '../e2e/support/fixtures'
import {
  GROUP_LABELS,
  type Group,
  selectedGroups,
  type Shot,
  shotFile,
  shotsFor,
  shotsTarget,
  type ShotsWorld,
} from './catalog'
import { probeMarketingFocus, probePage, recordChecks } from './probes'
import { readWorld, reloadUntil, rootStyle, rootToken, SHOTS_CRON_SECRET } from './support'
import { DEFAULT_THEME, RISO_THEME } from './themes'

const { set, dir } = shotsTarget()

const THEMES: Record<'default' | 'riso', SiteThemeV1> = { default: DEFAULT_THEME, riso: RISO_THEME }

/** Publishes `group`'s theme on the Critter Connect landing and waits until the landing renders it. */
async function applyTheme(
  group: Exclude<Group, 'marketing'>,
  world: ShotsWorld,
  request: APIRequestContext,
  page: Page,
): Promise<void> {
  const landing = `/g/${world.cc.slug}`
  if (group === 'critter-connect') {
    const response = await request.post('/api/seed/critter-connect', {
      headers: { Authorization: `Bearer ${SHOTS_CRON_SECRET}` },
    })
    expect(response.status(), await response.text()).toBe(200)
    await reloadUntil(page, landing, rootStyle, world.cc.baselineStyle, 'the landing never showed the seeded theme')
    return
  }
  const theme = THEMES[group]
  const admin = new RestClient(request, world.superToken)
  const current = await admin.findByID('game-pages', world.cc.landingID, { depth: 0 })
  expect(current.status).toBe(200)
  const { status, body } = await admin.update('game-pages', world.cc.landingID, {
    site: { ...current.body.site, theme },
    _status: 'published',
  } as Partial<GamePage>)
  expect(status, JSON.stringify(body)).toBe(200)
  await reloadUntil(
    page,
    landing,
    (p) => rootToken(p, '--fs-bg'),
    theme.colors.background,
    `the landing never showed the ${group} theme`,
  )
}

for (const group of selectedGroups()) {
  test.describe(GROUP_LABELS[group], () => {
    test.describe.configure({ timeout: 120_000 })

    let world: ShotsWorld
    /** The landing's `.fs-root` style under this group's theme; every themed page must match it. */
    let groupStyle: null | string = null

    test.beforeAll(async ({ browser, playwright }) => {
      world = await readWorld()
      if (group === 'marketing') return
      const page = await browser.newPage({ baseURL: BASE_URL })
      const request = await newRequestContext(playwright)
      await applyTheme(group, world, request, page)
      groupStyle = await rootStyle(page)
      await request.dispose()
      await page.close()
    })

    for (const shot of shotsFor(group)) {
      test(shot.label, async ({ page }) => {
        const url = shot.path(world)
        const requests: string[] = []
        page.on('request', (request) => requests.push(request.url()))
        await page.goto(url)
        // Ops pages are ISR-cached: wait until each one wears the group's theme.
        // Pages without a `.fs-root` (the ops pages before the redesign) have none to wait for.
        if (shot.themed && groupStyle !== null && (await rootStyle(page)) !== null) {
          await reloadUntil(page, url, rootStyle, groupStyle, `${url} never showed the ${group} theme`)
        }
        await settle(page)
        await showFocus(page, shot)
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

async function showFocus(page: Page, shot: Shot): Promise<void> {
  if (shot.focus === 'report-title') {
    await page.getByLabel('Title').focus()
  } else if (shot.focus === 'hero-cta') {
    const onCTA = () => page.evaluate(() => document.activeElement?.matches('.fs-hero .fs-btn-primary') ?? false)
    for (let presses = 0; presses < 40 && !(await onCTA()); presses++) await page.keyboard.press('Tab')
    expect(await onCTA(), 'Tab never reached the hero’s primary button').toBe(true)
  }
}
