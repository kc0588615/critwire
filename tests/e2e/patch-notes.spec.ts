import type { APIRequestContext, Page } from '@playwright/test'

import type { GameProject, PatchNote } from '../../src/payload-types'
import { BASE_URL } from './support/env'
import { createPatchNote, createProject, eventually, expect, test } from './support/fixtures'

/**
 * Public patch notes under /g/<slug>/patch-notes: the paginated feed,
 * detail pages, the RSS feed, and how each follows edits. Replaces
 * tests/manual/verify-phase4.mjs.
 */

const feedPath = (slug: string) => `/g/${slug}/patch-notes`

/** Note titles on a feed page, top to bottom. */
const feedTitles = (page: Page): Promise<string[]> =>
  page.getByRole('listitem').getByRole('heading', { level: 2 }).allTextContents()

/** Loads `path` and fails unless the server answers `status`. */
async function open(page: Page, path: string, status = 200): Promise<void> {
  const response = await page.goto(path)
  expect(response?.status(), path).toBe(status)
}

interface Feed {
  status: number
  contentType: string
  xml: string
  channelTitle: string
  items: { title: string; link: string }[]
}

const tagText = (xml: string, tag: string): string =>
  xml.match(new RegExp(`<${tag}>(.*?)</${tag}>`))?.[1] ?? ''

async function readFeed(request: APIRequestContext, slug: string): Promise<Feed> {
  const response = await request.get(`${feedPath(slug)}/feed.xml`)
  const xml = await response.text()
  return {
    status: response.status(),
    contentType: response.headers()['content-type'] ?? '',
    xml,
    // The channel's title comes before any item's.
    channelTitle: tagText(xml, 'title'),
    items: [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => ({
      title: tagText(item, 'title'),
      link: tagText(item, 'link'),
    })),
  }
}

/** Distinct, ordered publish dates, so "newest first" is deterministic. */
const publishedOn = (month: number, day: number): string => new Date(Date.UTC(2026, month - 1, day, 12)).toISOString()

test.describe('S3.1–S3.3 feed, detail pages and RSS', () => {
  const ESCAPED_TITLE = 'Fixes <Boss> & <Loot>'
  let project: GameProject
  /** Oldest first. */
  let notes: PatchNote[]
  let draft: PatchNote
  let bProject: GameProject
  let bNote: PatchNote

  test.beforeAll(async ({ api, uniqueSlug, world }) => {
    const aOwner = api('aOwner')
    const bOwner = api('bOwner')
    project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('pn-feed'))
    notes = []
    for (let n = 1; n <= 12; n++) {
      notes.push(
        await createPatchNote(aOwner, project, uniqueSlug(`pn-feed-${n}`), {
          title: n === 5 ? ESCAPED_TITLE : `Field update ${n}`,
          versionLabel: `v1.0.${n}`,
          publishedAt: publishedOn(1, n),
        }),
      )
    }
    draft = await createPatchNote(aOwner, project, uniqueSlug('pn-feed-draft'), {
      title: 'Unreleased update',
      _status: 'draft',
    })
    bProject = await createProject(bOwner, world.tenants.B.id, uniqueSlug('pn-feed-b'))
    bNote = await createPatchNote(bOwner, bProject, uniqueSlug('pn-feed-b-1'), { title: 'Studio B update' })
  })

  test('S3.1 the feed pages newest first and hides drafts', async ({ page }) => {
    const newestFirst = notes.map((note) => note.title).reverse()

    await test.step('page 1 holds the ten newest notes with their version badges', async () => {
      await open(page, feedPath(project.slug))
      expect(await feedTitles(page)).toEqual(newestFirst.slice(0, 10))
      await expect(page.getByText('v1.0.12', { exact: true })).toBeVisible()
      await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText('Page 1 of 2')
      await expect(page.locator('body')).not.toContainText(draft.title)
    })

    await test.step('page 2 holds the oldest notes', async () => {
      await page.getByRole('link', { name: 'Older →' }).click()
      await expect(page).toHaveURL(`${feedPath(project.slug)}/page/2`)
      expect(await feedTitles(page)).toEqual(newestFirst.slice(10))
      await expect(page.getByRole('navigation', { name: 'Pagination' })).toContainText('Page 2 of 2')
    })

    await test.step('/page/1 and pages past the end are 404', async () => {
      await open(page, `${feedPath(project.slug)}/page/1`, 404)
      await open(page, `${feedPath(project.slug)}/page/3`, 404)
    })
  })

  test('S3.2 detail pages render rich text for this game’s published notes only', async ({ page }) => {
    const newest = notes[11]

    await test.step('a published note', async () => {
      await open(page, `${feedPath(project.slug)}/${newest.slug}`)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(newest.title)
      await expect(page.locator('article .payload-richtext')).toContainText(`Notes for ${newest.slug}`)
      await expect(page.getByText('v1.0.12', { exact: true })).toBeVisible()
    })

    await test.step('a draft is 404', () => open(page, `${feedPath(project.slug)}/${draft.slug}`, 404))

    await test.step('studio B’s note is 404 under studio A’s game, and live under its own', async () => {
      await open(page, `${feedPath(project.slug)}/${bNote.slug}`, 404)
      await open(page, `${feedPath(bProject.slug)}/${bNote.slug}`)
    })
  })

  test('S3.3 the RSS feed lists this game’s published notes with escaped titles', async ({ request, uniqueSlug }) => {
    const feed = await readFeed(request, project.slug)

    await test.step('an RSS document with every published note', () => {
      expect(feed.status).toBe(200)
      expect(feed.contentType).toContain('application/rss+xml')
      expect(feed.items).toHaveLength(12)
    })

    await test.step('titles are escaped', () => {
      expect(feed.xml).toContain('v1.0.5 — Fixes &lt;Boss&gt; &amp; &lt;Loot&gt;')
      expect(feed.xml).not.toContain(ESCAPED_TITLE)
    })

    await test.step('items link to the notes’ public pages, newest first', () => {
      expect(feed.items.map((item) => item.link)).toEqual(
        [...notes].reverse().map((note) => `${BASE_URL}${feedPath(project.slug)}/${note.slug}`),
      )
    })

    await test.step('no drafts and nothing from studio B', () => {
      expect(feed.xml).not.toContain(draft.title)
      expect(feed.xml).not.toContain(bNote.title)
    })

    await test.step('an unknown game is 404', async () => {
      expect((await readFeed(request, uniqueSlug('pn-no-such-game'))).status).toBe(404)
    })
  })
})

