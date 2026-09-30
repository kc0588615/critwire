import { randomBytes } from 'node:crypto'

import type { Page } from '@playwright/test'

import type { GamePage, GameProject, Issue, Media } from '../../src/payload-types'
import { DEFAULT_THEME_COLORS } from '../../src/lib/game-portal/theme'
import type { RestClient } from './support/api'
import {
  createIssue,
  createPatchNote,
  createProject,
  eventually,
  expect,
  seed,
  test,
  uploadImage,
} from './support/fixtures'

/**
 * The public game portal landing page at /g/<slug>: the default page
 * derived from project facts, published flagship pages, and the live
 * patch-note and issue slots.
 */

const SECTION = {
  availability: 'fs-availability-heading',
  trailer: 'fs-trailer-heading',
  features: 'fs-features-heading',
  latestUpdate: 'fs-latest-update-heading',
  knownIssues: 'fs-known-issues-heading',
  community: 'fs-community-heading',
  finalCta: 'fs-final-cta-heading',
} as const

const section = (page: Page, id: string) => page.locator(`section[aria-labelledby="${id}"]`)

/** Loads the landing until `check` passes; see `eventually`. */
const expectLanding = (page: Page, slug: string, check: () => Promise<void>): Promise<void> =>
  eventually(async () => {
    await page.goto(`/g/${slug}`)
    await check()
  })

/** Text of a landing element; `textContent` ignores CSS text-transform. */
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

test.describe('S2.2 derived default landing', () => {
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
        trailer: 'https://www.youtube.com/watch?v=aqz-KE-bpKQ',
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
        ['Patch notes', 'updates'],
        ['Known issues', 'feedback'],
        ['Report a bug', 'feedback/new'],
        ['Contact', 'contact'],
      ]) {
        await expect(nav.getByRole('link', { name: label, exact: true })).toHaveAttribute(
          'href',
          `/g/${rich.slug}/${path}`,
        )
      }
    })

    await test.step('the primary call to action is the first platform’s store', async () => {
      await expect(page.locator('section.fs-hero .fs-btn-primary')).toHaveAttribute('href', FIRST_STORE)
    })

    await test.step('sections render in the template’s fixed order', async () => {
      const order = await page
        .locator('main section[aria-labelledby]')
        .evaluateAll((sections) => sections.map((s) => s.getAttribute('aria-labelledby')))
      expect(order).toEqual([SECTION.availability, SECTION.trailer, SECTION.community, SECTION.finalCta])
    })
  })

  test('loads the trailer iframe only after “Play video”', async ({ page }) => {
    // Keep the run offline: the iframe's address is what matters.
    await page.route('**/*youtube-nocookie.com/**', (route) => route.fulfill({ body: '' }))
    await page.goto(`/g/${rich.slug}`)
    const trailer = section(page, SECTION.trailer)
    await expect(trailer.locator('iframe')).toHaveCount(0)
    await trailer.getByRole('button', { name: /^Play video/ }).click()
    await expect(trailer.locator('iframe')).toHaveAttribute(
      'src',
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/aqz-KE-bpKQ/,
    )
  })

  test('a project without store facts has no store button, and its name renders as text', async ({ page }) => {
    await page.goto(`/g/${bare.slug}`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('<Evil> {Game}')
    await expect(page.getByRole('link', { name: 'Get the game' })).toHaveCount(0)
  })
})

