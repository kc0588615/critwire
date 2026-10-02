import type { ConsoleMessage, FrameLocator, Page } from '@playwright/test'

import type { GameProject, PatchNote } from '../../src/payload-types'
import { EMBED_CACHE_CONTROL, LOADER_CACHE_CONTROL } from '../../src/lib/embed/cacheControl'
import { LOADER_PATH } from '../../src/lib/embed/snippets'
import { embedPalettes } from '../../src/lib/embed/theme'
import { hexToRgb } from '../../src/lib/game-portal/contrast'
import { portalPaths } from '../../src/lib/game-portal/paths'
import { DEFAULT_THEME_COLORS } from '../../src/lib/game-portal/theme'
import { BASE_URL } from './support/env'
import { createIssue, createPatchNote, createProject, expect, newRequestContext, test } from './support/fixtures'

/**
 * The embeds on a studio's page (`embedHost`, on 127.0.0.1, cross-site
 * from the app). Section 12 of the embed plan maps each scenario to the
 * mission's definition of done.
 */

const SELF = "frame-ancestors 'self'"
const ANY = 'frame-ancestors *'

const tagged = (path: string) => `${BASE_URL}${path}?ref=embed`
const rgb = (hex: string) => `rgb(${hexToRgb(hex).join(', ')})`
const day = (n: number) => new Date(Date.UTC(2026, 0, n)).toISOString()

/** The frame's `.cw-embed` background, as the browser computes it. */
const embedBackground = (page: Page) =>
  page
    .frameLocator('iframe')
    .locator('.cw-embed')
    .evaluate((element) => getComputedStyle(element).backgroundColor)

/** The `.cw-embed` font, framed (a `FrameLocator`) or opened directly (a `Page`). */
const embedFont = (root: FrameLocator | Page) =>
  root.locator('.cw-embed').evaluate((element) => getComputedStyle(element).fontFamily)

/** The frame's height on the host page, and the height of the content inside it. */
const frameHeights = async (page: Page) => ({
  frame: await page.locator('iframe').evaluate((element) => element.getBoundingClientRect().height),
  content: await page
    .frameLocator('iframe')
    .locator('.cw-embed-frame')
    .evaluate((element) => element.getBoundingClientRect().height),
})

