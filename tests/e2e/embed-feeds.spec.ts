import type { APIRequestContext, APIResponse, Browser } from '@playwright/test'
import { extractID } from 'payload/shared'

import type { GameProject } from '../../src/payload-types'
import { EMBED_CACHE_CONTROL } from '../../src/lib/embed/cacheControl'
import { portalPaths } from '../../src/lib/game-portal/paths'
import { BASE_URL } from './support/env'
import type { EmbedHost } from './support/embedHost'
import {
  castVote,
  createIssue,
  createPatchNote,
  createProject,
  createReport,
  expect,
  hold,
  newRequestContext,
  test,
} from './support/fixtures'

/**
 * The public JSON feeds, `/g/<game>/feedback.json` (contract v1) and
 * `/g/<game>/updates.json` (JSON Feed 1.1), and the freshness of
 * everything a studio's site shows: no server cache, so an edit, a hold
 * or a suspension is in the next response. A browser may keep an embed
 * for 60 s, so every reload here is a new browser context or `request`.
 */

const FEEDBACK_KEYS = ['feed_url', 'home_page_url', 'items', 'title', 'version']
const FEEDBACK_ITEM_KEYS = ['date_created', 'id', 'shipped_in', 'stage', 'summary', 'title', 'type', 'url', 'votes']
const UPDATES_KEYS = ['description', 'feed_url', 'home_page_url', 'items', 'language', 'title', 'version']
const UPDATE_ITEM_KEYS = ['content_text', 'date_published', 'id', 'summary', 'title', 'url']
const INTERNAL_STATUSES = [
  'REPORTED',
  'INVESTIGATING',
  'NEEDS_MORE_INFO',
  'WORKAROUND_AVAILABLE',
  'PLANNED',
  'IN_PROGRESS',
  'FIXED',
  'CLOSED',
]

const site = (path: string) => `${BASE_URL}${path}`
const sorted = (value: object) => Object.keys(value).sort()

/** A feed answer, with the headers every answer carries, 404s included (C4, K1). */
async function getFeed(player: APIRequestContext, path: string, status = 200): Promise<APIResponse> {
  const response = await player.get(path, { maxRedirects: 0 })
  expect(response.status(), path).toBe(status)
  const headers = response.headers()
  expect(headers['access-control-allow-origin'], path).toBe('*')
  expect(headers['access-control-allow-credentials'], path).toBeUndefined()
  expect(headers['cache-control'], path).toBe(EMBED_CACHE_CONTROL)
  expect(headers['set-cookie'], path).toBeUndefined()
  return response
}

async function expectFeedsMissing(player: APIRequestContext, slug: string): Promise<void> {
  const paths = portalPaths(slug)
  for (const path of [paths.feedbackJSON, paths.updatesJSON]) {
    const response = await getFeed(player, path, 404)
    expect(response.headers()['content-type'], path).toBe('application/json; charset=utf-8')
    expect(await response.json(), path).toEqual({ error: 'Not found.' })
  }
}

/** A widget through the script, in a browser context with no cache. */
async function loadEmbed(browser: Browser, embedHost: EmbedHost, slug: string, widget: 'board' | 'updates') {
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.goto(embedHost.url({ game: slug, widget }))
  return { context, page, frame: page.frameLocator('iframe') }
}