test.describe('S2.4 publishing a flagship page', () => {
  let project: GameProject
  let landing: GamePage
  let hero: Media

  /** Payload array-row id, as the admin generates it. */
  const rowID = (): string => randomBytes(12).toString('hex')

  /** The `site` group shaped like the admin's form state. */
  const siteLike = (heading: string) => ({
    nav: {
      links: [
        { id: rowID(), ref: 'updates', label: null },
        { id: rowID(), ref: 'issues', label: 'Bugs' },
      ],
      cta: { ref: null, label: null },
    },
    theme: { colors: { ...DEFAULT_THEME_COLORS } },
    hero: {
      variant: 'split',
      heading,
      backgroundMedia: hero.id,
      primaryAction: { ref: 'report', label: null },
      secondaryAction: { ref: null, label: null },
    },
    features: {
      heading: 'Why you’ll love it',
      items: [{ id: rowID(), title: 'Storms', body: 'Fight through storms.', media: null }],
    },
  })

  const publish = (client: RestClient, site: object) =>
    client.update('game-pages', landing.id, { site, _status: 'published' } as Partial<GamePage>)

  test.beforeAll(async ({ api, uniqueSlug, world }) => {
    const aMember = api('aMember')
    project = await createProject(api('aOwner'), world.tenants.A.id, uniqueSlug('land-flagship'), {
      name: 'Flagship Landing Game',
    })
    hero = await uploadImage(aMember, world.tenants.A.id, 'land-hero.png', 'Hero art')
    landing = await seed(
      aMember,
      'game-pages',
      {
        gameProject: project.id,
        tenant: world.tenants.A.id,
        title: 'Flagship landing',
        template: 'flagship-game-v1',
        _status: 'draft',
      },
      { draft: true },
    )
  })

  test('rejects an unsafe or invalid configuration and keeps the public page', async ({ api, page }) => {
    const aMember = api('aMember')
    const invalid: [string, (site: ReturnType<typeof siteLike>) => object][] = [
      ...[
        '<script>alert(1)</script>',
        'Nice game <img src=x>',
        'body { color: red }',
        'class="p-4 text-red-500"',
        'style=color:red',
        'javascript:alert(1)',
      ].map((tagline): [string, (site: ReturnType<typeof siteLike>) => object] => [
        `the tagline ${tagline}`,
        (site) => ({ ...site, hero: { ...site.hero, tagline } }),
      ]),
      [
        'a raw URL as an action ref',
        (site) => ({ ...site, hero: { ...site.hero, primaryAction: { ref: 'https://evil.example', label: null } } }),
      ],
      ['an unapproved variant', (site) => ({ ...site, hero: { ...site.hero, variant: 'parallax' } })],
    ]
    for (const [name, mutate] of invalid) {
      await test.step(name, async () => {
        const { status, body } = await publish(aMember, mutate(siteLike('Should never publish')))
        expect(status, JSON.stringify(body)).toBe(400)
        await page.goto(`/g/${project.slug}`)
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(project.name)
      })
    }
  })

  test('publishes, keeps drafts private, and falls back when unpublished', async ({ api, page }) => {
    const aMember = api('aMember')

    await test.step('a valid publish shaped like admin data renders', async () => {
      const site = siteLike('Weather the storm')
      const { status, body } = await publish(aMember, { ...site, hero: { ...site.hero, junk: 1 } })
      expect(status, JSON.stringify(body)).toBe(200)
      // Payload drops keys outside the field schema, so they never reach storage or the renderer.
      expect(body.doc.site?.hero).not.toHaveProperty('junk')
      await expectLanding(page, project.slug, async () => {
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Weather the storm', { timeout: 1_000 })
      })
      await expect(page.locator('section.fs-hero img')).toBeVisible()
      await expect(section(page, SECTION.features)).toContainText('Storms')
    })

    await test.step('a draft save leaves the public page alone', async () => {
      const draft = await aMember.update(
        'game-pages',
        landing.id,
        { site: siteLike('Draft-only heading'), _status: 'draft' } as Partial<GamePage>,
        { draft: true },
      )
      expect(draft.status, JSON.stringify(draft.body)).toBe(200)
      await page.goto(`/g/${project.slug}`)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Weather the storm')
    })

    await test.step('publishing the draft makes it visible', async () => {
      const { status, body } = await publish(aMember, siteLike('Draft-only heading'))
      expect(status, JSON.stringify(body)).toBe(200)
      await expectLanding(page, project.slug, async () => {
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Draft-only heading', { timeout: 1_000 })
      })
    })

    await test.step('unpublishing falls back to the derived default', async () => {
      const { status, body } = await aMember.update('game-pages', landing.id, { _status: 'draft' })
      expect(status, JSON.stringify(body)).toBe(200)
      await expectLanding(page, project.slug, async () => {
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(project.name, { timeout: 1_000 })
      })
    })
  })
})

