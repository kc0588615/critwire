import type { APIRequestContext, Browser, Page, Request } from '@playwright/test'

import type { GameProject } from '../../src/payload-types'
import { gameShareHref } from '../../src/lib/admin/paths'
import { portalPaths } from '../../src/lib/game-portal/paths'
import { BASE_URL, FAKE_UPSTASH_URL, SECOND_BASE_URL, storageStatePath } from './support/env'
import { createProject, expect, newRequestContext, test } from './support/fixtures'

/**
 * "Where players come from": each arrival at a kit link tagged `?ref=` is
 * counted per game, per UTC day and per source, in Upstash only. The
 * endpoint takes JSON only and sends no CORS headers, so other sites
 * can't make visitors' browsers post to it.
 */

const REFERRALS = '/api/referrals'
const THIRTY_FIVE_DAYS = 35 * 24 * 60 * 60
const utcDay = (): string => new Date().toISOString().slice(0, 10)
const DAY_MS = 24 * 60 * 60 * 1000

let player: APIRequestContext

test.beforeAll(async ({ playwright }) => {
  player = await newRequestContext(playwright)
})

test.afterAll(async () => {
  await player.dispose()
})

const postReferral = (
  context: APIRequestContext,
  body: unknown,
  contentType = 'application/json',
) =>
  context.post(REFERRALS, {
    data: typeof body === 'string' ? body : JSON.stringify(body),
    headers: { 'Content-Type': contentType },
  })

/** Seconds left on a key in the Upstash stand-in: -1 without expiry, -2 if missing. */
async function upstashTTL(key: string): Promise<number> {
  const response = await fetch(`${FAKE_UPSTASH_URL}/debug/ttl?key=${encodeURIComponent(key)}`)
  expect(response.status).toBe(200)
  return ((await response.json()) as { ttl: number }).ttl
}

test('S22.1 the referral endpoint', async ({ api, playwright, seedStudio }) => {
  const { tenant, owner } = await seedStudio('s221')
  const game = await createProject(owner.client, tenant.id, `${tenant.slug}-game`)
  const held = await createProject(owner.client, tenant.id, `${tenant.slug}-held`)
  const valid = { game: game.id, ref: 'steam' }

  await test.step('bad bodies answer 400', async () => {
    const bad = [
      {},
      { game: game.id },
      { ref: 'steam' },
      { game: game.id, ref: 'nope' },
      { game: game.id, ref: 'STEAM' },
      { game: String(game.id), ref: 'steam' },
      { game: -1, ref: 'steam' },
      { game: 2 ** 40, ref: 'steam' },
      { game: { $ne: 1 }, ref: 'steam' },
      [valid],
      'not json',
    ]
    for (const body of bad) {
      const reply = await postReferral(player, body)
      expect(reply.status(), JSON.stringify(body)).toBe(400)
    }
  })

  await test.step('only JSON is accepted, so cross-site forms and no-cors fetches are refused (J1, J2, J4)', async () => {
    for (const contentType of [
      'text/plain',
      'text/plain; x=application/json',
      'text/plain;charset=UTF-8',
    ]) {
      const reply = await postReferral(player, valid, contentType)
      expect(reply.status(), contentType).toBe(400)
    }
    const form = await player.post(REFERRALS, { form: { game: String(game.id), ref: 'steam' } })
    expect(form.status(), 'urlencoded form').toBe(400)
    const multipart = await player.post(REFERRALS, {
      multipart: { game: String(game.id), ref: 'steam' },
    })
    expect(multipart.status(), 'multipart form').toBe(400)
  })

  await test.step('a held game and an unknown ID answer 404', async () => {
    const hold = await api('superAdmin').update('game-projects', held.id, {
      flagged: true,
      flagReasons: 'Held by an E2E test.',
    })
    expect(hold.status, JSON.stringify(hold.body)).toBe(200)
    expect((await postReferral(player, { game: held.id, ref: 'steam' })).status()).toBe(404)
    expect((await postReferral(player, { game: 2_000_000_000, ref: 'steam' })).status()).toBe(404)
    expect(await upstashTTL(`referrals:${held.id}:${utcDay()}`)).toBe(-2)
  })

  await test.step('a valid body answers 204, and the day key keeps 35 days (U6)', async () => {
    const before = utcDay()
    const reply = await postReferral(player, valid, 'application/json; charset=utf-8')
    expect(reply.status(), await reply.text()).toBe(204)
    const days = [...new Set([before, utcDay()])]
    const ttls = await Promise.all(days.map((day) => upstashTTL(`referrals:${game.id}:${day}`)))
    const ttl = Math.max(...ttls)
    expect(ttl).toBeGreaterThan(THIRTY_FIVE_DAYS - 60)
    expect(ttl).toBeLessThanOrEqual(THIRTY_FIVE_DAYS)
  })

  await test.step('neither the preflight nor the POST allows another origin', async () => {
    const preflight = await player.fetch(REFERRALS, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://host.test',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'content-type',
      },
    })
    expect(preflight.headers()['access-control-allow-origin'], 'preflight').toBeUndefined()
    const post = await player.post(REFERRALS, {
      data: JSON.stringify(valid),
      headers: { 'Content-Type': 'application/json', Origin: 'http://host.test' },
    })
    expect(post.headers()['access-control-allow-origin'], 'POST').toBeUndefined()
  })

  await test.step('without Upstash (port 3102) the counter is off: 404 (U8)', async () => {
    const selfHosted = await newRequestContext(playwright, SECOND_BASE_URL)
    try {
      expect((await postReferral(selfHosted, valid)).status()).toBe(404)
    } finally {
      await selfHosted.dispose()
    }
  })
})

