import type { Browser, Page as BrowserPage } from '@playwright/test'
import type { CollectionSlug } from 'payload'

import type { GameProject, Issue, IssueReport, Media, PatchNote } from '../../src/payload-types'
import type { RestClient } from './support/api'
import { BASE_URL, PREVIEW_SECRET, type Role, storageStatePath } from './support/env'
import {
  castVote,
  contentLayout,
  createIssue,
  createPatchNote,
  createProject,
  createReport,
  expect,
  lexical,
  seed,
  test,
  uploadImage,
} from './support/fixtures'

/**
 * One studio can never see or change another studio's data, players see
 * only what a studio published, and platform-level collections belong to
 * super admins.
 */

const DENIED = [403, 404]

const A_CONTACT = {
  target: 'EMAIL',
  email: 'support@iso-a.test',
  discordWebhookUrl: 'https://discord.com/api/webhooks/1/iso-a',
} as const

interface StudioA {
  project: GameProject
  otherProject: GameProject
  publicIssue: Issue
  privateIssue: Issue
  publishedNote: PatchNote
  draftNote: PatchNote
  report: IssueReport
  media: Media
  folderID: number
}

let a: StudioA
let bProject: GameProject

const idsOf = (docs: { id: number | string }[]): (number | string)[] => docs.map((doc) => doc.id)

/** A browser page signed in as `role`, or anonymous. */
async function browse(browser: Browser, role: Role | 'anonymous'): Promise<BrowserPage> {
  const context = await browser.newContext({
    baseURL: BASE_URL,
    storageState: role === 'anonymous' ? undefined : storageStatePath(role),
  })
  return context.newPage()
}

async function countVotes(superAdmin: RestClient, issueID: number): Promise<number> {
  const { status, body } = await superAdmin.find('issue-votes', {
    where: { issue: { equals: issueID } },
    limit: 0,
  })
  expect(status).toBe(200)
  return body.totalDocs
}

test.beforeAll(async ({ api, uniqueSlug, world }) => {
  const aOwner = api('aOwner')
  const tenant = world.tenants.A.id
  const project = await createProject(aOwner, tenant, uniqueSlug('iso-a1'), { contact: A_CONTACT })
  const otherProject = await createProject(aOwner, tenant, uniqueSlug('iso-a2'))

  const media = await uploadImage(aOwner, tenant, 'iso-a.png', 'Studio A key art')

  const folder = await aOwner.raw<{ doc: { id: number } }>('POST', '/api/payload-folders', {
    data: { name: 'Studio A art', folderType: ['media'], tenant },
  })
  expect(folder.status, JSON.stringify(folder.body)).toBe(201)

  a = {
    project,
    otherProject,
    publicIssue: await createIssue(aOwner, project, uniqueSlug('iso-public'), { isPublic: true }),
    privateIssue: await createIssue(aOwner, project, uniqueSlug('iso-private'), { isPublic: false }),
    publishedNote: await createPatchNote(aOwner, project, uniqueSlug('iso-v1')),
    draftNote: await createPatchNote(aOwner, project, uniqueSlug('iso-v2'), { _status: 'draft' }),
    report: await createReport(aOwner, project),
    media,
    folderID: folder.body.doc.id,
  }
  bProject = await createProject(api('bOwner'), world.tenants.B.id, uniqueSlug('iso-b1'))
})

test.describe('S1.1 cross-tenant reads', () => {
  const listed: [CollectionSlug, (studio: StudioA) => number[], Record<string, unknown>?][] = [
    ['issues', (s) => [s.publicIssue.id, s.privateIssue.id]],
    ['patch-notes', (s) => [s.publishedNote.id, s.draftNote.id], { draft: true }],
    ['issue-reports', (s) => [s.report.id]],
    ['media', (s) => [s.media.id]],
  ]

  test('studio B lists none of studio A’s tenant-scoped documents', async ({ api }) => {
    const bOwner = api('bOwner')
    for (const [collection, aIDs, query] of listed) {
      await test.step(collection, async () => {
        const { status, body } = await bOwner.find(collection, { ...query, limit: 0 })
        expect(status).toBe(200)
        for (const id of aIDs(a)) expect(idsOf(body.docs), `${collection} ${id}`).not.toContain(id)
      })
    }
  })

  test('studio B lists none of studio A’s media folders [F11]', async ({ api }) => {
    const { status, body } = await api('bOwner').find('payload-folders', { limit: 0 })
    expect(status).toBe(200)
    expect(idsOf(body.docs)).not.toContain(a.folderID)
  })
})