test('S2.4 project theme', async ({ api, page, uniqueSlug, world }) => {
  const aMember = api('aMember')
  const project = await createProject(api('aOwner'), world.tenants.A.id, uniqueSlug('land-theme'))
  const landing = `/g/${project.slug}`
  const updates = `${landing}/updates`
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

  const landingStyle = await rootStyle(landing)
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
      expect(await rootStyle(landing)).toBe(landingStyle)
    })
  }

  await test.step('setting only the accent keeps the default palette', async () => {
    const { status, body } = await aMember.update('game-projects', project.id, {
      theme: { colors: { accent: '#f59e0b' } },
    })
    expect(status, JSON.stringify(body)).toBe(200)
    expect(await storedColors()).toEqual({ ...DEFAULT_THEME_COLORS, accent: '#f59e0b' })
  })

  await test.step('a valid save re-themes the cached updates page and the landing', async () => {
    await eventually(async () => {
      expect(await accentOn(updates)).toBe('#f59e0b')
    })
    await eventually(async () => {
      expect(await accentOn(landing)).toBe('#f59e0b')
    })
    const background = await page.locator('.fs-btn-primary').first().evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(rgbToHex(background)).toBe('#f59e0b')
  })
})

test.describe('S2.5 live slots', () => {
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

  test('show the newest published note and public issues of this game only', async ({ page }) => {
    await page.goto(`/g/${a1.slug}`)
    await test.step('latest update', async () => {
      const latest = section(page, SECTION.latestUpdate)
      await expect(latest).toContainText('Newest update v2')
      await expect(latest).not.toContainText('Older update v1')
      await expect(latest).not.toContainText('Unreleased update v3')
    })
    await test.step('known issues', async () => {
      const known = section(page, SECTION.knownIssues)
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
    const knownIssue = (title: string) => section(page, SECTION.knownIssues).getByRole('link', { name: new RegExp(title) })

    await test.step('a status change updates the stage label', async () => {
      await page.goto(`/g/${a1.slug}`)
      await expect(knownIssue(publicIssue.title)).toContainText('Under review')
      const { status } = await aOwner.update('issues', publicIssue.id, { status: 'PLANNED' })
      expect(status).toBe(200)
      await expectLanding(page, a1.slug, async () => {
        await expect(knownIssue(publicIssue.title)).toContainText('Planned', { timeout: 1_000 })
      })
    })

    await test.step('moving an issue to another game updates both landings', async () => {
      await page.goto(`/g/${a2.slug}`)
      await expect(page.getByText(movingIssue.title)).toHaveCount(0)
      const { status } = await aOwner.update('issues', movingIssue.id, { gameProject: a2.id })
      expect(status).toBe(200)
      await expectLanding(page, a1.slug, async () => {
        expect(await textOf(page, 'main')).not.toContain(movingIssue.title)
      })
      await expectLanding(page, a2.slug, async () => {
        expect(await textOf(page, `section[aria-labelledby="${SECTION.knownIssues}"]`)).toContain(movingIssue.title)
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

  // The header's home link is the only link back to the landing itself.
  const image = page.locator(`a[href="/g/${project.slug}"] img`)
  await expectLanding(page, project.slug, async () => {
    await expect(image).toBeVisible({ timeout: 1_000 })
  })
  await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
  const src = await image.evaluate((img: HTMLImageElement) => img.currentSrc)
  expect((await page.request.get(src)).status()).toBe(200)
})