test('E8 the feeds show what the portal shows, and nothing private', async ({
  api,
  embedHost,
  page,
  playwright,
  uniqueSlug,
  world,
}) => {
  const aOwner = api('aOwner')
  const superAdmin = api('superAdmin')
  const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('feeds'))
  const paths = portalPaths(project.slug)
  const slug = (label: string) => uniqueSlug(`feeds-${label}`)
  const email = `feeds-${project.slug}@e2e.test`

  // Updates, oldest first: two published, a draft and a held one.
  const plain = await createPatchNote(aOwner, project, slug('plain'), { title: 'Quiet update' })
  const versioned = await createPatchNote(aOwner, project, slug('versioned'), {
    title: 'Harbor hotfix',
    versionLabel: 'v1.4',
    summary: 'Fixes the harbor.',
  })
  const draft = await createPatchNote(aOwner, project, slug('draft'), { title: 'Draft update', _status: 'draft' })
  const heldNote = await createPatchNote(aOwner, project, slug('held-note'), { title: 'Held update' })
  await hold(superAdmin, 'patch-notes', heldNote.id)

  // Items, oldest first. The first comes from a player's report, with an email.
  const report = await createReport(aOwner, project, {
    title: 'Compass points south',
    description: 'The needle always points south.',
    category: 'AUDIO',
    submitterEmail: email,
  })
  const published = await aOwner.update('issue-reports', report.id, { status: 'PUBLISHED' })
  expect(published.status, JSON.stringify(published.body)).toBe(200)
  const fromReport = extractID(published.body.doc.issue!)
  const bare = await createIssue(aOwner, project, slug('bare'), {
    title: 'Save slot vanishes',
    status: 'NEEDS_MORE_INFO',
    needsMoreInfoText: 'Which save slot?',
  })
  const shipped = await createIssue(aOwner, project, slug('shipped'), {
    title: 'Harbor crash',
    summary: 'The game crashes at the harbor.',
    status: 'FIXED',
    fixedInPatchNote: versioned.id,
  })
  const shippedInDraft = await createIssue(aOwner, project, slug('shipped-draft'), {
    title: 'Fixed in a draft',
    status: 'FIXED',
    fixedInPatchNote: draft.id,
  })
  const shippedInHeld = await createIssue(aOwner, project, slug('shipped-held'), {
    title: 'Fixed in a held update',
    status: 'FIXED',
    fixedInPatchNote: heldNote.id,
  })
  const idea = await createIssue(aOwner, project, slug('idea'), {
    title: 'Fishing at night',
    type: 'IDEA',
    status: 'PLANNED',
    category: 'AUDIO',
  })
  // Never in a feed: a private item, an archived one and a submission still under review.
  await createIssue(aOwner, project, slug('private'), { title: 'Private item', status: 'PLANNED', isPublic: false })
  await createIssue(aOwner, project, slug('archived'), { title: 'Archived item', status: 'CLOSED' })
  await createReport(aOwner, project, { title: 'Report under review', submitterEmail: email })
  await castVote(playwright, idea.id)
  await castVote(playwright, idea.id)
  await castVote(playwright, shipped.id)

  const player = await newRequestContext(playwright)
  try {
    await test.step('feedback.json: contract v1, public items only, ranked (C1–C3)', async () => {
      const response = await getFeed(player, paths.feedbackJSON)
      expect(response.headers()['content-type']).toBe('application/json; charset=utf-8')
      const text = await response.text()
      const feed = JSON.parse(text)
      expect(sorted(feed)).toEqual(FEEDBACK_KEYS)
      expect(feed).toMatchObject({
        version: 1,
        title: `${project.name} feedback`,
        home_page_url: site(paths.feedback),
        feed_url: site(paths.feedbackJSON),
      })
      for (const item of feed.items) expect(sorted(item), item.title).toEqual(FEEDBACK_ITEM_KEYS)

      const issue = (id: number, slugOf: string, rest: object) => ({
        id: String(id),
        url: site(paths.feedbackItem(slugOf)),
        date_created: expect.stringMatching(/^\d{4}-\d\d-\d\dT[\d:.]+Z$/),
        ...rest,
      })
      const { body: reported } = await aOwner.findByID('issues', fromReport)
      // Votes first, then newest.
      expect(feed.items).toEqual([
        issue(idea.id, idea.slug, {
          title: 'Fishing at night',
          summary: null,
          type: 'idea',
          stage: 'planned',
          votes: 2,
          shipped_in: null,
        }),
        issue(shipped.id, shipped.slug, {
          title: 'Harbor crash',
          summary: 'The game crashes at the harbor.',
          type: 'bug',
          stage: 'shipped',
          votes: 1,
          shipped_in: { version: 'v1.4', title: 'Harbor hotfix', url: site(paths.update(versioned.slug)) },
        }),
        issue(shippedInHeld.id, shippedInHeld.slug, {
          title: 'Fixed in a held update',
          summary: null,
          type: 'bug',
          stage: 'shipped',
          votes: 0,
          shipped_in: null,
        }),
        issue(shippedInDraft.id, shippedInDraft.slug, {
          title: 'Fixed in a draft',
          summary: null,
          type: 'bug',
          stage: 'shipped',
          votes: 0,
          shipped_in: null,
        }),
        issue(bare.id, bare.slug, {
          title: 'Save slot vanishes',
          summary: null,
          type: 'bug',
          stage: 'under-review',
          votes: 0,
          shipped_in: null,
        }),
        issue(fromReport, reported.slug, {
          title: 'Compass points south',
          summary: 'The needle always points south.',
          type: 'bug',
          stage: 'under-review',
          votes: 0,
          shipped_in: null,
        }),
      ])

      for (const secret of [
        email,
        'Private item',
        'Archived item',
        'Report under review',
        'Draft update',
        'Held update',
        'AUDIO',
        ...INTERNAL_STATUSES,
      ]) {
        expect(text, secret).not.toContain(secret)
      }
    })

    await test.step('updates.json: JSON Feed 1.1, published updates only, newest first', async () => {
      const response = await getFeed(player, paths.updatesJSON)
      expect(response.headers()['content-type']).toBe('application/feed+json; charset=utf-8')
      const text = await response.text()
      const feed = JSON.parse(text)
      expect(sorted(feed)).toEqual(UPDATES_KEYS)
      expect(feed).toMatchObject({
        version: 'https://jsonfeed.org/version/1.1',
        title: `${project.name} — Updates`,
        home_page_url: site(paths.updates),
        feed_url: site(paths.updatesJSON),
        description: `The latest updates for ${project.name}.`,
        language: 'en',
      })
      const date = expect.stringMatching(/^\d{4}-\d\d-\d\dT[\d:.]+Z$/)
      expect(feed.items).toEqual([
        {
          id: String(versioned.id),
          url: site(paths.update(versioned.slug)),
          title: 'v1.4 — Harbor hotfix',
          summary: 'Fixes the harbor.',
          content_text: 'Fixes the harbor.',
          date_published: date,
        },
        // No summary: the key is left out, and the text is the title.
        {
          id: String(plain.id),
          url: site(paths.update(plain.slug)),
          title: 'Quiet update',
          content_text: 'Quiet update',
          date_published: date,
        },
      ])
      expect(sorted(feed.items[0])).toEqual(UPDATE_ITEM_KEYS)
      for (const secret of ['Draft update', 'Held update', email]) expect(text, secret).not.toContain(secret)
    })

    await test.step('another site may fetch both, but never with credentials (C4)', async () => {
      await page.goto(embedHost.url({ game: project.slug, widget: 'updates', kind: 'iframe' }))
      for (const path of [paths.feedbackJSON, paths.updatesJSON]) {
        const result = await page.evaluate(async (url) => {
          const plainFetch = await fetch(url).then(
            async (response) => ({ ok: response.ok, items: ((await response.json()) as { items: unknown[] }).items.length }),
            (error: Error) => ({ error: error.message }),
          )
          const withCredentials = await fetch(url, { credentials: 'include' }).then(
            () => 'allowed',
            () => 'blocked',
          )
          return { plainFetch, withCredentials }
        }, site(path))
        expect(result, path).toEqual({ plainFetch: { ok: true, items: expect.any(Number) }, withCredentials: 'blocked' })
      }
    })
  } finally {
    await player.dispose()
  }
})