test.describe('S1.2 cross-tenant writes', () => {
  test('studio B cannot change or delete studio A’s documents', async ({ api }) => {
    const bOwner = api('bOwner')
    await test.step('PATCH A’s project, issue and report', async () => {
      const project = await bOwner.update('game-projects', a.project.id, { description: 'hacked' })
      expect(DENIED, JSON.stringify(project.body)).toContain(project.status)
      const issue = await bOwner.update('issues', a.publicIssue.id, { title: 'hacked' })
      expect(DENIED, JSON.stringify(issue.body)).toContain(issue.status)
      const report = await bOwner.update('issue-reports', a.report.id, { title: 'hacked' })
      expect(DENIED, JSON.stringify(report.body)).toContain(report.status)
    })

    await test.step('A’s documents are unchanged', async () => {
      const aOwner = api('aOwner')
      expect((await aOwner.findByID('game-projects', a.project.id)).body.description).not.toBe('hacked')
      expect((await aOwner.findByID('issues', a.publicIssue.id)).body.title).toBe(a.publicIssue.title)
      expect((await aOwner.findByID('issue-reports', a.report.id)).body.title).toBe(a.report.title)
    })
  })

  test('a rejected cross-tenant delete of a voted issue keeps the issue and its votes', async ({
    api,
    playwright,
    uniqueSlug,
  }) => {
    const issue = await createIssue(api('aOwner'), a.project, uniqueSlug('iso-voted-keep'))
    await test.step('a player votes', async () => {
      expect((await castVote(playwright, issue.id)).voted).toBe(true)
    })
    await test.step('studio B’s DELETE is refused', async () => {
      const { status, body } = await api('bOwner').remove('issues', issue.id)
      expect(DENIED, JSON.stringify(body)).toContain(status)
    })
    await test.step('the issue and its vote remain', async () => {
      expect((await api('aOwner').findByID('issues', issue.id)).status).toBe(200)
      expect(await countVotes(api('superAdmin'), issue.id)).toBe(1)
    })
  })

  test('studio B cannot file issues against studio A’s project under its own tenant', async ({
    api,
    uniqueSlug,
    world,
  }) => {
    const { status, body } = await api('bOwner').create('issues', {
      gameProject: a.project.id,
      tenant: world.tenants.B.id,
      title: 'Cross-tenant plant',
      slug: uniqueSlug('iso-plant-b'),
      category: 'OTHER',
    })
    expect(status, JSON.stringify(body)).toBe(400)
  })

  test('studio B cannot put documents into studio A’s tenant [F24]', async ({ api, uniqueSlug, world }) => {
    const bOwner = api('bOwner')
    await test.step('create an issue with tenant A → 400', async () => {
      const { status, body } = await bOwner.create('issues', {
        gameProject: a.project.id,
        tenant: world.tenants.A.id,
        title: 'Cross-tenant plant',
        slug: uniqueSlug('iso-plant-a'),
        category: 'OTHER',
      })
      expect(status, JSON.stringify(body)).toBe(400)
    })
    await test.step('move its own issue into tenant A → 400', async () => {
      const own = await createIssue(bOwner, bProject, uniqueSlug('iso-plant-move'))
      const { status, body } = await bOwner.update('issues', own.id, {
        gameProject: a.project.id,
        tenant: world.tenants.A.id,
      })
      expect(status, JSON.stringify(body)).toBe(400)
    })
  })
})

