import type { APIRequestContext, APIResponse } from '@playwright/test'
import sharp from 'sharp'

import type { GameProject } from '../../src/payload-types'
import {
  createIssue,
  createPatchNote,
  createProject,
  expect,
  hold,
  newRequestContext,
  test,
} from './support/fixtures'
import { svgHeight, svgTitle } from './support/svg'

/**
 * The live badge at /g/<game>/badge.svg and badge.png: the game's public
 * stage counts and latest version, in its theme, cached for 5 minutes. A
 * held game, a suspended studio and an unknown slug all get the same
 * neutral image, never an error, so host pages don't show a broken image.
 */

const FIVE_MINUTES = 'public, max-age=300, s-maxage=300'
const NEUTRAL_TITLE = 'feedback: unavailable'

const badgePath = (slug: string, format: 'svg' | 'png'): string => `/g/${slug}/badge.${format}`

let player: APIRequestContext

test.beforeAll(async ({ playwright }) => {
  player = await newRequestContext(playwright)
})

test.afterAll(async () => {
  await player.dispose()
})

async function getBadge(slug: string, format: 'svg' | 'png'): Promise<APIResponse> {
  const response = await player.get(badgePath(slug, format), { maxRedirects: 0 })
  expect(response.status(), badgePath(slug, format)).toBe(200)
  expect(response.headers()['cache-control'], badgePath(slug, format)).toBe(FIVE_MINUTES)
  return response
}

async function badgeSVG(slug: string): Promise<string> {
  const response = await getBadge(slug, 'svg')
  expect(response.headers()['content-type']).toMatch(/^image\/svg\+xml\b/)
  const svg = await response.text()
  expect(svg).toContain('<path')
  expect(svg).not.toContain('<text')
  expect(svg).not.toMatch(/<script|href=/i)
  return svg
}

test('S21.1 the badge counts public items per public stage', async ({ seedStudio }) => {
  const { tenant, owner } = await seedStudio('s211')
  const project = await createProject(owner.client, tenant.id, `${tenant.slug}-game`)

  await test.step('with no feedback yet, it says so', async () => {
    expect(svgTitle(await badgeSVG(project.slug))).toBe('feedback: no feedback yet')
  })

  const item = (slug: string, data: Parameters<typeof createIssue>[3]) =>
    createIssue(owner.client, project, `${tenant.slug}-${slug}`, data)
  // Three internal statuses that players see as "Under review".
  await item('reported', { status: 'REPORTED' })
  await item('investigating', { status: 'INVESTIGATING' })
  await item('needs-info', { status: 'NEEDS_MORE_INFO', needsMoreInfoText: 'Which save slot?' })
  await item('planned', { status: 'PLANNED', type: 'IDEA' })
  await item('fixed', { status: 'FIXED' })
  // Never counted: a private item, and an archived one.
  await item('private', { status: 'PLANNED', isPublic: false })
  await item('closed', { status: 'CLOSED' })

  await test.step('stages with items, in stage order; no empty stage, no internal status', async () => {
    // Nothing is cached on the server: the next request sees the writes.
    const title = svgTitle(await badgeSVG(project.slug))
    expect(title).toBe('feedback: 3 under review · 1 planned · 1 shipped')
    expect(title).not.toMatch(/in progress|reported|investigating|closed|archived/i)
  })
})

test('S21.2 the version is the newest published update’s that has one', async ({ api, seedStudio }) => {
  const { tenant, owner } = await seedStudio('s212')
  const project = await createProject(owner.client, tenant.id, `${tenant.slug}-game`)
  const note = (slug: string, data: Parameters<typeof createPatchNote>[3] = {}) =>
    createPatchNote(owner.client, project, `${tenant.slug}-${slug}`, data)

  // Created oldest first, so each is published after the one before.
  await note('old', { versionLabel: 'v1.0' })
  // Markup characters must be escaped, and the label is cut to 24 characters.
  await note('current', { versionLabel: '  v2.0<beta>&"friends"-edition-long  ' })
  // Newer, but without a version: it mustn't hide the one above.
  await note('unversioned')
  await note('empty-version', { versionLabel: '' })
  // Neither a draft's version nor a held update's shows.
  await note('draft', { versionLabel: 'v9-draft', _status: 'draft' })
  const held = await note('held', { versionLabel: 'v8-held' })
  await hold(api('superAdmin'), 'patch-notes', held.id)

  const title = svgTitle(await badgeSVG(project.slug))
  expect(title).toBe('feedback: no feedback yet · v2.0<beta>&"friends"-edi')

  await test.step('it follows the stage counts', async () => {
    await createIssue(owner.client, project, `${tenant.slug}-planned`, { status: 'PLANNED' })
    expect(svgTitle(await badgeSVG(project.slug))).toBe('feedback: 1 planned · v2.0<beta>&"friends"-edi')
  })
})

