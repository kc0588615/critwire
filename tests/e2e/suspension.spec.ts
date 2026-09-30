import type { Page } from '@playwright/test'
import type { CollectionSlug } from 'payload'

import type { Media } from '../../src/payload-types'
import type { ApiResult, RestClient } from './support/api'
import { TURNSTILE_DUMMY_TOKEN } from './support/env'
import {
  PNG_8PX,
  asStudioAdmin,
  createIssue,
  createPatchNote,
  createProject,
  eventually,
  expect,
  lexical,
  newRequestContext,
  pngOfWidth,
  test,
  uploadImage,
} from './support/fixtures'

/**
 * A super admin can suspend a studio. Its members can't publish or save
 * anything while it's suspended, and can again once it's lifted. Its
 * portal and files leave the public site until then.
 */

const SUSPENDED = 'This studio is suspended, so changes can’t be saved.'
/** The owner's dashboard banner. */
const SUSPENDED_BANNER = 'This studio is suspended: its portals are unavailable'

function expectSuspended(result: ApiResult<unknown>): void {
  expect(result.status, JSON.stringify(result.body)).toBe(403)
  expect(result.body.errors?.map((error) => error.message)).toEqual([SUSPENDED])
}

/** The original and one generated size: every way a portal page links a file. */
function fileURLs(media: Media): string[] {
  const size = media.sizes?.thumbnail?.url
  expect(media.url, 'the original has a URL').toBeTruthy()
  expect(size, 'the upload is wide enough for the thumbnail size').toBeTruthy()
  return [media.url as string, size as string]
}

async function expectFiles(client: RestClient, urls: string[], status: number): Promise<void> {
  for (const url of urls) expect((await client.raw('GET', url)).status, url).toBe(status)
}

async function setSuspended(superAdmin: RestClient, tenant: number, suspended: boolean): Promise<void> {
  const { status, body } = await superAdmin.update('tenants', tenant, { suspended })
  expect(status, JSON.stringify(body)).toBe(200)
  expect(body.doc.suspended).toBe(suspended)
}

test('S10.1 a suspended studio can’t publish', async ({ api, seedStudio }) => {
  const superAdmin = api('superAdmin')
  const { tenant, owner } = await seedStudio('s101')
  const client = owner.client

  const project = await createProject(client, tenant.id, `${tenant.slug}-game`)
  const published = await createPatchNote(client, project, 'published')
  const draft = await createPatchNote(client, project, 'draft', { _status: 'draft' })
  const issue = await createIssue(client, project, 'item')

  const suspend = (suspended: boolean) => setSuspended(superAdmin, tenant.id, suspended)
  await suspend(true)

  await test.step('every create is refused', async () => {
    expectSuspended(await client.create('game-projects', { name: 'New game', slug: `${tenant.slug}-new`, tenant: tenant.id }))
    const note = { gameProject: project.id, tenant: tenant.id, title: 'New update', content: lexical('New.') }
    expectSuspended(await client.create('patch-notes', { ...note, slug: 'new-published', _status: 'published' }))
    expectSuspended(await client.create('patch-notes', { ...note, slug: 'new-draft', _status: 'draft' }, { draft: true }))
    expectSuspended(
      await client.create('issues', {
        gameProject: project.id,
        tenant: tenant.id,
        title: 'New item',
        slug: 'new-item',
        category: 'OTHER',
      }),
    )
    expectSuspended(
      await client.upload('media', { name: 's101.png', mimeType: 'image/png', buffer: PNG_8PX }, { alt: 'Key art', tenant: tenant.id }),
    )
  })

  await test.step('every update is refused', async () => {
    expectSuspended(await client.update('game-projects', project.id, { description: 'Edited while suspended' }))
    expectSuspended(await client.update('patch-notes', draft.id, { _status: 'published' }))
    expectSuspended(await client.update('patch-notes', draft.id, { title: 'Draft edit' }, { draft: true }))
    expectSuspended(await client.update('patch-notes', published.id, { title: 'Published edit' }))
  })

  await test.step('nothing changed', async () => {
    const game = await superAdmin.findByID('game-projects', project.id, { depth: 0 })
    expect(game.body.description ?? null).toBeNull()
    const note = await superAdmin.findByID('patch-notes', draft.id, { draft: true, depth: 0 })
    expect(note.body._status).toBe('draft')
    expect(note.body.title).toBe(draft.title)
  })

  await test.step('deleting an item still works', async () => {
    const { status, body } = await client.remove('issues', issue.id)
    expect(status, JSON.stringify(body)).toBe(200)
  })

  await test.step('after the suspension is lifted, a create works again', async () => {
    await suspend(false)
    await createIssue(client, project, 'after-lift')
  })
})

test('S10.2 a portal’s files load for signed-in visitors of other studios too', async ({
  api,
  seedStudio,
  seedUser,
}) => {
  const { tenant, owner } = await seedStudio('s102')
  const banner = await uploadImage(owner.client, tenant.id, 's102-banner.png', 'Key art', await pngOfWidth(400))
  const urls = fileURLs(banner)
  const withoutStudio = await seedUser('s102-no-studio')

  await test.step('an anonymous visitor', () => expectFiles(api('anonymous'), urls, 200))
  await test.step('the owner of another studio', () => expectFiles(api('bOwner'), urls, 200))
  await test.step('a signed-in user with no studio', () => expectFiles(withoutStudio.client, urls, 200))
})