test.describe('S1.11 cross-tenant draft writes [F1]', () => {
  test('studio B cannot create a draft update in studio A’s tenant', async ({ api, uniqueSlug, world }) => {
    const slug = uniqueSlug('iso-draft-plant')
    const { status, body } = await api('bOwner').create(
      'patch-notes',
      {
        gameProject: a.project.id,
        tenant: world.tenants.A.id,
        title: 'Cross-tenant draft',
        slug,
        content: lexical('Planted by studio B.'),
        _status: 'draft',
      },
      { draft: true },
    )
    expect(status, JSON.stringify(body)).toBe(400)

    const planted = await api('superAdmin').find('patch-notes', { where: { slug: { equals: slug } }, draft: true, limit: 0 })
    expect(planted.status).toBe(200)
    expect(planted.body.totalDocs).toBe(0)
  })

  test('studio B cannot move its own draft update into studio A’s tenant', async ({ api, uniqueSlug, world }) => {
    const bOwner = api('bOwner')
    const draft = await createPatchNote(bOwner, bProject, uniqueSlug('iso-draft-move'), { _status: 'draft' })

    const { status, body } = await bOwner.update(
      'patch-notes',
      draft.id,
      { gameProject: a.project.id, tenant: world.tenants.A.id },
      { draft: true },
    )
    expect(status, JSON.stringify(body)).toBe(400)

    const after = await api('superAdmin').findByID('patch-notes', draft.id, { draft: true, depth: 0 })
    expect(after.status).toBe(200)
    expect(after.body.tenant).toBe(world.tenants.B.id)
    expect(after.body.gameProject).toBe(bProject.id)
  })
})

test.describe('S1.3 roles', () => {
  test('a studio member cannot delete issues', async ({ api, uniqueSlug }) => {
    const issue = await createIssue(api('aOwner'), a.project, uniqueSlug('iso-member-delete'))
    const { status, body } = await api('aMember').remove('issues', issue.id)
    expect(status, JSON.stringify(body)).toBe(403)
    expect((await api('aOwner').findByID('issues', issue.id)).status).toBe(200)
  })

  test('a studio owner can delete an issue players voted on, with its votes [F22]', async ({
    api,
    playwright,
    uniqueSlug,
  }) => {
    const issue = await createIssue(api('aOwner'), a.project, uniqueSlug('iso-voted-delete'))
    await castVote(playwright, issue.id)
    expect(await countVotes(api('superAdmin'), issue.id)).toBe(1)

    const { status, body } = await api('aOwner').remove('issues', issue.id)
    expect(status, JSON.stringify(body)).toBe(200)
    expect(await countVotes(api('superAdmin'), issue.id)).toBe(0)
  })
})

test.describe('S1.4 anonymous visitors', () => {
  test('cannot read reports or votes', async ({ api }) => {
    const anonymous = api('anonymous')
    expect((await anonymous.find('issue-reports')).status).toBe(403)
    expect((await anonymous.find('issue-votes')).status).toBe(403)
  })

  test('never see a project’s contact email or Discord webhook', async ({ api }) => {
    await test.step('anonymous', async () => {
      const { status, body } = await api('anonymous').findByID('game-projects', a.project.id)
      expect(status).toBe(200)
      expect(body.contact?.email).toBeUndefined()
      expect(body.contact?.discordWebhookUrl).toBeUndefined()
    })
    await test.step('the owning studio sees both', async () => {
      const { body } = await api('aOwner').findByID('game-projects', a.project.id)
      expect(body.contact?.email).toBe(A_CONTACT.email)
      expect(body.contact?.discordWebhookUrl).toBe(A_CONTACT.discordWebhookUrl)
    })
  })

  test('see public issues and published patch notes only', async ({ api }) => {
    const anonymous = api('anonymous')
    const inProject = { where: { gameProject: { equals: a.project.id } }, limit: 0 }
    const issues = await anonymous.find('issues', inProject)
    expect(issues.status).toBe(200)
    expect(idsOf(issues.body.docs)).toContain(a.publicIssue.id)
    expect(idsOf(issues.body.docs)).not.toContain(a.privateIssue.id)

    const notes = await anonymous.find('patch-notes', inProject)
    expect(notes.status).toBe(200)
    expect(idsOf(notes.body.docs)).toEqual([a.publishedNote.id])

    const draft = await anonymous.find('patch-notes', { ...inProject, draft: true })
    expect(idsOf(draft.body.docs)).not.toContain(a.draftNote.id)
  })
})