test('S21.3 the badge follows the game’s theme', async ({ seedStudio }) => {
  const { tenant, owner } = await seedStudio('s213')
  const colors = {
    background: '#fdf6e3',
    foreground: '#1b1b1b',
    mutedForeground: '#555555',
    surface: '#fffaf0',
    accent: '#b3261e',
    accentForeground: '#ffffff',
    border: '#c8b991',
    success: '#2e7d32',
    warning: '#a15c00',
    error: '#b00020',
  }
  const project: GameProject = await createProject(owner.client, tenant.id, `${tenant.slug}-game`, {
    theme: { colors, shape: 'sharp' },
  })

  const svg = (await badgeSVG(project.slug)).toLowerCase()
  for (const key of ['accent', 'accentForeground', 'surface', 'foreground'] as const) {
    expect(svg, `fill ${key}`).toContain(`fill="${colors[key]}"`)
  }
  expect(svg, 'outline').toContain(`stroke="${colors.border}"`)
  expect(svg, 'sharp corners').not.toMatch(/\brx="[1-9]/)
})

test('S21.4 the PNG badge is the SVG at twice the size', async ({ seedStudio }) => {
  const { tenant, owner } = await seedStudio('s214')
  const project = await createProject(owner.client, tenant.id, `${tenant.slug}-game`)
  await createIssue(owner.client, project, `${tenant.slug}-planned`, { status: 'PLANNED' })

  const svg = await badgeSVG(project.slug)
  const response = await getBadge(project.slug, 'png')
  expect(response.headers()['content-type']).toBe('image/png')
  const png = await sharp(await response.body()).metadata()
  expect(png.format).toBe('png')
  expect(png.height, '2× height').toBe(svgHeight(svg) * 2)
})

test('S21.5 every badge answer is cached for exactly 5 minutes', async ({ seedStudio }) => {
  const { tenant, owner } = await seedStudio('s215')
  const project = await createProject(owner.client, tenant.id, `${tenant.slug}-game`)

  // `getBadge` asserts the header; the neutral image is covered too.
  for (const slug of [project.slug, `no-such-game-${tenant.slug}`]) {
    for (const format of ['svg', 'png'] as const) {
      await test.step(`${slug} ${format}`, () => getBadge(slug, format))
    }
  }
})

test('S21.6 a badge URL with a query string redirects to the bare URL', async ({ seedStudio }) => {
  const { tenant, owner } = await seedStudio('s216')
  const project = await createProject(owner.client, tenant.id, `${tenant.slug}-game`)

  for (const [slug, format, query] of [
    [project.slug, 'svg', '?v=2'],
    [project.slug, 'png', '?x=1'],
    [`no-such-game-${tenant.slug}`, 'svg', '?v=3'],
  ] as const) {
    await test.step(`${slug} ${format}${query}`, async () => {
      const response = await player.get(`${badgePath(slug, format)}${query}`, { maxRedirects: 0 })
      expect(response.status()).toBe(308)
      expect(response.headers()['cache-control']).toBe('public, max-age=86400')
      const location = new URL(response.headers()['location'], 'http://placeholder.invalid')
      expect(location.pathname).toBe(badgePath(slug, format))
      expect(location.search).toBe('')
    })
  }
})

test('S21.7 held, suspended and unknown games get the same neutral image', async ({ api, seedStudio }) => {
  const superAdmin = api('superAdmin')

  const heldStudio = await seedStudio('s217-held')
  const held = await createProject(heldStudio.owner.client, heldStudio.tenant.id, `${heldStudio.tenant.slug}-game`)
  await createIssue(heldStudio.owner.client, held, `${heldStudio.tenant.slug}-planned`, { status: 'PLANNED' })
  await createPatchNote(heldStudio.owner.client, held, `${heldStudio.tenant.slug}-v1`, { versionLabel: 'v1.0' })

  const suspendedStudio = await seedStudio('s217-suspended')
  const suspended = await createProject(
    suspendedStudio.owner.client,
    suspendedStudio.tenant.id,
    `${suspendedStudio.tenant.slug}-game`,
  )
  await createIssue(suspendedStudio.owner.client, suspended, `${suspendedStudio.tenant.slug}-planned`, {
    status: 'PLANNED',
  })

  await test.step('while public, both show their counts', async () => {
    expect(svgTitle(await badgeSVG(held.slug))).toBe('feedback: 1 planned · v1.0')
    expect(svgTitle(await badgeSVG(suspended.slug))).toBe('feedback: 1 planned')
  })

  await hold(superAdmin, 'game-projects', held.id)
  const suspend = await superAdmin.update('tenants', suspendedStudio.tenant.id, { suspended: true })
  expect(suspend.status, JSON.stringify(suspend.body)).toBe(200)

  const slugs = [held.slug, suspended.slug, `no-such-game-${heldStudio.tenant.slug}`]
  for (const format of ['svg', 'png'] as const) {
    await test.step(`${format}: 200 and byte-identical, with identical headers`, async () => {
      const answers = await Promise.all(
        slugs.map(async (slug) => {
          const response = await getBadge(slug, format)
          const { 'content-type': type, 'cache-control': cache } = response.headers()
          return { slug, body: await response.body(), type, cache }
        }),
      )
      const [first, ...rest] = answers
      expect(first.type).toBe(format === 'svg' ? 'image/svg+xml; charset=utf-8' : 'image/png')
      if (format === 'svg') expect(svgTitle(first.body.toString('utf8'))).toBe(NEUTRAL_TITLE)
      for (const other of rest) {
        expect(other.type, other.slug).toBe(first.type)
        expect(other.cache, other.slug).toBe(first.cache)
        expect(other.body.equals(first.body), `${other.slug} matches ${first.slug}`).toBe(true)
      }
    })
  }
})
