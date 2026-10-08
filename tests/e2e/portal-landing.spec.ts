import type { Page } from '@playwright/test'

import type { GameProject, Issue } from '../../src/payload-types'
import { DEFAULT_THEME_COLORS } from '../../src/lib/game-portal/theme'
import {
  createIssue,
  createPatchNote,
  createProject,
  eventually,
  expect,
  test,
  uploadImage,
} from './support/fixtures'

/**
 * The public game hub at /g/<slug>: the header built from project
 * facts, the project theme, and the live updates and feedback sections.
 */

const SECTION = {
  latestUpdates: 'fs-latest-updates-heading',
  topFeedback: 'fs-top-feedback-heading',
} as const

const section = (page: Page, id: string) => page.locator(`section[aria-labelledby="${id}"]`)

/** Loads the hub until `check` passes; see `eventually`. */
const expectHub = (page: Page, slug: string, check: () => Promise<void>): Promise<void> =>
  eventually(async () => {
    await page.goto(`/g/${slug}`)
    await check()
  })

/** Text of a hub element; `textContent` ignores CSS text-transform. */
const textOf = async (page: Page, selector: string): Promise<string> =>
  (await page.locator(selector).first().textContent()) ?? ''

/** `rgb(r, g, b)` → `#rrggbb`. */
const rgbToHex = (rgb: string): string => {
  const channels = rgb.match(/\d+/g)?.slice(0, 3).map(Number)
  if (!channels || channels.length !== 3) throw new Error(`not an rgb() colour: ${rgb}`)
  return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

test('S2.1 an unknown game and a private issue get the same 404', async ({ api, page, uniqueSlug, world }) => {
  const project = await createProject(api('aOwner'), world.tenants.A.id, uniqueSlug('land-404'))
  const hidden = await createIssue(api('aOwner'), project, uniqueSlug('land-hidden'), { isPublic: false })

  const render404 = async (path: string) => {
    const response = await page.goto(path)
    expect(response?.status(), path).toBe(404)
    // The not-found UI can land after `load`; read the page once it's there.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('404')
    return { title: await page.title(), body: await page.locator('body').innerText() }
  }
  const unknown = await test.step('unknown game', () => render404(`/g/${uniqueSlug('no-such-game')}`))
  const privateIssue = await test.step('private issue of an existing game', () =>
    render404(`/g/${project.slug}/feedback/${hidden.slug}`),
  )
  expect(privateIssue).toEqual(unknown)
  expect(privateIssue.body).not.toContain(project.name)
})

test.describe('S2.2 the hub', () => {
  const FIRST_STORE = 'https://www.nintendo.com/store/products/e2e-landing'
  const STEAM = 'https://store.steampowered.com/app/480'
  let rich: GameProject
  let bare: GameProject

  test.beforeAll(async ({ api, uniqueSlug, world }) => {
    const aOwner = api('aOwner')
    rich = await createProject(aOwner, world.tenants.A.id, uniqueSlug('land-rich'), {
      name: 'Stormbound Tactics',
      description: 'A cozy roguelike about weather.',
      links: {
        steam: STEAM,
        discord: 'https://discord.gg/e2e-landing',
      },
      availability: {
        releaseState: 'earlyAccess',
        platforms: [
          { platform: 'switch', storeUrl: FIRST_STORE },
          { platform: 'windows', storeUrl: STEAM },
        ],
      },
      contact: { target: 'EXTERNAL_URL', externalUrl: 'https://example.com/contact' },
      reportForm: { provider: 'external', externalUrl: 'https://example.com/bugs' },
    })
    bare = await createProject(aOwner, world.tenants.A.id, uniqueSlug('land-bare'), { name: '<Evil> {Game}' })
  })

  test('shows the project’s facts with internal portal links', async ({ page }) => {
    await page.goto(`/g/${rich.slug}`)

    await test.step('heading and share metadata', async () => {
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(rich.name)
      await expect(page.locator('meta[property="og:site_name"]')).toHaveAttribute('content', 'Critwire')
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute('content', /.+/)
    })

    await test.step('portal links stay on /g/<slug> although contact and reports are external', async () => {
      const nav = page.getByRole('navigation', { name: 'Site' })
      for (const [label, path] of [
        ['Updates', 'updates'],
        ['Feedback', 'feedback'],
        ['Contact', 'contact'],
      ]) {
        await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute(
          'href',
          `/g/${rich.slug}/${path}`,
        )
      }
    })

    await test.step('the primary call to action is the first platform’s store', async () => {
      await expect(page.locator('.fs-hub-header .fs-btn-primary')).toHaveAttribute('href', FIRST_STORE)
    })

    await test.step('sections render in the hub’s fixed order', async () => {
      const order = await page
        .locator('main section[aria-labelledby]')
        .evaluateAll((sections) => sections.map((s) => s.getAttribute('aria-labelledby')))
      expect(order).toEqual([SECTION.latestUpdates, SECTION.topFeedback])
    })
  })

  test('a project without store facts has no store button, and its name renders as text', async ({ page }) => {
    await page.goto(`/g/${bare.slug}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('<Evil> {Game}')
    await expect(page.getByRole('link', { name: 'Get the game' })).toHaveCount(0)
  })
})

test('S2.4 project theme', async ({ api, page, uniqueSlug, world }) => {
  const aMember = api('aMember')
  const project = await createProject(api('aOwner'), world.tenants.A.id, uniqueSlug('land-theme'))
  const hub = `/g/${project.slug}`
  const updates = `${hub}/updates`
  const storedColors = async () => {
    const { status, body } = await aMember.findByID('game-projects', project.id)
    expect(status).toBe(200)
    return body.theme?.colors
  }
  const rootStyle = async (path: string) => {
    await page.goto(path)
    return page.locator('.fs-root').getAttribute('style', { timeout: 1_000 })
  }
  const accentOn = async (path: string) => {
    await page.goto(path)
    return page
      .locator('.fs-root')
      .evaluate((el) => getComputedStyle(el).getPropertyValue('--fs-accent').trim(), undefined, { timeout: 1_000 })
  }

  const hubStyle = await rootStyle(hub)
  // Warm the ISR cache, so only revalidation can bring in the new theme.
  expect(await accentOn(updates)).toBe(DEFAULT_THEME_COLORS.accent)

  const invalid: [string, keyof typeof DEFAULT_THEME_COLORS, string][] = [
    ['low-contrast text on the background', 'foreground', '#2a2f3d'],
    ['low-contrast button text', 'accentForeground', '#67e8f9'],
    ['a 3-digit hex colour', 'accent', '#fff'],
  ]
  for (const [name, key, value] of invalid) {
    await test.step(`rejects ${name}`, async () => {
      const { status, body } = await aMember.update('game-projects', project.id, {
        theme: { colors: { ...DEFAULT_THEME_COLORS, [key]: value } },
      })
      expect(status, JSON.stringify(body)).toBe(400)
      expect(JSON.stringify(body)).toContain(`theme.colors.${key}`)
      expect(await storedColors()).toEqual(DEFAULT_THEME_COLORS)
      expect(await rootStyle(hub)).toBe(hubStyle)
    })
  }

  await test.step('setting only the accent keeps the default palette', async () => {
    const { status, body } = await aMember.update('game-projects', project.id, {
      theme: { colors: { accent: '#f59e0b' } },
    })
    expect(status, JSON.stringify(body)).toBe(200)
    expect(await storedColors()).toEqual({ ...DEFAULT_THEME_COLORS, accent: '#f59e0b' })
  })

  await test.step('a valid save re-themes the cached updates page and the hub', async () => {
    await eventually(async () => {
      expect(await accentOn(updates)).toBe('#f59e0b')
    })
    await eventually(async () => {
      expect(await accentOn(hub)).toBe('#f59e0b')
    })
    const background = await page.locator('.fs-btn-primary').first().evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(rgbToHex(background)).toBe('#f59e0b')
  })

  await test.step('the standard typography saves and sets the title in the site’s brand font', async () => {
    const { status, body } = await aMember.update('game-projects', project.id, { theme: { typography: 'standard' } })
    expect(status, JSON.stringify(body)).toBe(200)
    expect(body.doc.theme?.typography).toBe('standard')
    await eventually(async () => {
      await page.goto(hub)
      const title = await page
        .locator('.fs-h1')
        .evaluate((el) => ({ family: getComputedStyle(el).fontFamily, weight: getComputedStyle(el).fontWeight }), undefined, {
          timeout: 1_000,
        })
      expect(title.family).toMatch(/\bNunito\b/)
      expect(title.weight).toBe('700')
    })
  })
})

test.describe('S2.5 hub sections', () => {
  let a1: GameProject
  let a2: GameProject
  let publicIssue: Issue
  let privateIssue: Issue
  let movingIssue: Issue
  let bIssueTitle: string
  let bNoteTitle: string

  test.beforeAll(async ({ api, uniqueSlug, world }) => {
    const aOwner = api('aOwner')
    const bOwner = api('bOwner')
    a1 = await createProject(aOwner, world.tenants.A.id, uniqueSlug('land-live-a1'))
    a2 = await createProject(aOwner, world.tenants.A.id, uniqueSlug('land-live-a2'))
    await createPatchNote(aOwner, a1, uniqueSlug('land-v1'), { title: 'Older update v1' })
    await createPatchNote(aOwner, a1, uniqueSlug('land-v2'), { title: 'Newest update v2' })
    await createPatchNote(aOwner, a1, uniqueSlug('land-v3'), { title: 'Unreleased update v3', _status: 'draft' })
    publicIssue = await createIssue(aOwner, a1, uniqueSlug('land-public'), { title: 'Save files vanish', isPublic: true })
    privateIssue = await createIssue(aOwner, a1, uniqueSlug('land-private'), { title: 'Internal crash dump', isPublic: false })
    movingIssue = await createIssue(aOwner, a1, uniqueSlug('land-moving'), { title: 'Controller drift', isPublic: true })

    const b = await createProject(bOwner, world.tenants.B.id, uniqueSlug('land-live-b'))
    bIssueTitle = (await createIssue(bOwner, b, uniqueSlug('land-b-issue'), { title: 'Studio B bug', isPublic: true })).title
    bNoteTitle = (await createPatchNote(bOwner, b, uniqueSlug('land-b-v1'), { title: 'Studio B update' })).title
  })

  test('show the newest published updates and public feedback of this game only', async ({ page }) => {
    await page.goto(`/g/${a1.slug}`)
    await test.step('latest updates', async () => {
      const latest = section(page, SECTION.latestUpdates)
      await expect(latest.locator('h3')).toHaveText(['Newest update v2', 'Older update v1'])
      await expect(latest).not.toContainText('Unreleased update v3')
    })
    await test.step('top feedback', async () => {
      const known = section(page, SECTION.topFeedback)
      await expect(known).toContainText(publicIssue.title)
      await expect(known).toContainText(movingIssue.title)
      await expect(known).not.toContainText(privateIssue.title)
    })
    await test.step('nothing from studio B', async () => {
      const main = page.locator('main')
      await expect(main).not.toContainText(bIssueTitle)
      await expect(main).not.toContainText(bNoteTitle)
    })
  })

  test('follow issue changes', async ({ api, page }) => {
    const aOwner = api('aOwner')
    const knownIssue = (title: string) => section(page, SECTION.topFeedback).getByRole('link', { name: new RegExp(title) })

    await test.step('a status change updates the stage label', async () => {
      await page.goto(`/g/${a1.slug}`)
      await expect(knownIssue(publicIssue.title)).toContainText('Under review')
      const { status } = await aOwner.update('issues', publicIssue.id, { status: 'PLANNED' })
      expect(status).toBe(200)
      await expectHub(page, a1.slug, async () => {
        await expect(knownIssue(publicIssue.title)).toContainText('Planned', { timeout: 1_000 })
      })
    })

    await test.step('moving an issue to another game updates both hubs', async () => {
      await page.goto(`/g/${a2.slug}`)
      await expect(page.getByText(movingIssue.title)).toHaveCount(0)
      const { status } = await aOwner.update('issues', movingIssue.id, { gameProject: a2.id })
      expect(status).toBe(200)
      await expectHub(page, a1.slug, async () => {
        expect(await textOf(page, 'main')).not.toContain(movingIssue.title)
      })
      await expectHub(page, a2.slug, async () => {
        expect(await textOf(page, `section[aria-labelledby="${SECTION.topFeedback}"]`)).toContain(movingIssue.title)
      })
    })
  })
})

test('S2.6 an uploaded logo renders in the portal header', async ({ api, page, uniqueSlug, world }) => {
  const aOwner = api('aOwner')
  const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('land-logo'))
  const logo = await uploadImage(aOwner, world.tenants.A.id, 'land-logo.png', 'Game logo')
  const { status } = await aOwner.update('game-projects', project.id, { logo: logo.id })
  expect(status).toBe(200)

  // The header's home link is the only link back to the hub itself.
  const image = page.locator(`a[href="/g/${project.slug}"] img`)
  await expectHub(page, project.slug, async () => {
    await expect(image).toBeVisible({ timeout: 1_000 })
  })
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
  const src = await image.evaluate((img: HTMLImageElement) => img.currentSrc)
  expect((await page.request.get(src)).status()).toBe(200)
})

test('S2.7 the portal links back to the studio’s own site', async ({ api, page, uniqueSlug, world }) => {
  const WEBSITE = 'https://example.com/e2e-studio'
  const aOwner = api('aOwner')
  const withSite = await createProject(aOwner, world.tenants.A.id, uniqueSlug('land-site'), {
    links: { website: WEBSITE },
  })
  const withoutSite = await createProject(aOwner, world.tenants.A.id, uniqueSlug('land-no-site'))
  const officialSite = () => page.getByRole('banner').getByRole('link', { name: 'Official site' })

  for (const width of [1440, 390]) {
    await test.step(`${width} px`, async () => {
      await page.setViewportSize({ width, height: 900 })
      for (const path of ['', '/feedback']) {
        await page.goto(`/g/${withSite.slug}${path}`)
        await expect(officialSite()).toBeVisible()
        await expect(officialSite()).toHaveAttribute('href', WEBSITE)

        await page.goto(`/g/${withoutSite.slug}${path}`)
        await expect(page.getByRole('banner')).toBeVisible()
        await expect(officialSite()).toHaveCount(0)
      }
    })
  }
})