test('E9 a held game and a suspended studio give an empty embed and no feeds, until lifted', async ({
  api,
  browser,
  embedHost,
  playwright,
  seedStudio,
  uniqueSlug,
  world,
}) => {
  const superAdmin = api('superAdmin')
  const aOwner = api('aOwner')
  const held = await createProject(aOwner, world.tenants.A.id, uniqueSlug('feeds-held'))
  await createPatchNote(aOwner, held, uniqueSlug('feeds-held-update'), { title: 'Held game update' })
  await createIssue(aOwner, held, uniqueSlug('feeds-held-item'), { title: 'Held game item' })

  const studio = await seedStudio('feeds-suspended')
  const suspended = await createProject(studio.owner.client, studio.tenant.id, `${studio.tenant.slug}-game`)
  await createPatchNote(studio.owner.client, suspended, `${studio.tenant.slug}-update`, {
    title: 'Suspended game update',
  })
  await createIssue(studio.owner.client, suspended, `${studio.tenant.slug}-item`, { title: 'Suspended game item' })

  // Each game, with its update's title and its item's.
  const games: [GameProject, string, string][] = [
    [held, 'Held game update', 'Held game item'],
    [suspended, 'Suspended game update', 'Suspended game item'],
  ]
  const setSuspended = async (value: boolean) => {
    const { status, body } = await superAdmin.update('tenants', studio.tenant.id, { suspended: value })
    expect(status, JSON.stringify(body)).toBe(200)
  }

  const expectPublic = async (player: APIRequestContext) => {
    for (const [game, update, item] of games) {
      const updates = await loadEmbed(browser, embedHost, game.slug, 'updates')
      await expect(updates.frame.getByRole('heading', { name: update })).toBeVisible()
      await updates.context.close()
      const board = await loadEmbed(browser, embedHost, game.slug, 'board')
      await expect(board.frame.getByRole('link', { name: item, exact: true })).toBeVisible()
      await board.context.close()
      const paths = portalPaths(game.slug)
      expect((await (await getFeed(player, paths.feedbackJSON)).json()).items).toHaveLength(1)
      expect((await (await getFeed(player, paths.updatesJSON)).json()).items).toHaveLength(1)
    }
  }

  const player = await newRequestContext(playwright)
  try {
    await test.step('while public, both show their content', async () => {
      await expectPublic(player)
    })

    await hold(superAdmin, 'game-projects', held.id)
    await setSuspended(true)

    for (const [game] of games) {
      for (const widget of ['board', 'updates'] as const) {
        await test.step(`${game.slug}: an empty ${widget} frame of height 0 with no text (K3, K4)`, async () => {
          const embed = await loadEmbed(browser, embedHost, game.slug, widget)
          await expect
            .poll(() => embed.page.locator('iframe').evaluate((element) => element.getBoundingClientRect().height))
            .toBe(0)
          await expect(embed.frame.locator('.cw-embed[data-empty]')).toHaveCount(1)
          expect(await embed.frame.locator('body').innerText()).toBe('')
          await embed.context.close()

          const response = await player.get(portalPaths(game.slug).embed(widget))
          expect(response.status()).toBe(200)
          expect(response.headers()['cache-control']).toBe(EMBED_CACHE_CONTROL)
        })
      }

      await test.step(`${game.slug}: both feeds 404, with CORS (K2)`, async () => {
        await expectFeedsMissing(player, game.slug)
      })
    }

    await hold(superAdmin, 'game-projects', held.id, false)
    await setSuspended(false)

    await test.step('lifting the hold and the suspension restores both', async () => {
      await expectPublic(player)
    })
  } finally {
    await player.dispose()
  }
})