/** The portal's referral pings a page has sent so far, oldest first. */
function collectPings(page: Page): Request[] {
  const pings: Request[] = []
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === REFERRALS) pings.push(request)
  })
  return pings
}

/**
 * For steps that assert no ping was sent: gives the page time to hydrate
 * and run its ping. `networkidle` can't tell, because after a reload
 * Chromium leaves Next's prefetches of the portal's links pending, with or
 * without the ping.
 */
async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('load')
  await page.waitForTimeout(1_500)
}

/**
 * Waits for at least `count` pings and their answers, then returns every
 * ping's `ref`, in order. Each must be the JSON the endpoint accepts and
 * counts (P7). Waiting for the answers also gives a duplicate sent in the
 * same moment time to show (P1).
 */
async function answeredRefs(pings: Request[], game: GameProject, count: number): Promise<string[]> {
  await expect.poll(() => pings.length).toBeGreaterThanOrEqual(count)
  const refs: string[] = []
  for (const ping of pings) {
    expect(ping.method()).toBe('POST')
    expect(ping.headers()['content-type']).toBe('application/json')
    const body = ping.postDataJSON() as { game: number; ref: string }
    expect(body.game, 'the ping names its own game (P10)').toBe(game.id)
    expect((await ping.response())?.status(), `${body.ref} counted`).toBe(204)
    refs.push(body.ref)
  }
  return refs
}

/** Asserts the address bar shows `path` with exactly `params`, in any order. */
async function expectURL(
  page: Page,
  path: string,
  params: Record<string, string> = {},
): Promise<void> {
  await expect
    .poll(() => {
      const url = new URL(page.url())
      return { path: url.pathname, params: Object.fromEntries(url.searchParams) }
    })
    .toEqual({ path, params })
}

/**
 * "Where players come from" on a game's Share tab, as `baseURL` shows it
 * to the game's owner: the days listed, and the totals per source label.
 */