test('S1.5 nobody writes votes through REST, not even a super admin', async ({ api, world }) => {
  const { status, body } = await api('superAdmin').create('issue-votes', {
    issue: a.publicIssue.id,
    browserTokenHash: 'forged',
    tenant: world.tenants.A.id,
  })
  expect(status, JSON.stringify(body)).toBe(403)
})

test('S1.6 studios cannot create pre-verified domains or pre-counted votes [F9]', async ({ api, uniqueSlug, world }) => {
  const aOwner = api('aOwner')
  await test.step('customDomainVerified is ignored on create', async () => {
    const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('iso-squat'), {
      customDomain: `${uniqueSlug('squatted')}.example.com`,
      customDomainVerified: true,
    })
    expect(project.customDomainVerified).toBe(false)
  })
  await test.step('upvoteCount is ignored on create', async () => {
    const issue = await createIssue(aOwner, a.project, uniqueSlug('iso-fake-votes'), { upvoteCount: 999 })
    expect(issue.upvoteCount).toBe(0)
  })
})

test.describe('S1.7 platform and system collections', () => {
  test('studio users cannot read, queue or run jobs [F1]', async ({ api }) => {
    const aOwner = api('aOwner')
    await test.step('read payload-jobs', async () => {
      expect((await aOwner.find('payload-jobs')).status).toBe(403)
    })
    await test.step('queue a contact job aimed at studio B', async () => {
      const { status, body } = await aOwner.create('payload-jobs', {
        taskSlug: 'discord-webhook',
        input: { projectID: String(bProject.id), gameSlug: bProject.slug, message: 'Planted by studio A' },
      })
      expect(status, JSON.stringify(body)).toBe(403)
    })
    await test.step('run the queue', async () => {
      expect((await aOwner.raw('GET', '/api/payload-jobs/run')).status).toBe(401)
    })
  })

  test('studio users cannot change the marketing site [F2]', async ({ api, uniqueSlug }) => {
    const aOwner = api('aOwner')
    await test.step('create a marketing page', async () => {
      const { status, body } = await aOwner.create('pages', {
        title: 'Studio A was here',
        slug: uniqueSlug('iso-studio-page'),
        hero: { type: 'lowImpact', richText: lexical('Not a Critwire page.') },
        layout: contentLayout('Not a Critwire page.'),
      })
      expect(status, JSON.stringify(body)).toBe(403)
    })
    await test.step('edit a published marketing page', async () => {
      const page = await seed(api('superAdmin'), 'pages', {
        title: 'Iso platform page',
        slug: uniqueSlug('iso-platform-page'),
        hero: { type: 'lowImpact', richText: lexical('Platform copy.') },
        layout: contentLayout('Platform copy.'),
        _status: 'published',
      })
      const { status, body } = await aOwner.update('pages', page.id, { title: 'Studio A was here' })
      expect(status, JSON.stringify(body)).toBe(403)
    })
  })

  test('the website-template surface is gone [H1]', async ({ api }) => {
    const superAdmin = api('superAdmin')
    const anonymous = api('anonymous')
    // A super admin getting 404 proves removal, not just denial.
    for (const path of [
      ...['posts', 'categories', 'forms', 'form-submissions', 'redirects', 'search'].map((slug) => `/api/${slug}`),
      '/api/globals/header',
      '/api/globals/footer',
    ]) {
      await test.step(`super admin GET ${path} → 404`, async () => {
        expect((await superAdmin.raw('GET', path)).status).toBe(404)
      })
    }
    await test.step('anonymous POST /api/form-submissions → 404', async () => {
      const { status } = await anonymous.raw('POST', '/api/form-submissions', {
        data: { form: 1, submissionData: [{ field: 'name', value: 'Anonymous' }] },
      })
      expect(status).toBe(404)
    })
    for (const path of ['/posts', '/posts/any-post', '/search', '/posts-sitemap.xml']) {
      await test.step(`anonymous GET ${path} → 404`, async () => {
        expect((await anonymous.raw('GET', path)).status).toBe(404)
      })
    }
    await test.step('the pages sitemap lists neither /posts nor /search', async () => {
      const { status, body } = await anonymous.raw<string>('GET', '/pages-sitemap.xml')
      expect(status).toBe(200)
      expect(body).not.toMatch(/\/(posts|search)</)
    })
  })
})

