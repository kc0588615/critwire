import type { Page } from '@playwright/test'

import type { GameProject, PatchNote } from '../../src/payload-types'
import type { RestClient } from './support/api'
import { storageStatePath } from './support/env'
import {
  asStudioAdmin,
  createPatchNote,
  createProject,
  eventually,
  expect,
  lexical,
  test,
} from './support/fixtures'

/**
 * Content held for review isn't public: a game or an update a super admin
 * flags leaves the portal until it's unflagged. The content filter flags a
 * studio's own text the same way, on every write that changes it.
 */

const REASON = 'Held by an E2E test.'
const OFFENSIVE_REASON = /^Offensive word: ".+"$/

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

/** Whether `note` is on the hub, the feed, its own page and RSS. */
async function expectUpdateListed(
  page: Page,
  anonymous: RestClient,
  project: GameProject,
  note: PatchNote,
  listed: boolean,
): Promise<void> {
  const hub = `/g/${project.slug}`
  const updates = `${hub}/updates`
  for (const path of [hub, updates]) {
    const response = await page.goto(path)
    expect(response?.status(), path).toBe(200)
    if (listed) await expect(page.getByRole('link', { name: note.title }).first(), path).toBeVisible()
    else await expect(page.getByRole('link', { name: note.title }), path).toHaveCount(0)
  }
  const notePage = `${updates}/${note.slug}`
  const response = await page.goto(notePage)
  expect(response?.status(), notePage).toBe(listed ? 200 : 404)
  const feed = await anonymous.raw<string>('GET', `${updates}/feed.xml`)
  expect(feed.status).toBe(200)
  if (listed) expect(feed.body).toContain(note.title)
  else expect(feed.body).not.toContain(note.title)
}

/** Whether the game's hub shows its portal or `/unavailable`. */
async function expectHub(page: Page, project: GameProject, shown: boolean): Promise<void> {
  const hub = `/g/${project.slug}`
  const response = await page.goto(hub)
  expect(response?.status()).toBe(200)
  if (shown) {
    expect(new URL(page.url()).pathname).toBe(hub)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(project.name)
  } else {
    expect(new URL(page.url()).pathname).toBe('/unavailable')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('This portal is unavailable.')
    await expect(page.locator('body')).not.toContainText(project.name)
  }
}

test('S13.1 a flagged game shows /unavailable until it’s unflagged', async ({ api, page, seedStudio }) => {
  const superAdmin = api('superAdmin')
  const { tenant, owner } = await seedStudio('s131')
  const project = await createProject(owner.client, tenant.id, `${tenant.slug}-game`, {
    name: `Held Harbor ${tenant.slug}`,
  })
  await expectHub(page, project, true)

  await setFlagged(superAdmin, 'game-projects', project.id, true)
  await eventually(() => expectHub(page, project, false))

  await test.step('anonymous REST no longer finds it', async () => {
    const { body } = await api('anonymous').find('game-projects', { where: { id: { equals: project.id } } })
    expect(body.totalDocs).toBe(0)
  })

  await setFlagged(superAdmin, 'game-projects', project.id, false)
  await eventually(() => expectHub(page, project, true))
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

  await expectUpdateListed(page, anonymous, project, note, true)

  await setFlagged(superAdmin, 'patch-notes', note.id, true)
  await eventually(() => expectUpdateListed(page, anonymous, project, note, false))

  await test.step('anonymous REST no longer finds it', async () => {
    const { body } = await anonymous.find('patch-notes', { where: { id: { equals: note.id } } })
    expect(body.totalDocs).toBe(0)
  })

  await setFlagged(superAdmin, 'patch-notes', note.id, false)
  await eventually(() => expectUpdateListed(page, anonymous, project, note, true))
})