test('S10.3 a suspended studio’s portal is unavailable until it’s lifted', async ({
  api,
  browser,
  page,
  playwright,
  seedStudio,
}) => {
  const superAdmin = api('superAdmin')
  const anonymous = api('anonymous')
  const studio = await seedStudio('s103')
  const { tenant, owner } = studio
  const banner = await uploadImage(owner.client, tenant.id, 's103-banner.png', 'Key art', await pngOfWidth(400))
  const project = await createProject(owner.client, tenant.id, `${tenant.slug}-game`, {
    name: `Driftwood ${tenant.slug}`,
    description: 'A game about a suspended studio.',
    banner: banner.id,
  })
  const note = await createPatchNote(owner.client, project, 'launch', { title: `Launch notes ${tenant.slug}` })
  const issue = await createIssue(owner.client, project, 'crash', { title: `Crash on load ${tenant.slug}` })

  const hub = `/g/${project.slug}`
  const pages = [
    hub,
    `${hub}/updates`,
    `${hub}/updates/${note.slug}`,
    `${hub}/feedback`,
    `${hub}/feedback/${issue.slug}`,
    `${hub}/feedback/new`,
    `${hub}/contact`,
  ]
  const rss = `${hub}/updates/feed.xml`
  const files = fileURLs(banner)
  const docs: [CollectionSlug, number][] = [
    ['game-projects', project.id],
    ['patch-notes', note.id],
    ['issues', issue.id],
    ['media', banner.id],
  ]

  const expectLive = async (target: Page, path: string) => {
    const response = await target.goto(path)
    expect(response?.status(), path).toBe(200)
    expect(new URL(target.url()).pathname).toBe(path)
    await expect(target.locator('body')).toContainText(project.name)
  }
  const expectRSS = async (status: number) => {
    expect((await anonymous.raw('GET', rss)).status, rss).toBe(status)
  }
  const expectAnonymousDocs = async (count: number) => {
    for (const [collection, id] of docs) {
      const { status, body } = await anonymous.find(collection, { where: { id: { equals: id } }, depth: 0 })
      expect(status, collection).toBe(200)
      expect(body.totalDocs, collection).toBe(count)
    }
  }

  await test.step('warm the caches while the portal is live', async () => {
    for (const path of pages) await expectLive(page, path)
    await expectRSS(200)
    await expectFiles(anonymous, files, 200)
    await expectAnonymousDocs(1)
  })

  await setSuspended(superAdmin, tenant.id, true)

  await test.step('every page lands on /unavailable, with none of the game’s text', async () => {
    for (const path of pages) {
      await eventually(async () => {
        await page.goto(path)
        expect(new URL(page.url()).pathname, path).toBe('/unavailable')
      })
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('This portal is unavailable.')
      const body = await page.locator('body').innerText()
      for (const text of [project.name, project.description as string, note.title, issue.title]) {
        expect(body).not.toContain(text)
      }
    }
    await eventually(() => expectRSS(404))
  })

  await test.step('its files answer 403, except to the studio', async () => {
    await expectFiles(anonymous, files, 403)
    await expectFiles(api('bOwner'), files, 403)
    await expectFiles(owner.client, files, 200)
  })

  await test.step('anonymous REST finds none of its documents', () => expectAnonymousDocs(0))

  await test.step('votes and both forms answer 404', async () => {
    const player = await newRequestContext(playwright)
    try {
      const vote = await player.post('/api/vote', { data: { issueId: issue.id } })
      expect(vote.status()).toBe(404)
    } finally {
      await player.dispose()
    }
    const report = await anonymous.raw('POST', `${hub}/feedback/new/submit`, {
      data: {
        title: 'Map fails to open',
        description: 'Pressing M does nothing after loading a save.',
        category: 'OTHER',
        turnstileToken: TURNSTILE_DUMMY_TOKEN,
      },
    })
    expect(report.status, JSON.stringify(report.body)).toBe(404)
    const contact = await anonymous.raw('POST', `${hub}/contact/submit`, {
      data: { message: 'Hello studio, are you still there?', turnstileToken: TURNSTILE_DUMMY_TOKEN },
    })
    expect(contact.status, JSON.stringify(contact.body)).toBe(404)
  })

  await test.step('the owner’s dashboard says the studio is suspended', () =>
    asStudioAdmin(browser, studio, async (admin) => {
      await expect(admin.getByText(SUSPENDED_BANNER)).toBeVisible()
      await expect(admin.getByRole('region', { name: `Studio ${tenant.slug}` }).getByText(project.name)).toBeVisible()
      await expect(admin.getByRole('region', { name: `Studio ${tenant.slug}` })).toContainText('Unavailable: suspended')
    }),
  )

  await setSuspended(superAdmin, tenant.id, false)

  await test.step('after the suspension is lifted, the banner is gone', () =>
    asStudioAdmin(browser, studio, async (admin) => {
      await expect(admin.getByRole('region', { name: `Studio ${tenant.slug}` })).toContainText('Live')
      await expect(admin.getByText(SUSPENDED_BANNER)).toHaveCount(0)
    }),
  )

  await test.step('after the suspension is lifted, the portal and its files come back', async () => {
    for (const path of pages) await eventually(() => expectLive(page, path))
    await eventually(() => expectRSS(200))
    await expectFiles(anonymous, files, 200)
    await expectAnonymousDocs(1)
  })
})