async function shownReferrals(
  browser: Browser,
  game: GameProject,
  baseURL = BASE_URL,
): Promise<{ days: string[]; totals: Record<string, number> } | { off: string }> {
  const context = await browser.newContext({ baseURL, storageState: storageStatePath('aOwner') })
  try {
    const page = await context.newPage()
    await page.goto(gameShareHref(game.id))
    const section = page.getByRole('region', { name: 'Where players come from' })
    await expect(section).toBeVisible()
    const table = section.getByRole('table')
    if ((await table.count()) === 0) return { off: (await section.innerText()).trim() }

    const sources = (await table.locator('thead th').allInnerTexts())
      .slice(1)
      .map((text) => text.trim())
    const days = await table
      .locator('tbody th time')
      .evaluateAll((times) => times.map((time) => time.getAttribute('datetime') ?? ''))
    const totalCells = (await table.locator('tfoot td').allInnerTexts()).map((text) =>
      Number(text.trim()),
    )
    expect(totalCells).toHaveLength(sources.length)
    return { days, totals: Object.fromEntries(sources.map((source, i) => [source, totalCells[i]])) }
  } finally {
    await context.close()
  }
}

/** One row, today's (or yesterday's, if the run crossed midnight UTC), and exactly these totals. */
function expectOneDay(
  shown: Awaited<ReturnType<typeof shownReferrals>>,
  totals: Record<string, number>,
): void {
  expect(shown).toEqual({ days: [expect.any(String)], totals })
  const [day] = (shown as { days: string[] }).days
  expect([utcDay(), new Date(Date.now() - DAY_MS).toISOString().slice(0, 10)]).toContain(day)
}

