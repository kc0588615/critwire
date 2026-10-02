import type { ConsoleMessage, FrameLocator, Page } from '@playwright/test'

import type { GameProject, Issue, PatchNote } from '../../src/payload-types'
import { EMBED_CACHE_CONTROL, LOADER_CACHE_CONTROL } from '../../src/lib/embed/cacheControl'
import { LOADER_PATH } from '../../src/lib/embed/snippets'
import { embedPalettes } from '../../src/lib/embed/theme'
import { hexToRgb } from '../../src/lib/game-portal/contrast'
import { feedbackHref } from '../../src/lib/game-portal/feedbackSearchParams'
import { portalPaths } from '../../src/lib/game-portal/paths'
import { ARCHIVED_STATUSES, PUBLIC_STAGES, type PublicStageId, statusesFor } from '../../src/lib/game-portal/stages'
import { DEFAULT_THEME_COLORS } from '../../src/lib/game-portal/theme'
import { withRef } from '../../src/lib/share/kit'
import { BASE_URL } from './support/env'
import { createIssue, createPatchNote, createProject, expect, newRequestContext, test } from './support/fixtures'

/**
 * The embeds on a studio's page (`embedHost`, on 127.0.0.1, cross-site
 * from the app). Section 12 of the embed plan maps each scenario to the
 * mission's definition of done.
 */

const SELF = "frame-ancestors 'self'"
const ANY = 'frame-ancestors *'

const tagged = (path: string) => withRef(`${BASE_URL}${path}`, 'embed')
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