test.describe('S3.4 the public pages follow edits', () => {
  test('a partial edit shows everywhere and keeps the note’s date and place [F8]', async ({
    api,
    page,
    request,
    uniqueSlug,
    world,
  }) => {
    const aOwner = api('aOwner')
    const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('pn-edit'))
    const older = await createPatchNote(aOwner, project, uniqueSlug('pn-edit-old'), {
      title: 'Older update',
      publishedAt: publishedOn(2, 1),
    })
    const newer = await createPatchNote(aOwner, project, uniqueSlug('pn-edit-new'), {
      title: 'Newer update',
      publishedAt: publishedOn(2, 2),
    })
    await open(page, feedPath(project.slug))
    expect(await feedTitles(page)).toEqual([newer.title, older.title])

    const { status, body } = await aOwner.update('patch-notes', older.id, { title: 'Older update, corrected' })
    expect(status, JSON.stringify(body)).toBe(200)

    await test.step('the note keeps its publish date', async () => {
      expect((await aOwner.findByID('patch-notes', older.id)).body.publishedAt).toBe(older.publishedAt)
    })
    await test.step('the feed shows the new title in the same place', () =>
      eventually(async () => {
        await open(page, feedPath(project.slug))
        expect(await feedTitles(page)).toEqual([newer.title, 'Older update, corrected'])
      }),
    )
    await test.step('the detail page shows the new title', () =>
      eventually(async () => {
        await open(page, `${feedPath(project.slug)}/${older.slug}`)
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Older update, corrected', { timeout: 1_000 })
      }),
    )
    await test.step('RSS shows the new title in the same place', () =>
      eventually(async () => {
        const feed = await readFeed(request, project.slug)
        expect(feed.items.map((item) => item.title)).toEqual([newer.title, 'Older update, corrected'])
      }),
    )
  })

  test('a draft gets its publish date when it is published [F8]', async ({ api, page, uniqueSlug, world }) => {
    const aOwner = api('aOwner')
    const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('pn-draft-date'))
    const draft = await createPatchNote(aOwner, project, uniqueSlug('pn-draft-date-1'), {
      title: 'Written early, shipped later',
      _status: 'draft',
    })

    await test.step('saving a draft stamps no date', () => {
      expect(draft.publishedAt ?? null).toBeNull()
    })

    await test.step('publishing stamps the publish time', async () => {
      const before = Date.now()
      const { status, body } = await aOwner.update('patch-notes', draft.id, { _status: 'published' })
      expect(status, JSON.stringify(body)).toBe(200)
      expect(Date.parse(body.doc.publishedAt ?? '')).toBeGreaterThanOrEqual(before - 1_000)
      await eventually(async () => {
        await open(page, feedPath(project.slug))
        expect(await feedTitles(page)).toEqual([draft.title])
      })
    })
  })

  test('unpublishing removes a note from the feed, RSS and its page', async ({
    api,
    page,
    request,
    uniqueSlug,
    world,
  }) => {
    const aOwner = api('aOwner')
    const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('pn-unpublish'))
    const kept = await createPatchNote(aOwner, project, uniqueSlug('pn-unpublish-kept'), {
      title: 'Stays up',
      publishedAt: publishedOn(3, 1),
    })
    const pulled = await createPatchNote(aOwner, project, uniqueSlug('pn-unpublish-pulled'), {
      title: 'Pulled back',
      publishedAt: publishedOn(3, 2),
    })
    await open(page, feedPath(project.slug))
    expect(await feedTitles(page)).toEqual([pulled.title, kept.title])

    const { status, body } = await aOwner.update('patch-notes', pulled.id, { _status: 'draft' })
    expect(status, JSON.stringify(body)).toBe(200)

    await eventually(async () => {
      await open(page, feedPath(project.slug))
      expect(await feedTitles(page)).toEqual([kept.title])
      await open(page, `${feedPath(project.slug)}/${pulled.slug}`, 404)
      const feed = await readFeed(request, project.slug)
      expect(feed.items.map((item) => item.title)).toEqual([kept.title])
    })
  })

  test('moving a note to another game updates both feeds', async ({ api, page, uniqueSlug, world }) => {
    const aOwner = api('aOwner')
    const a1 = await createProject(aOwner, world.tenants.A.id, uniqueSlug('pn-move-a1'))
    const a2 = await createProject(aOwner, world.tenants.A.id, uniqueSlug('pn-move-a2'))
    const moving = await createPatchNote(aOwner, a1, uniqueSlug('pn-move-note'), {
      title: 'Moving update',
      publishedAt: publishedOn(4, 2),
    })
    const staying = await createPatchNote(aOwner, a2, uniqueSlug('pn-move-other'), {
      title: 'Already here',
      publishedAt: publishedOn(4, 1),
    })
    await open(page, feedPath(a1.slug))
    expect(await feedTitles(page)).toEqual([moving.title])
    await open(page, feedPath(a2.slug))
    expect(await feedTitles(page)).toEqual([staying.title])

    const { status, body } = await aOwner.update('patch-notes', moving.id, { gameProject: a2.id })
    expect(status, JSON.stringify(body)).toBe(200)

    await eventually(async () => {
      await open(page, feedPath(a1.slug))
      expect(await feedTitles(page)).toEqual([])
      await open(page, feedPath(a2.slug))
      expect(await feedTitles(page)).toEqual([moving.title, staying.title])
    })
  })

  test('renaming the game updates its patch-notes pages and RSS [F7]', async ({
    api,
    page,
    request,
    uniqueSlug,
    world,
  }) => {
    const aOwner = api('aOwner')
    const oldSlug = uniqueSlug('pn-rename')
    const newSlug = uniqueSlug('pn-renamed')
    const project = await createProject(aOwner, world.tenants.A.id, oldSlug, { name: 'Before Rename' })
    const note = await createPatchNote(aOwner, project, uniqueSlug('pn-rename-note'))
    const header = page.getByRole('banner')

    await test.step('the pages and RSS carry the old name', async () => {
      await open(page, feedPath(oldSlug))
      await expect(header).toContainText('Before Rename')
      await open(page, `${feedPath(oldSlug)}/${note.slug}`)
      await expect(header).toContainText('Before Rename')
      expect((await readFeed(request, oldSlug)).channelTitle).toBe('Before Rename — Patch Notes')
    })

    await test.step('a new name shows on the feed, the detail page and RSS', async () => {
      const { status, body } = await aOwner.update('game-projects', project.id, { name: 'After Rename' })
      expect(status, JSON.stringify(body)).toBe(200)
      await eventually(async () => {
        await open(page, feedPath(oldSlug))
        await expect(header).toContainText('After Rename', { timeout: 1_000 })
        await open(page, `${feedPath(oldSlug)}/${note.slug}`)
        await expect(header).toContainText('After Rename', { timeout: 1_000 })
        expect((await readFeed(request, oldSlug)).channelTitle).toBe('After Rename — Patch Notes')
      })
    })

    await test.step('a new slug moves the pages and retires the old ones', async () => {
      const { status, body } = await aOwner.update('game-projects', project.id, { slug: newSlug })
      expect(status, JSON.stringify(body)).toBe(200)
      await eventually(async () => {
        await open(page, feedPath(oldSlug), 404)
        await open(page, `${feedPath(oldSlug)}/${note.slug}`, 404)
        expect((await readFeed(request, oldSlug)).status).toBe(404)
        await open(page, `${feedPath(newSlug)}/${note.slug}`)
        await expect(header).toContainText('After Rename', { timeout: 1_000 })
      })
    })
  })
})
