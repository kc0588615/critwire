import type { GameProject, PatchNote } from '../../src/payload-types'
import type { RestClient } from './support/api'
import { createPatchNote, createProject, eventually, expect, test } from './support/fixtures'

/**
 * Content held for review isn't public: a game or an update a super admin
 * flags leaves the portal until it's unflagged.
 */

const REASON = 'Held by an E2E test.'

async function setFlagged(
  superAdmin: RestClient,
  collection: 'game-projects' | 'patch-notes',
  id: number,
  flagged: boolean,
): Promise<void> {
  const { status, body } = await superAdmin.update(collection, id, { flagged, flagReasons: flagged ? REASON : '' })
  expect(status, JSON.stringify(body)).toBe(200)
  expect(body.doc.flagged).toBe(flagged)
}

test('S13.1 a flagged game shows /unavailable until it’s unflagged', async ({ api, page, seedStudio }) => {
  const superAdmin = api('superAdmin')
  const { tenant, owner } = await seedStudio('s131')
  const project = await createProject(owner.client, tenant.id, `${tenant.slug}-game`, {
    name: `Held Harbor ${tenant.slug}`,
  })
  const hub = `/g/${project.slug}`

  const expectHub = async () => {
    const response = await page.goto(hub)
    expect(response?.status()).toBe(200)
    expect(new URL(page.url()).pathname).toBe(hub)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(project.name)
  }
  await expectHub()

  await setFlagged(superAdmin, 'game-projects', project.id, true)
  await eventually(async () => {
    await page.goto(hub)
    expect(new URL(page.url()).pathname).toBe('/unavailable')
  })
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('This portal is unavailable.')
  await expect(page.locator('body')).not.toContainText(project.name)

  await test.step('anonymous REST no longer finds it', async () => {
    const { body } = await api('anonymous').find('game-projects', { where: { id: { equals: project.id } } })
    expect(body.totalDocs).toBe(0)
  })

  await setFlagged(superAdmin, 'game-projects', project.id, false)
  await eventually(expectHub)
})

test('S13.2 a flagged update leaves the feed, its page, RSS and the hub until it’s unflagged', async ({
  api,
  page,
  seedStudio,
}) => {
  const superAdmin = api('superAdmin')
  const anonymous = api('anonymous')
  const { tenant, owner } = await seedStudio('s132')
  const project: GameProject = await createProject(owner.client, tenant.id, `${tenant.slug}-game`)
  const note: PatchNote = await createPatchNote(owner.client, project, 'held', { title: `Held update ${tenant.slug}` })

  const hub = `/g/${project.slug}`
  const updates = `${hub}/updates`
  const notePage = `${updates}/${note.slug}`
  const rss = `${updates}/feed.xml`

  const expectListed = async (listed: boolean) => {
    for (const path of [hub, updates]) {
      const response = await page.goto(path)
      expect(response?.status(), path).toBe(200)
      if (listed) await expect(page.getByRole('link', { name: note.title }).first(), path).toBeVisible()
      else await expect(page.getByRole('link', { name: note.title }), path).toHaveCount(0)
    }
    const response = await page.goto(notePage)
    expect(response?.status(), notePage).toBe(listed ? 200 : 404)
    const feed = await anonymous.raw<string>('GET', rss)
    expect(feed.status).toBe(200)
    if (listed) expect(feed.body).toContain(note.title)
    else expect(feed.body).not.toContain(note.title)
  }

  await expectListed(true)

  await setFlagged(superAdmin, 'patch-notes', note.id, true)
  await eventually(() => expectListed(false))

  await test.step('anonymous REST no longer finds it', async () => {
    const { body } = await anonymous.find('patch-notes', { where: { id: { equals: note.id } } })
    expect(body.totalDocs).toBe(0)
  })

  await setFlagged(superAdmin, 'patch-notes', note.id, false)
  await eventually(() => expectListed(true))
})