test('E1.2 the updates widget shows the newest updates and links out', async ({
  api,
  context,
  embedHost,
  page,
  uniqueSlug,
  world,
}) => {
  const aOwner = api('aOwner')
  const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('embed-updates'))
  const paths = portalPaths(project.slug)
  const update = (n: number, data: Partial<PatchNote> = {}) =>
    createPatchNote(aOwner, project, uniqueSlug(`embed-updates-${n}`), {
      title: `Update ${n}`,
      publishedAt: day(n),
      ...data,
    })
  await update(1, { title: 'The oldest update' })
  await update(2)
  await update(3)
  const newest = await update(4, { title: 'Harbor hotfix', versionLabel: 'v1.4', summary: 'Fixes the harbor.' })
  for (let n = 1; n <= 6; n++) {
    await createIssue(aOwner, project, uniqueSlug(`embed-updates-shipped-${n}`), {
      title: `Shipped item ${n}`,
      status: 'FIXED',
      fixedInPatchNote: newest.id,
    })
  }
  const frame = page.frameLocator('iframe')

  await test.step('the three newest updates', async () => {
    await page.goto(embedHost.url({ game: project.slug, widget: 'updates', kind: 'iframe' }))
    await expect(frame.getByRole('heading', { level: 2 })).toHaveText(['Harbor hotfix', 'Update 3', 'Update 2'])
    await expect(frame.getByText('Fixes the harbor.')).toBeVisible()
    await expect(frame.getByText('The oldest update')).toHaveCount(0)
  })

  await test.step('an update with 6 shipped items shows 5, then "More in this update"', async () => {
    const harbor = frame.getByRole('article').filter({ hasText: 'Harbor hotfix' })
    await expect(harbor.getByRole('heading', { name: 'From your feedback' })).toBeVisible()
    // Most voted, then newest: all have 0 votes, so the first one created is left out.
    await expect(harbor.getByRole('listitem')).toHaveCount(5)
    await expect(harbor.getByText('Shipped item 1')).toHaveCount(0)
    await expect(harbor.getByRole('link', { name: 'More in this update' })).toHaveAttribute(
      'href',
      tagged(paths.update(newest.slug)),
    )
  })

  await test.step('links open the portal in a new tab, with ref=embed (W5)', async () => {
    const embedURL = page.frames().find((f) => f.url().includes('/embed/updates'))?.url()
    expect(embedURL).toBeDefined()
    await page.waitForLoadState('networkidle')
    const portalRequests: string[] = []
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/g/')) portalRequests.push(request.url())
    })

    const opened = context.waitForEvent('page')
    await frame.getByRole('link', { name: 'Harbor hotfix' }).click()
    const portal = await opened
    await portal.waitForLoadState()
    expect(portal.url()).toBe(tagged(paths.update(newest.slug)))
    await expect(portal.getByRole('heading', { level: 1 })).toHaveText('Harbor hotfix')
    await portal.close()

    // The frame stayed where it was, and requested no portal page.
    expect(page.frames().some((f) => f.url() === embedURL)).toBe(true)
    expect(portalRequests).toEqual([])
    await expect(frame.getByRole('link', { name: 'All updates' })).toHaveAttribute('href', tagged(paths.updates))
    await expect(frame.getByRole('link', { name: 'RSS' })).toHaveAttribute('href', `${BASE_URL}${paths.rss}`)
  })

  await test.step('no portal nav or footer, and noindex', async () => {
    await expect(frame.getByRole('navigation')).toHaveCount(0)
    await expect(frame.locator('footer')).toHaveCount(0)
    await expect(frame.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  })

  await test.step('through the script: the frame sits right after it and fits its content', async () => {
    await page.goto(embedHost.url({ game: project.slug, widget: 'updates' }))
    await expect(frame.getByRole('heading', { level: 2 })).toHaveText(['Harbor hotfix', 'Update 3', 'Update 2'])
    const next = await page.evaluate(
      (src) => document.querySelector(`script[src$="${src}"]`)?.nextElementSibling?.tagName,
      LOADER_PATH,
    )
    expect(next).toBe('IFRAME')
    await expect
      .poll(async () => {
        const { content, frame } = await frameHeights(page)
        return Math.abs(frame - content)
      })
      .toBeLessThanOrEqual(1)
    // The loader's placeholder height, before the first resize message.
    expect((await frameHeights(page)).frame).not.toBe(400)
  })

  await test.step('a resize message from anywhere but its own frame changes nothing (R2)', async () => {
    const before = (await frameHeights(page)).frame
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          // Messages to one window arrive in order: once the marker does, the loader has seen the forgery.
          window.addEventListener('message', (event) => {
            if (event.data === 'after-forgery') resolve()
          })
          window.postMessage({ critwire: 1, type: 'resize', height: 37 }, '*')
          window.postMessage('after-forgery', '*')
        }),
    )
    expect((await frameHeights(page)).frame).toBe(before)
  })

  await test.step('a snippet without data-game logs one error, adds no frame and breaks nothing (R6)', async () => {
    const loaderErrors: string[] = []
    const uncaught: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error' && message.location().url.endsWith(LOADER_PATH)) loaderErrors.push(message.text())
    })
    page.on('pageerror', (error) => uncaught.push(error.message))
    // `goto` waits for `load`, which waits for the async loader to run.
    await page.goto(embedHost.url({ game: project.slug, widget: 'updates', kind: 'no-game' }))
    expect(loaderErrors).toEqual([expect.stringContaining('data-game')])
    expect(uncaught).toEqual([])
    await expect(page.locator('iframe')).toHaveCount(0)
    await expect(page.getByRole('heading', { name: 'Studio site' })).toBeVisible()
  })

  await test.step('"No updates yet" for a game that has none', async () => {
    const quiet = await createProject(aOwner, world.tenants.A.id, uniqueSlug('embed-updates-none'))
    await page.goto(embedHost.url({ game: quiet.slug, widget: 'updates', kind: 'iframe' }))
    await expect(frame.getByText('No updates yet.')).toBeVisible()
  })
})