test('E10 an edit shows in the next response of both embeds and both feeds', async ({
  api,
  playwright,
  uniqueSlug,
  world,
}) => {
  const aOwner = api('aOwner')
  const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('feeds-fresh'))
  const paths = portalPaths(project.slug)
  const note = await createPatchNote(aOwner, project, uniqueSlug('feeds-fresh-update'), {
    title: 'First update',
    versionLabel: 'v1.0',
  })
  const issue = await createIssue(aOwner, project, uniqueSlug('feeds-fresh-item'), { title: 'Lantern flickers' })

  const player = await newRequestContext(playwright)
  const embedHTML = async (widget: 'board' | 'updates') => {
    const response = await player.get(paths.embed(widget))
    expect(response.status()).toBe(200)
    return response.text()
  }
  const updatesEmbed = () => embedHTML('updates')
  const boardEmbed = () => embedHTML('board')
  const feedbackItem = async () => (await (await getFeed(player, paths.feedbackJSON)).json()).items[0]
  const updates = async () => (await (await getFeed(player, paths.updatesJSON)).json()).items

  const update = async (collection: 'issues' | 'patch-notes', id: number, data: object) => {
    const { status, body } = await aOwner.update(collection, id, data)
    expect(status, JSON.stringify(body)).toBe(200)
  }

  try {
    await test.step('before: the item is open, and the update lists nothing', async () => {
      expect(await feedbackItem()).toMatchObject({ title: 'Lantern flickers', stage: 'under-review', shipped_in: null })
      expect(await updatesEmbed()).not.toContain('From your feedback')
      expect(await boardEmbed()).toContain('Lantern flickers')
      expect(await boardEmbed()).not.toContain('Shipped in')
      // Cached nowhere on the server: these responses must not be what the next ones show.
    })

    await test.step('linking the item to the update', async () => {
      await update('issues', issue.id, { status: 'FIXED', fixedInPatchNote: note.id })
      expect(await feedbackItem()).toMatchObject({
        stage: 'shipped',
        shipped_in: { version: 'v1.0', title: 'First update', url: site(paths.update(note.slug)) },
      })
      const html = await updatesEmbed()
      expect(html).toContain('From your feedback')
      expect(html).toContain('Lantern flickers')
      expect(await boardEmbed()).toContain('Shipped in v1.0')
    })

    await test.step('editing the item’s title', async () => {
      await update('issues', issue.id, { title: 'Lantern flickers at dusk' })
      expect((await feedbackItem()).title).toBe('Lantern flickers at dusk')
      expect(await updatesEmbed()).toContain('Lantern flickers at dusk')
      expect(await boardEmbed()).toContain('Lantern flickers at dusk')
    })

    await test.step('publishing an update', async () => {
      const draft = await createPatchNote(aOwner, project, uniqueSlug('feeds-fresh-next'), {
        title: 'Second update',
        _status: 'draft',
      })
      expect((await updates()).map((item: { title: string }) => item.title)).toEqual(['v1.0 — First update'])
      expect(await updatesEmbed()).not.toContain('Second update')

      await update('patch-notes', draft.id, { _status: 'published' })
      expect((await updates()).map((item: { title: string }) => item.title)).toEqual([
        'Second update',
        'v1.0 — First update',
      ])
      expect(await updatesEmbed()).toContain('Second update')
    })
  } finally {
    await player.dispose()
  }
})