test('S13.3 a game named with an offensive word is held until a super admin approves it', async ({
  api,
  browser,
  page,
  seedStudio,
}) => {
  const superAdmin = api('superAdmin')
  const studio = await seedStudio('s133')
  const { tenant, owner } = studio
  const project = await createProject(owner.client, tenant.id, `${tenant.slug}-game`, {
    name: `Fucking Harbor ${tenant.slug}`,
  })

  await test.step('it is stored flagged, with its reason, and the hub is unavailable', async () => {
    expect(project.flagged).toBe(true)
    expect(project.flagReasons).toMatch(OFFENSIVE_REASON)
    await expectHub(page, project, false)
  })

  await test.step("the owner's admin shows the flag and the reason, read-only", async () => {
    await asStudioAdmin(browser, studio, async (adminPage) => {
      await adminPage.goto(`/admin/collections/game-projects/${project.id}`)
      await expect(adminPage.locator('#field-name')).toHaveValue(project.name)
      await expect(adminPage.locator('#field-flagged')).toBeChecked()
      await expect(adminPage.locator('#field-flagged')).toBeDisabled()
      await expect(adminPage.locator('#field-flagReasons')).toHaveValue(OFFENSIVE_REASON)
      await expect(adminPage.locator('#field-flagReasons')).toBeDisabled()
    })
  })

  await test.step('a super admin unticks it in the admin and the hub appears', async () => {
    const context = await browser.newContext({ storageState: storageStatePath('superAdmin') })
    try {
      const adminPage = await context.newPage()
      await adminPage.goto(`/admin/collections/game-projects/${project.id}`)
      await expect(adminPage.locator('#field-name')).toHaveValue(project.name)
      // A click before hydration changes only the DOM; the reasons field
      // hiding shows the form itself saw `flagged` go off.
      await expect(async () => {
        await adminPage.locator('#field-flagged').uncheck()
        await expect(adminPage.locator('#field-flagReasons')).toHaveCount(0, { timeout: 1_000 })
      }).toPass()
      await adminPage.getByRole('button', { name: 'Save', exact: true }).click()
      await expect(adminPage.locator('[data-sonner-toast][data-type="success"]')).toBeVisible()
    } finally {
      await context.close()
    }
    const { body } = await superAdmin.findByID('game-projects', project.id)
    expect(body.flagged).toBe(false)
    await eventually(() => expectHub(page, project, true))
  })

  await test.step('the owner saving the unchanged name keeps it approved', async () => {
    const { status, body } = await owner.client.update('game-projects', project.id, { name: project.name })
    expect(status, JSON.stringify(body)).toBe(200)
    expect(body.doc.flagged).toBe(false)
    await expectHub(page, project, true)
  })
})

test('S13.4 an update with an offensive word stays off the portal until a super admin approves it', async ({
  api,
  page,
  seedStudio,
}) => {
  const superAdmin = api('superAdmin')
  const anonymous = api('anonymous')
  const { tenant, owner } = await seedStudio('s134')
  const project = await createProject(owner.client, tenant.id, `${tenant.slug}-game`)

  await test.step('published with the word in its content, it is held', async () => {
    const note = await createPatchNote(owner.client, project, 'held-content', {
      title: `Harbor fixes ${tenant.slug}`,
      content: lexical('Fixed the fucking door in the cellar.'),
    })
    expect(note.flagged).toBe(true)
    expect(note.flagReasons).toMatch(OFFENSIVE_REASON)
    await expectUpdateListed(page, anonymous, project, note, false)

    await setFlagged(superAdmin, 'patch-notes', note.id, false)
    await eventually(() => expectUpdateListed(page, anonymous, project, note, true))
  })

  await test.step('a draft that adds the word is held when it is published', async () => {
    const note = await createPatchNote(owner.client, project, 'held-draft', { title: `Clean notes ${tenant.slug}` })
    expect(note.flagged).toBe(false)

    const draft = await owner.client.update(
      'patch-notes',
      note.id,
      { summary: 'What the fuck happened to the ferry' },
      { draft: 'true' },
    )
    expect(draft.status, JSON.stringify(draft.body)).toBe(200)
    await expectUpdateListed(page, anonymous, project, note, true)

    const publish = await owner.client.update('patch-notes', note.id, { _status: 'published' })
    expect(publish.status, JSON.stringify(publish.body)).toBe(200)
    expect(publish.body.doc.flagged).toBe(true)
    await eventually(() => expectUpdateListed(page, anonymous, project, note, false))
  })
})

test('S13.5 a pitch with three links is held with the reason "3 links"', async ({ seedStudio }) => {
  const { tenant, owner } = await seedStudio('s135')
  const project = await createProject(owner.client, tenant.id, `${tenant.slug}-game`, {
    description: 'Free keys at https://a.example/k https://b.example/k https://c.example/k',
  })
  expect(project.flagged).toBe(true)
  expect(project.flagReasons).toBe('3 links')
})