test('E1.1 the board widget shows true counts, filters in place and links out', async ({
  api,
  context,
  embedHost,
  page,
  uniqueSlug,
  world,
}) => {
  test.setTimeout(120_000)
  const aOwner = api('aOwner')
  const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('embed-board'))
  const paths = portalPaths(project.slug)
  const summary = (n: number) => `Private-looking summary number ${n} of ${project.slug}`
  // Oldest first, all without votes, so the ranked order is newest first.
  const planned: Issue[] = []
  for (let n = 1; n <= 12; n++) {
    planned.push(
      await createIssue(aOwner, project, uniqueSlug(`embed-board-planned-${n}`), {
        title: `Planned item ${n}`,
        summary: summary(n),
        status: 'PLANNED',
        type: n <= 8 ? 'BUG' : 'IDEA',
      }),
    )
  }
  const shipped = await createIssue(aOwner, project, uniqueSlug('embed-board-shipped'), {
    title: 'Shipped idea',
    summary: summary(13),
    status: 'FIXED',
    type: 'IDEA',
  })
  const newest = planned[11]
  const frame = page.frameLocator('iframe')
  const stageFilter = frame.getByRole('group', { name: 'Stage' })
  const typeFilter = frame.getByRole('group', { name: 'Type' })
  const rows = frame.locator('.cw-embed-rows > li')

  /** The public items of a stage (or all) and type, counted through REST as a visitor. */
  const restCount = async (stage: null | PublicStageId, type?: 'BUG' | 'IDEA') => {
    const { status, body } = await api('anonymous').find('issues', {
      limit: 1,
      where: {
        and: [
          { gameProject: { equals: project.id } },
          { isPublic: { equals: true } },
          stage ? { status: { in: statusesFor(stage) } } : { status: { not_in: ARCHIVED_STATUSES } },
          ...(type ? [{ type: { equals: type } }] : []),
        ],
      },
    })
    expect(status).toBe(200)
    return body.totalDocs
  }

  await test.step('through the script: the board renders and its frame fits its content', async () => {
    await page.goto(embedHost.url({ game: project.slug, widget: 'board' }))
    await expect(frame.getByRole('heading', { level: 1, name: 'Feedback' })).toBeVisible()
    await expect(rows).toHaveCount(10)
    // Ranked: no votes anywhere, so newest first, the shipped item included.
    await expect(rows.nth(0)).toContainText(shipped.title)
    await expect(rows.nth(1)).toContainText(newest.title)
    await expect
      .poll(async () => {
        const { content, frame } = await frameHeights(page)
        return Math.abs(frame - content)
      })
      .toBeLessThanOrEqual(1)
  })

  await test.step('each stage’s count matches REST, and "See all" the true total (W1)', async () => {
    await expect(stageFilter.getByRole('button', { name: `All ${await restCount(null)}` })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    for (const stage of PUBLIC_STAGES) {
      await expect(stageFilter.getByRole('button', { name: `${stage.label} ${await restCount(stage.id)}` })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    }
    await expect(frame.getByRole('link', { name: 'See all 13' })).toHaveAttribute('href', tagged(paths.feedback))
  })

  await test.step('the frame’s HTML and data hold no item’s summary (W2)', async () => {
    const embedURL = page.frames().find((f) => f.url().includes('/embed/board'))!.url()
    const response = await page.request.get(embedURL)
    expect(response.status()).toBe(200)
    const html = await response.text()
    expect(html).toContain(newest.title)
    // The RSC payload carries every view: the shipped item is in one even though the first view leaves it out.
    expect(html).toContain(shipped.title)
    for (let n = 1; n <= 13; n++) expect(html).not.toContain(summary(n))
  })

  await test.step('filters switch views in place: no request, no URL change, no history entry (W3)', async () => {
    await page.waitForLoadState('networkidle')
    const requests: string[] = []
    page.on('request', (request) => requests.push(request.url()))
    const historyLength = await page.evaluate(() => window.history.length)
    const embedURL = page.frames().find((f) => f.url().includes('/embed/board'))!.url()

    await stageFilter.getByRole('button', { name: /^Planned / }).click()
    await expect(stageFilter.getByRole('button', { name: 'Planned 12' })).toHaveAttribute('aria-pressed', 'true')
    await expect(rows).toHaveCount(10)
    await expect(frame.getByRole('link', { name: 'See all 12' })).toHaveAttribute(
      'href',
      tagged(feedbackHref(paths.feedback, { stage: 'planned' })),
    )

    await typeFilter.getByRole('button', { name: 'Ideas' }).click()
    await expect(typeFilter.getByRole('button', { name: 'Ideas' })).toHaveAttribute('aria-pressed', 'true')
    // The stage counts follow the type.
    await expect(stageFilter.getByRole('button', { name: 'All 5' })).toBeVisible()
    await expect(stageFilter.getByRole('button', { name: 'Planned 4' })).toBeVisible()
    await expect(rows).toHaveCount(4)
    await expect(frame.getByRole('link', { name: /^See all/ })).toHaveCount(0)

    await typeFilter.getByRole('button', { name: 'Bugs' }).click()
    await expect(stageFilter.getByRole('button', { name: 'Planned 8' })).toBeVisible()
    await expect(stageFilter.getByRole('button', { name: 'Shipped 0' })).toBeVisible()
    await expect(rows).toHaveCount(8)

    await stageFilter.getByRole('button', { name: 'Under review 0' }).click()
    await expect(frame.getByText('Nothing here yet.')).toBeVisible()
    await typeFilter.getByRole('button', { name: 'All', exact: true }).click()

    expect(requests).toEqual([])
    expect(await page.evaluate(() => window.history.length)).toBe(historyLength)
    expect(page.frames().some((f) => f.url() === embedURL)).toBe(true)
  })

  await test.step('Shipped shows its item, and the frame shrinks to fit (R1)', async () => {
    await stageFilter.getByRole('button', { name: 'Planned 12' }).click()
    await expect(rows).toHaveCount(10)
    await expect
      .poll(async () => {
        const { content, frame } = await frameHeights(page)
        return Math.abs(frame - content)
      })
      .toBeLessThanOrEqual(1)
    const tall = (await frameHeights(page)).frame

    await stageFilter.getByRole('button', { name: 'Shipped 1' }).click()
    await expect(rows).toHaveCount(1)
    await expect(rows.first()).toContainText('Shipped idea')
    await expect(rows.first()).toContainText('Shipped')
    await expect
      .poll(async () => {
        const { content, frame } = await frameHeights(page)
        return frame < tall - 200 && Math.abs(frame - content) <= 1
      })
      .toBe(true)
  })

  await test.step('"See all 12" opens the portal list with 12 items', async () => {
    await stageFilter.getByRole('button', { name: 'Planned 12' }).click()
    const opened = context.waitForEvent('page')
    await frame.getByRole('link', { name: 'See all 12' }).click()
    const portal = await opened
    await portal.waitForLoadState()
    expect(new URL(portal.url()).searchParams.get('ref')).toBe('embed')
    await expect(portal.locator('.fs-issue-item')).toHaveCount(12)
    await portal.close()
  })

  await test.step('links open the portal in a new tab, with ref=embed (W5)', async () => {
    await page.waitForLoadState('networkidle')
    const embedURL = page.frames().find((f) => f.url().includes('/embed/board'))!.url()
    const portalRequests: string[] = []
    page.on('request', (request) => {
      if (new URL(request.url()).pathname.startsWith('/g/')) portalRequests.push(request.url())
    })

    await expect(frame.getByRole('link', { name: 'Report a bug' })).toHaveAttribute('href', tagged(paths.newFeedback('bug')))
    await expect(frame.getByRole('link', { name: 'Suggest an idea' })).toHaveAttribute(
      'href',
      tagged(paths.newFeedback('idea')),
    )
    // S8 turns the vote link into a popup; until then it is the item page.
    await expect(frame.getByRole('link', { name: `Vote for ${newest.title}, 0 votes` })).toHaveAttribute(
      'href',
      tagged(paths.feedbackItem(newest.slug)),
    )

    const opened = context.waitForEvent('page')
    await frame.getByRole('link', { name: newest.title, exact: true }).click()
    const portal = await opened
    await portal.waitForLoadState()
    expect(portal.url()).toBe(tagged(paths.feedbackItem(newest.slug)))
    await expect(portal.getByRole('heading', { level: 1 })).toHaveText(newest.title)
    await portal.close()

    expect(page.frames().some((f) => f.url() === embedURL)).toBe(true)
    expect(portalRequests).toEqual([])
  })

  await test.step('the snippet’s stage and type set the first view', async () => {
    await page.goto(embedHost.url({ game: project.slug, widget: 'board', stage: 'planned', type: 'idea' }))
    await expect(stageFilter.getByRole('button', { name: 'Planned 4' })).toHaveAttribute('aria-pressed', 'true')
    await expect(typeFilter.getByRole('button', { name: 'Ideas' })).toHaveAttribute('aria-pressed', 'true')
    await expect(rows).toHaveCount(4)
  })

  await test.step('a stage holding &, # and / reaches the frame encoded, and the board shows All (R3)', async () => {
    const stage = 'planned&type=idea#top/x'
    await page.goto(embedHost.url({ game: project.slug, widget: 'board', stage }))
    await expect(stageFilter.getByRole('button', { name: 'All 13' })).toHaveAttribute('aria-pressed', 'true')
    await expect(typeFilter.getByRole('button', { name: 'All', exact: true })).toHaveAttribute('aria-pressed', 'true')
    const src = new URL(await page.locator('iframe').getAttribute('src').then((value) => value!))
    expect(src.searchParams.get('stage')).toBe(stage)
    expect(src.searchParams.get('type')).toBeNull()
  })

  await test.step('a game that takes bugs only offers no ideas, and an empty board says so (W4)', async () => {
    const bugsOnly = await createProject(aOwner, world.tenants.A.id, uniqueSlug('embed-board-bugs'), {
      reportForm: { provider: 'native', acceptIdeas: false },
    })
    await page.goto(embedHost.url({ game: bugsOnly.slug, widget: 'board', kind: 'iframe', type: 'idea' }))
    await expect(frame.getByText('No feedback yet.')).toBeVisible()
    await expect(frame.getByRole('link', { name: 'Report a bug' })).toHaveAttribute(
      'href',
      tagged(portalPaths(bugsOnly.slug).newFeedback('bug')),
    )
    await expect(frame.getByRole('link', { name: 'Suggest an idea' })).toHaveCount(0)

    await createIssue(aOwner, bugsOnly, uniqueSlug('embed-board-bugs-item'), { title: 'Only a bug' })
    // A new context: the browser may keep the empty board for 60 s.
    const fresh = await page.context().browser()!.newContext()
    try {
      const again = await fresh.newPage()
      await again.goto(embedHost.url({ game: bugsOnly.slug, widget: 'board', kind: 'iframe', type: 'idea' }))
      const board = again.frameLocator('iframe')
      await expect(board.locator('.cw-embed-rows > li')).toHaveCount(1)
      await expect(board.getByRole('group', { name: 'Type' }).getByRole('button')).toHaveText(['All', 'Bugs'])
      await expect(board.getByRole('group', { name: 'Type' }).getByRole('button', { name: 'All', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    } finally {
      await fresh.close()
    }
  })
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
    await test.step('both embeds, and an unknown game’s empty ones: frame-ancestors * and the cache header', async () => {
      const unknown = portalPaths(uniqueSlug('embed-no-such-game'))
      for (const path of [paths.embed('board'), paths.embed('updates'), unknown.embed('board'), unknown.embed('updates')]) {
        const response = await player.get(path, { maxRedirects: 0 })
        expect(response.status(), path).toBe(200)
        expect(response.headers()['content-security-policy'], path).toBe(ANY)
        expect(response.headers()['cache-control'], path).toBe(EMBED_CACHE_CONTROL)
      }
    })

    await test.step('both feeds, and an unknown game’s 404s: CORS and the cache header (K1)', async () => {
      const unknown = portalPaths(uniqueSlug('embed-no-such-game'))
      for (const [path, status] of [
        [paths.feedbackJSON, 200],
        [paths.updatesJSON, 200],
        [unknown.feedbackJSON, 404],
        [unknown.updatesJSON, 404],
      ] as const) {
        const response = await player.get(path, { maxRedirects: 0 })
        expect(response.status(), path).toBe(status)
        expect(response.headers()['access-control-allow-origin'], path).toBe('*')
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