test('S1.8 issue slugs are unique per project, not globally', async ({ api, world }) => {
  const aOwner = api('aOwner')
  await test.step('duplicate slug in the same project → 400', async () => {
    const { status, body } = await aOwner.create('issues', {
      gameProject: a.project.id,
      tenant: world.tenants.A.id,
      title: 'Duplicate',
      slug: a.publicIssue.slug,
      category: 'OTHER',
    })
    expect(status, JSON.stringify(body)).toBe(400)
  })
  await test.step('same slug in another project → 201', async () => {
    await createIssue(aOwner, a.otherProject, a.publicIssue.slug)
  })
})

test.describe('S1.9 Draft Mode previews', () => {
  const TEXT = {
    marketingPublished: 'Iso marketing published hero',
    marketingDraft: 'Iso marketing draft hero',
  }

  let marketingSlug: string

  const marketingPreviewURL = (path: string) =>
    `/next/preview?${new URLSearchParams({ path, previewSecret: PREVIEW_SECRET })}`

  test.beforeAll(async ({ api, uniqueSlug }) => {
    const superAdmin = api('superAdmin')

    marketingSlug = uniqueSlug('iso-marketing')
    const page = await seed(superAdmin, 'pages', {
      title: TEXT.marketingPublished,
      slug: marketingSlug,
      hero: { type: 'lowImpact', richText: lexical(TEXT.marketingPublished) },
      layout: contentLayout('Iso marketing body.'),
      _status: 'published',
    })
    const pageDraft = await superAdmin.update(
      'pages',
      page.id,
      { title: TEXT.marketingDraft, hero: { type: 'lowImpact', richText: lexical(TEXT.marketingDraft) }, _status: 'draft' },
      { draft: true },
    )
    expect(pageDraft.status, JSON.stringify(pageDraft.body)).toBe(200)
  })

  test('only super admins can enter marketing Draft Mode [F10]', async ({ browser }) => {
    for (const role of ['anonymous', 'bOwner'] as const) {
      await test.step(role, async () => {
        const page = await browse(browser, role)
        const response = await page.goto(marketingPreviewURL(`/${marketingSlug}`))
        expect(response?.status()).toBe(403)
        await page.context().close()
      })
    }
  })

  test('a super admin previews the marketing draft', async ({ browser }) => {
    const page = await browse(browser, 'superAdmin')
    await page.goto(marketingPreviewURL(`/${marketingSlug}`))
    await expect(page).toHaveURL(new RegExp(`/${marketingSlug}$`))
    await expect(page.getByText(TEXT.marketingDraft)).toBeVisible()
    await page.context().close()
  })
})

test('S1.10 the site generator and the landing builder are gone', async ({ api, browser }) => {
  // A signed-in owner or super admin getting 404 proves removal, not just denial.
  const request = { gamePageId: 1, prompt: 'Make the page moodier.', scope: 'full' }
  for (const role of ['aOwner', 'anonymous'] as const) {
    await test.step(`${role} POST /next/generate-site → 404`, async () => {
      const { status } = await api(role).raw('POST', '/next/generate-site', { data: request })
      expect(status).toBe(404)
    })
  }

  await test.step('GET /next/site-preview → 404', async () => {
    const { status } = await api('aOwner').raw('GET', '/next/site-preview?token=x')
    expect(status).toBe(404)
  })

  await test.step('super admin GET /api/game-pages → 404', async () => {
    const { status } = await api('superAdmin').raw('GET', '/api/game-pages')
    expect(status).toBe(404)
  })

  const page = await browse(browser, 'superAdmin')
  try {
    await test.step('/admin/collections/game-pages → 404', async () => {
      const response = await page.goto('/admin/collections/game-pages')
      expect(response?.status()).toBe(404)
    })

    await test.step('the admin nav has no Game Pages link', async () => {
      await page.goto('/admin')
      const nav = page.locator('nav.nav__wrap')
      await expect(nav.locator('a[href="/admin/collections/issues"]')).toBeAttached()
      await expect(nav.locator('a[href^="/admin/collections/game-pages"]')).toHaveCount(0)
      await expect(nav.getByText('Game Pages')).toHaveCount(0)
    })
  } finally {
    await page.context().close()
  }
})