test('E3 light, dark and auto give the predicted palettes, with no font or image', async ({
  api,
  embedHost,
  page,
  uniqueSlug,
  world,
}) => {
  const project = await createProject(api('aOwner'), world.tenants.A.id, uniqueSlug('embed-theme'))
  const { dark, light } = embedPalettes(DEFAULT_THEME_COLORS)
  const downloads: string[] = []
  page.on('request', (request) => {
    if (['font', 'image'].includes(request.resourceType())) downloads.push(request.url())
  })

  const cases = [
    { theme: 'light', system: 'dark', palette: light },
    { theme: 'dark', system: 'light', palette: dark },
    { theme: 'auto', system: 'light', palette: light },
    { theme: 'auto', system: 'dark', palette: dark },
  ] as const
  for (const { palette, system, theme } of cases) {
    await test.step(`${theme} on a ${system} system`, async () => {
      await page.emulateMedia({ colorScheme: system })
      await page.goto(embedHost.url({ game: project.slug, widget: 'updates', theme, kind: 'iframe' }))
      await expect(page.frameLocator('iframe').getByRole('heading', { name: 'Updates' })).toBeVisible()
      await expect.poll(() => embedBackground(page)).toBe(rgb(palette.background))
    })
  }

  await test.step('through the script, the frame uses the host page’s font, which never leaves the browser (R4)', async () => {
    const embedRequests: string[] = []
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.includes('/embed/updates')) embedRequests.push(request.url())
    })
    await page.goto(embedHost.url({ game: project.slug, widget: 'updates' }))
    await expect.poll(() => embedFont(page.frameLocator('iframe'))).toBe('Georgia, serif')
    expect(embedRequests.length).toBeGreaterThan(0)
    for (const url of embedRequests) expect(url).not.toMatch(/font|georgia/i)
  })

  await test.step('a crafted or overlong font is ignored (R5)', async () => {
    const opened = async (font: string) => {
      // A new document each time: a change of fragment alone wouldn't rerun the boot script.
      await page.goto('about:blank')
      await page.goto(`${BASE_URL}${portalPaths(project.slug).embed('updates')}?theme=light#font=${encodeURIComponent(font)}`)
      await expect(page.getByRole('heading', { name: 'Updates' })).toBeVisible()
      return embedFont(page)
    }
    // The control: a valid font applies when opened directly too.
    expect(await opened('Georgia, serif')).toBe('Georgia, serif')
    for (const font of ['Georgia; } body { background: red', 'x, serif; color: red', `"${'x'.repeat(200)}", serif`]) {
      expect(await opened(font), font).toBe('system-ui, sans-serif')
    }
  })

  await test.step('the frame requests no image and no font file (R8)', async () => {
    await page.waitForLoadState('networkidle')
    expect(downloads).toEqual([])
  })
})

test('E7 the embeds may be framed anywhere; the portal only by itself', async ({
  api,
  embedHost,
  page,
  playwright,
  uniqueSlug,
  world,
}) => {
  const aOwner = api('aOwner')
  const project: GameProject = await createProject(aOwner, world.tenants.A.id, uniqueSlug('embed-frame'))
  const paths = portalPaths(project.slug)
  const note = await createPatchNote(aOwner, project, uniqueSlug('embed-frame-update'))
  const issue = await createIssue(aOwner, project, uniqueSlug('embed-frame-item'))
  const player = await newRequestContext(playwright)

  try {
    await test.step('the updates embed and an unknown game’s empty embed: frame-ancestors * and the cache header', async () => {
      for (const path of [paths.embed('updates'), portalPaths(uniqueSlug('embed-no-such-game')).embed('updates')]) {
        const response = await player.get(path, { maxRedirects: 0 })
        expect(response.status(), path).toBe(200)
        expect(response.headers()['content-security-policy'], path).toBe(ANY)
        expect(response.headers()['cache-control'], path).toBe(EMBED_CACHE_CONTROL)
      }
    })

    await test.step('the loader is long-cached, as a versioned contract', async () => {
      const response = await player.get(LOADER_PATH)
      expect(response.status()).toBe(200)
      expect(response.headers()['content-type']).toMatch(/javascript/)
      expect(response.headers()['cache-control']).toBe(LOADER_CACHE_CONTROL)
    })

    await test.step('the host page frames the embed with no violation', async () => {
      const violations: string[] = []
      page.on('console', (message: ConsoleMessage) => {
        if (message.text().includes('frame-ancestors')) violations.push(message.text())
      })
      await page.goto(embedHost.url({ game: project.slug, widget: 'updates', kind: 'iframe' }))
      await expect(page.frameLocator('iframe').getByRole('heading', { name: 'Updates' })).toBeVisible()
      expect(violations).toEqual([])
    })

    await test.step('the hub, the board, an item page, an update page and the admin keep self', async () => {
      for (const path of [
        paths.hub,
        paths.board,
        paths.feedbackItem(issue.slug),
        paths.update(note.slug),
        '/admin/login',
      ]) {
        const response = await player.get(path, { maxRedirects: 0 })
        expect(response.status(), path).toBe(200)
        expect(response.headers()['content-security-policy'], path).toBe(SELF)
      }
    })
  } finally {
    await player.dispose()
  }
})
