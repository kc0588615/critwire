import type { APIRequestContext } from '@playwright/test'

import { FAKE_UPSTASH_URL, SECOND_BASE_URL } from './support/env'
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

let player: APIRequestContext

test.beforeAll(async ({ playwright }) => {
  player = await newRequestContext(playwright)
})

test.afterAll(async () => {
  await player.dispose()
})

const postReferral = (context: APIRequestContext, body: unknown, contentType = 'application/json') =>
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
    for (const contentType of ['text/plain', 'text/plain; x=application/json', 'text/plain;charset=UTF-8']) {
      const reply = await postReferral(player, valid, contentType)
      expect(reply.status(), contentType).toBe(400)
    }
    const form = await player.post(REFERRALS, { form: { game: String(game.id), ref: 'steam' } })
    expect(form.status(), 'urlencoded form').toBe(400)
    const multipart = await player.post(REFERRALS, { multipart: { game: String(game.id), ref: 'steam' } })
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