test.describe('the portal counts tagged arrivals', () => {
  test('S22.2 an arrival counts once, a reload doesn’t, and the Share tab shows it', async ({
    api,
    browser,
    page,
    uniqueSlug,
    world,
  }) => {
    const game = await createProject(api('aOwner'), world.tenants.A.id, uniqueSlug('ref-arrival'))
    const hub = portalPaths(game.slug).hub
    const pings = collectPings(page)

    await test.step('a tagged hub URL sends one JSON ping, and loses its ref (P1, P7)', async () => {
      await page.goto(`${hub}?ref=steam`)
      await expectURL(page, hub)
      expect(await answeredRefs(pings, game, 1)).toEqual(['steam'])
    })

    await test.step('reloading the stripped URL sends none (P2)', async () => {
      await page.reload()
      await settle(page)
      expect(pings).toHaveLength(1)
    })

    await test.step('the Share tab shows Steam 1 for today', async () => {
      expectOneDay(await shownReferrals(browser, game), { Steam: 1 })
    })

    await test.step('a second arrival at the tagged URL counts again (P4)', async () => {
      await page.goto(`${hub}?ref=steam`)
      await expectURL(page, hub)
      expect(await answeredRefs(pings, game, 2)).toEqual(['steam', 'steam'])
      await expect
        .poll(async () => shownReferrals(browser, game))
        .toMatchObject({ totals: { Steam: 2 } })
    })

    await test.step('an arrival through an embed’s link counts under Embed', async () => {
      await page.goto(`${hub}?ref=embed`)
      await expectURL(page, hub)
      expect(await answeredRefs(pings, game, 3)).toEqual(['steam', 'steam', 'embed'])
      await expect
        .poll(async () => shownReferrals(browser, game))
        .toMatchObject({ totals: { Steam: 2, Embed: 1 } })
    })
  })

  test('S22.3 client-side navigation within the game counts each tagged arrival once', async ({
    api,
    browser,
    page,
    uniqueSlug,
    world,
  }) => {
    const game = await createProject(api('aOwner'), world.tenants.A.id, uniqueSlug('ref-navigate'))
    const paths = portalPaths(game.slug)
    const pings = collectPings(page)
    const push = (url: string) =>
      page.evaluate((target) => {
        ;(
          window as unknown as { next: { router: { push: (url: string) => void } } }
        ).next.router.push(target)
      }, url)

    await test.step('an untagged page sends nothing', async () => {
      await page.goto(paths.updates)
      await settle(page)
      expect(pings).toHaveLength(0)
      // Next's own router, exposed for debugging; an upgrade that drops it must fail here, loudly.
      expect(
        await page.evaluate(
          () => typeof (window as { next?: { router?: { push?: unknown } } }).next?.router?.push,
        ),
      ).toBe('function')
      await page.evaluate(() => {
        ;(window as unknown as { referralMarker: string }).referralMarker = 'kept'
      })
    })

    await test.step('pushing the tagged board counts itch, keeps view=board and doesn’t reload (P3, P5)', async () => {
      await push(`${paths.feedback}?view=board&ref=itch`)
      await expectURL(page, paths.feedback, { view: 'board' })
      expect(await answeredRefs(pings, game, 1)).toEqual(['itch'])
      expect(
        await page.evaluate(
          () => (window as unknown as { referralMarker?: string }).referralMarker,
        ),
      ).toBe('kept')
    })

    await test.step('pushing a tagged hub counts readme, and pushing it again counts again (P4)', async () => {
      await push(`${paths.hub}?ref=readme`)
      await expectURL(page, paths.hub)
      expect(await answeredRefs(pings, game, 2)).toEqual(['itch', 'readme'])

      await push(`${paths.hub}?ref=readme`)
      expect(await answeredRefs(pings, game, 3)).toEqual(['itch', 'readme', 'readme'])
      await expectURL(page, paths.hub)
    })

    await test.step('going back sends nothing (P2)', async () => {
      await page.goBack()
      await expectURL(page, paths.hub)
      await settle(page)
      expect(pings).toHaveLength(3)
      expect(
        await page.evaluate(
          () => (window as unknown as { referralMarker?: string }).referralMarker,
        ),
      ).toBe('kept')
    })

    await test.step('the Share tab shows itch.io 1 and README 2', async () => {
      await expect
        .poll(async () => shownReferrals(browser, game))
        .toMatchObject({ totals: { 'itch.io': 1, README: 2 } })
    })
  })

  test('S22.4 the roadmap alias counts, and an unknown ref is left alone', async ({
    api,
    browser,
    page,
    uniqueSlug,
    world,
  }) => {
    const game = await createProject(api('aOwner'), world.tenants.A.id, uniqueSlug('ref-other'))
    const paths = portalPaths(game.slug)
    const pings = collectPings(page)

    await test.step('/roadmap?ref=itch lands on the board and counts itch', async () => {
      await page.goto(`${paths.roadmap}?ref=itch`)
      await expectURL(page, paths.feedback, { view: 'board' })
      expect(await answeredRefs(pings, game, 1)).toEqual(['itch'])
    })

    await test.step('?ref=nope is never sent, and stays in the URL (P6)', async () => {
      await page.goto(`${paths.hub}?ref=nope`)
      await settle(page)
      await expectURL(page, paths.hub, { ref: 'nope' })
      expect(pings).toHaveLength(1)
    })

    await test.step('the Share tab shows only itch.io', async () => {
      expectOneDay(await shownReferrals(browser, game), { 'itch.io': 1 })
    })
  })
})

test('S22.5 without Upstash (port 3102) there is no ping, and the Share tab says counting is off', async ({
  api,
  browser,
  page,
  uniqueSlug,
  world,
}) => {
  // A game no 3100 page has rendered: both servers share the build's ISR cache.
  const game = await createProject(api('aOwner'), world.tenants.A.id, uniqueSlug('ref-off'))
  const hub = portalPaths(game.slug).hub
  const pings = collectPings(page)

  await test.step('a tagged hub sends nothing and keeps its ref (P8)', async () => {
    await page.goto(`${SECOND_BASE_URL}${hub}?ref=steam`)
    await expect(page.getByRole('heading', { level: 1, name: game.name })).toBeVisible()
    await settle(page)
    expect(pings).toHaveLength(0)
    await expectURL(page, hub, { ref: 'steam' })
  })

  await test.step('the Share tab explains the counter is off', async () => {
    const shown = await shownReferrals(browser, game, SECOND_BASE_URL)
    expect(shown).toEqual({
      off: expect.stringContaining(
        'Referral counting is off on this instance. It needs Upstash Redis',
      ),
    })
  })
})
