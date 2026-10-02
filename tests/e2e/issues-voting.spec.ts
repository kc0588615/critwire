import type { Page, PlaywrightWorkerArgs } from '@playwright/test'

import type { GameProject, Issue, PatchNote } from '../../src/payload-types'
import type { RestClient } from './support/api'
import {
  castVote,
  createIssue,
  createPatchNote,
  createProject,
  eventually,
  expect,
  newRequestContext,
  test,
} from './support/fixtures'

/**
 * The public issue tracker under /g/<slug>/feedback: the filtered list,
 * the read-only board, issue detail pages and player voting.
 */

const issuesPath = (slug: string) => `/g/${slug}/feedback`

/** Loads `path` and fails unless the server answers `status`. */
async function open(page: Page, path: string, status = 200): Promise<void> {
  const response = await page.goto(path)
  expect(response?.status(), path).toBe(status)
}

/** Issue titles linked from the list or board, top to bottom; the form at `/feedback/new` isn't an item. */
const listedTitles = (page: Page, slug: string): Promise<string[]> =>
  page
    .locator(`a[href^="${issuesPath(slug)}/"]:not([href^="${issuesPath(slug)}/new"])`)
    .allTextContents()

test.describe('S4.1 and S4.3 issue list and detail', () => {
  let project: GameProject
  let pinned: Issue
  let audio: Issue
  let workaround: Issue
  let needsInfo: Issue
  let fixedReleased: Issue
  let fixedUnreleased: Issue
  let privateIssue: Issue
  let bIssue: Issue
  let releasedNote: PatchNote
  let unreleasedNote: PatchNote

  test.beforeAll(async ({ api, playwright, uniqueSlug, world }) => {
    const aOwner = api('aOwner')
    const bOwner = api('bOwner')
    project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('is-board'))
    releasedNote = await createPatchNote(aOwner, project, uniqueSlug('is-released'), {
      title: 'Harbor hotfix',
      versionLabel: 'v2.1.0',
    })
    unreleasedNote = await createPatchNote(aOwner, project, uniqueSlug('is-unreleased'), {
      title: 'Secret expansion patch',
      versionLabel: 'v9.9.9',
      _status: 'draft',
    })

    // Created oldest first, so "Latest" lists them in reverse.
    audio = await createIssue(aOwner, project, uniqueSlug('is-audio'), {
      title: 'Audio crackles in caves',
      summary: 'Static noise when the reverb kicks in.',
      category: 'AUDIO',
    })
    workaround = await createIssue(aOwner, project, uniqueSlug('is-workaround'), {
      title: 'Menu overlaps the map',
      category: 'USER_INTERFACE',
      status: 'WORKAROUND_AVAILABLE',
      workaroundText: 'Close the map with Escape first.',
    })
    needsInfo = await createIssue(aOwner, project, uniqueSlug('is-needs-info'), {
      title: 'Quest giver vanishes',
      category: 'QUESTS',
      status: 'NEEDS_MORE_INFO',
      needsMoreInfoText: 'Which save slot were you on?',
    })
    fixedReleased = await createIssue(aOwner, project, uniqueSlug('is-fixed-released'), {
      title: 'Boat sinks at the dock',
      category: 'GAMEPLAY',
      status: 'FIXED',
      fixedInPatchNote: releasedNote.id,
    })
    fixedUnreleased = await createIssue(aOwner, project, uniqueSlug('is-fixed-unreleased'), {
      title: 'Lantern never lights',
      category: 'VISUAL',
      status: 'FIXED',
      fixedInPatchNote: unreleasedNote.id,
    })
    privateIssue = await createIssue(aOwner, project, uniqueSlug('is-private'), {
      title: 'Internal build crash',
      category: 'CRASHES',
      isPublic: false,
    })
    pinned = await createIssue(aOwner, project, uniqueSlug('is-pinned'), {
      title: 'Save files corrupt on exit',
      category: 'CRASHES',
      status: 'INVESTIGATING',
      isPinned: true,
    })

    const bProject = await createProject(bOwner, world.tenants.B.id, uniqueSlug('is-board-b'))
    bIssue = await createIssue(bOwner, bProject, uniqueSlug('is-b'), { title: 'Studio B glitch' })

    // One vote lifts the oldest issue above the rest under "Most upvoted".
    await castVote(playwright, audio.id)
  })

  test('S4.1 the list shows public issues, pinned first, and follows the filters', async ({ page }) => {
    const base = issuesPath(project.slug)
    const unpinnedNewestFirst = [fixedUnreleased, fixedReleased, needsInfo, workaround, audio]

    await test.step('public issues only, pinned first, then by votes', async () => {
      await open(page, base)
      expect(await listedTitles(page, project.slug)).toEqual(
        [pinned, audio, ...unpinnedNewestFirst.slice(0, 4)].map((issue) => issue.title),
      )
      await expect(page.locator('body')).not.toContainText(privateIssue.title)
      await expect(page.locator('body')).not.toContainText(bIssue.title)
    })

    await test.step('each row carries its stage badge', async () => {
      const row = (issue: Issue) => page.getByRole('listitem').filter({ hasText: issue.title })
      await expect(row(pinned)).toContainText('Under review')
      await expect(row(workaround)).toContainText('Under review')
      await expect(row(needsInfo)).toContainText('Under review')
      await expect(row(fixedReleased)).toContainText('Shipped')
      await expect(row(audio)).toContainText('Under review')
    })

    await test.step('"Latest" lists newest first, pinned still on top', async () => {
      await page.getByRole('combobox', { name: 'Sort by' }).selectOption('latest')
      await expect(page).toHaveURL(/[?&]sort=latest/)
      await expect
        .poll(() => listedTitles(page, project.slug))
        .toEqual([pinned, ...unpinnedNewestFirst].map((issue) => issue.title))
    })

    await test.step('the category dropdown narrows the list', async () => {
      await page.getByRole('combobox', { name: 'Category' }).selectOption('QUESTS')
      await expect(page).toHaveURL(/[?&]category=QUESTS/)
      await expect.poll(() => listedTitles(page, project.slug)).toEqual([needsInfo.title])
    })

    await test.step('the search box narrows the list', async () => {
      await page.getByRole('combobox', { name: 'Category' }).selectOption('')
      await expect(page).not.toHaveURL(/category=/)
      await page.getByPlaceholder('Search feedback…').fill('lantern')
      await page.getByPlaceholder('Search feedback…').press('Enter')
      await expect(page).toHaveURL(/[?&]q=lantern/)
      await expect.poll(() => listedTitles(page, project.slug)).toEqual([fixedUnreleased.title])
    })

    await test.step('the search also matches summaries', async () => {
      await page.getByPlaceholder('Search feedback…').fill('reverb')
      await page.getByPlaceholder('Search feedback…').press('Enter')
      await expect(page).toHaveURL(/[?&]q=reverb/)
      await expect.poll(() => listedTitles(page, project.slug)).toEqual([audio.title])
    })
  })

  test('S4.3 detail pages show status notes and released fixes only', async ({ page }) => {
    const detail = (issue: Issue) => `${issuesPath(project.slug)}/${issue.slug}`

    await test.step('the workaround box', async () => {
      await open(page, detail(workaround))
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(workaround.title)
      await expect(page.locator('article aside')).toContainText('Workaround')
      await expect(page.locator('article aside')).toContainText('Close the map with Escape first.')
    })

    await test.step('the needs-more-info box', async () => {
      await open(page, detail(needsInfo))
      await expect(page.locator('article aside')).toContainText('The studio needs more information')
      await expect(page.locator('article aside')).toContainText('Which save slot were you on?')
    })

    await test.step('a fix in a published note links to a live page', async () => {
      await open(page, detail(fixedReleased))
      const link = page.locator('article aside').getByRole('link', { name: 'v2.1.0 — Harbor hotfix' })
      await expect(link).toHaveAttribute('href', `/g/${project.slug}/updates/${releasedNote.slug}`)
      await link.click()
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(releasedNote.title)
    })

    await test.step('a fix in an unpublished note doesn’t leak the note [F3]', async () => {
      await open(page, detail(fixedUnreleased))
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(fixedUnreleased.title)
      await expect(page.locator('body')).not.toContainText(unreleasedNote.title)
      await expect(page.locator('body')).not.toContainText('v9.9.9')
      await expect(page.locator(`a[href$="/${unreleasedNote.slug}"]`)).toHaveCount(0)
    })

    await test.step('a private issue is 404', () => open(page, detail(privateIssue), 404))
  })
})

test.describe('S4.2 the four-stage board', () => {
  let project: GameProject
  let reported: Issue
  let investigating: Issue
  let needsInfo: Issue
  let workaround: Issue
  let plannedIdea: Issue
  let inProgressIdea: Issue
  let fixed: Issue
  let closed: Issue
  let privateIssue: Issue
  let bIssue: Issue
  /** Fills the Shipped column past its 25-card limit. */
  const EXTRA_SHIPPED = 25

  test.beforeAll(async ({ api, uniqueSlug, world }) => {
    const aOwner = api('aOwner')
    const bOwner = api('bOwner')
    project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('stage-board'))
    const item = (key: string, data: Partial<Issue>) => createIssue(aOwner, project, uniqueSlug(`sb-${key}`), data)

    reported = await item('reported', { title: 'Fishing line snaps' })
    investigating = await item('investigating', { title: 'Fog flickers', status: 'INVESTIGATING', isPinned: true })
    needsInfo = await item('needs-info', { title: 'Seeds vanish', status: 'NEEDS_MORE_INFO' })
    workaround = await item('workaround', { title: 'Door sticks', status: 'WORKAROUND_AVAILABLE' })
    plannedIdea = await item('planned', { title: 'Add a photo mode', status: 'PLANNED', type: 'IDEA' })
    inProgressIdea = await item('in-progress', { title: 'Controller remapping', status: 'IN_PROGRESS', type: 'IDEA' })
    await Promise.all(
      Array.from({ length: EXTRA_SHIPPED }, (_, n) => item(`shipped-${n}`, { title: `Shipped fix ${n}`, status: 'FIXED' })),
    )
    // Newest in Shipped, so it's among the 25 cards the column shows.
    fixed = await item('fixed', { title: 'Boat drifts at anchor', status: 'FIXED' })
    closed = await item('closed', { title: 'Old launcher prompt', status: 'CLOSED' })
    privateIssue = await item('private', { title: 'Internal perf build', isPublic: false })

    const bProject = await createProject(bOwner, world.tenants.B.id, uniqueSlug('stage-board-b'))
    bIssue = await createIssue(bOwner, bProject, uniqueSlug('sb-b'), { title: 'Studio B stage glitch' })
  })

  test('the board shows four public stages', async ({ page }) => {
    await open(page, issuesPath(project.slug))
    await page.getByRole('button', { name: 'Board view' }).click()
    await expect(page).toHaveURL(/[?&]view=board/)
    await expect(page.getByRole('button', { name: 'List view' })).toBeVisible()

    const column = (label: string) => page.getByRole('region', { name: label, exact: true })
    /** A column's card titles, sorted: equal-vote cards have no set order. */
    const cards = async (label: string) =>
      (await column(label).getByRole('listitem').getByRole('link').allTextContents()).sort()

    await test.step('each internal status sits in its stage column, and CLOSED in none', async () => {
      await expect(page.locator('.fs-board').getByRole('region')).toHaveCount(4)
      await expect(column('Under review').getByRole('listitem')).toHaveCount(4)
      expect(await cards('Under review')).toEqual(
        [reported, investigating, needsInfo, workaround].map((issue) => issue.title).sort(),
      )
      // Pinned first.
      await expect(column('Under review').getByRole('listitem').first()).toContainText(investigating.title)
      await expect(column('Under review').getByRole('listitem').first()).toContainText('Pinned')
      await expect(column('Under review').locator('.fs-count')).toHaveText('4')
      expect(await cards('Planned')).toEqual([plannedIdea.title])
      await expect(column('Planned').getByRole('listitem')).toContainText('Idea')
      expect(await cards('In progress')).toEqual([inProgressIdea.title])
      await expect(column('Shipped').getByRole('listitem').getByRole('link', { name: fixed.title })).toBeVisible()
      await expect(page.locator('body')).not.toContainText(closed.title)
    })

    await test.step('the type filter narrows the board to ideas, and back', async () => {
      await page.getByRole('combobox', { name: 'Type' }).selectOption('idea')
      await expect(page).toHaveURL(/[?&]type=idea/)
      await expect(column('Under review').getByRole('listitem')).toHaveCount(0)
      await expect(column('Shipped').getByRole('listitem')).toHaveCount(0)
      expect(await cards('Planned')).toEqual([plannedIdea.title])
      expect(await cards('In progress')).toEqual([inProgressIdea.title])
      await page.getByRole('combobox', { name: 'Type' }).selectOption('')
      await expect(page).not.toHaveURL(/type=/)
      await expect(column('Under review').getByRole('listitem')).toHaveCount(4)
    })

    await test.step('a full column shows its true count and links to the list filtered to its stage', async () => {
      const total = EXTRA_SHIPPED + 1
      await expect(column('Shipped').locator('.fs-count')).toHaveText(String(total))
      await expect(column('Shipped').getByRole('listitem')).toHaveCount(25)
      await column('Shipped').getByRole('link', { name: `See all ${total}` }).click()
      await expect(page).toHaveURL(/[?&]stage=shipped/)
      await expect(page).not.toHaveURL(/view=board/)
      await expect(page.getByText('Page 1 of 2')).toBeVisible()
      await expect(page.locator('.fs-issue-list .fs-status')).toHaveText(Array(20).fill('Shipped'))
    })

    await open(page, `${issuesPath(project.slug)}?view=board`)

    await test.step('private and other studios’ issues are absent', async () => {
      await expect(page.locator('body')).not.toContainText(privateIssue.title)
      await expect(page.locator('body')).not.toContainText(bIssue.title)
    })

    await test.step('the public board is read-only', async () => {
      await expect(page.locator('[draggable="true"], [aria-roledescription="draggable"]')).toHaveCount(0)
    })
  })
})

const VOTE_COOKIE = 'cw_vote_token'

interface VoteReply {
  status: number
  body: { error?: string; issuedNewToken?: boolean; upvoteCount?: number; voted?: boolean }
  /** The `name=value` vote cookie the player holds after this call. */
  cookie?: string
}

/**
 * POSTs to /api/vote as a player holding `cookie`, or as a new player.
 * Each call gets its own request context, so exactly the given cookie
 * is sent and parallel calls share nothing else.
 */
async function postVote(
  playwright: PlaywrightWorkerArgs['playwright'],
  body: unknown,
  cookie?: string,
): Promise<VoteReply> {
  const player = await newRequestContext(playwright)
  try {
    const response = await player.post('/api/vote', { data: body, headers: cookie ? { Cookie: cookie } : {} })
    const issued = response
      .headersArray()
      .find(({ name, value }) => name.toLowerCase() === 'set-cookie' && value.startsWith(`${VOTE_COOKIE}=`))
    return {
      status: response.status(),
      body: (await response.json()) as VoteReply['body'],
      cookie: issued ? issued.value.split(';')[0] : cookie,
    }
  } finally {
    await player.dispose()
  }
}

/** The issue's stored counter and its vote rows, both read as super admin. */
async function tally(superAdmin: RestClient, issueID: number) {
  const issue = await superAdmin.findByID('issues', issueID, { depth: 0 })
  const votes = await superAdmin.find('issue-votes', { where: { issue: { equals: issueID } }, limit: 1 })
  expect(issue.status).toBe(200)
  expect(votes.status).toBe(200)
  return { upvoteCount: issue.body.upvoteCount, rows: votes.body.totalDocs, updatedAt: issue.body.updatedAt }
}

test.describe('S4.4 voting in the browser', () => {
  let project: GameProject
  let voted: Issue
  let other: Issue

  test.beforeAll(async ({ api, uniqueSlug, world }) => {
    const aOwner = api('aOwner')
    project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('vote-browser'))
    // Created first, so with no votes it sorts below `other` everywhere.
    voted = await createIssue(aOwner, project, uniqueSlug('vote-rain'), { title: 'Rain clips through roofs' })
    other = await createIssue(aOwner, project, uniqueSlug('vote-pins'), { title: 'Map pins drift' })
  })

  test('upvotes toggle, persist per browser, and reach the hub and the list', async ({ browser, page }) => {
    const detail = `${issuesPath(project.slug)}/${voted.slug}`
    const button = (on: Page) => on.getByRole('button', { name: /^Upvoted?\s*\d+$/ })
    const expectButton = async (on: Page, pressed: boolean, count: number) => {
      await expect(button(on)).toHaveAttribute('aria-pressed', String(pressed))
      await expect(button(on).locator('.fs-vote-count')).toHaveText(String(count))
    }
    const knownIssues = page.locator('section[aria-labelledby="fs-top-feedback-heading"] li')

    await test.step('before any vote, the newer issue leads the hub and the list', async () => {
      await open(page, `/g/${project.slug}`)
      await expect(knownIssues).toHaveText([other.title, voted.title].map((title) => new RegExp(`^${title}`)))
      await expect(knownIssues.filter({ hasText: '▲' })).toHaveCount(0)
      await open(page, issuesPath(project.slug))
      expect(await listedTitles(page, project.slug)).toEqual([other.title, voted.title])
    })

    await test.step('an upvote presses the button and survives a reload', async () => {
      await open(page, detail)
      await expectButton(page, false, 0)
      await button(page).click()
      await expectButton(page, true, 1)
      await page.reload()
      await expectButton(page, true, 1)
    })

    await test.step('a second browser adds its own vote; the first withdraws', async () => {
      const second = await browser.newContext()
      try {
        const secondPage = await second.newPage()
        await open(secondPage, detail)
        await expectButton(secondPage, false, 1)
        await button(secondPage).click()
        await expectButton(secondPage, true, 2)
      } finally {
        await second.close()
      }
      await page.reload()
      await expectButton(page, true, 2)
      await button(page).click()
      await expectButton(page, false, 1)
    })

    await test.step('the hub shows the count and ranks the voted issue first', async () => {
      await eventually(async () => {
        await page.goto(`/g/${project.slug}`)
        await expect(knownIssues).toHaveText([new RegExp(`^${voted.title}.*▲ 1`), new RegExp(`^${other.title}`)], {
          timeout: 1_000,
        })
      })
    })

    await test.step('the list\'s default "top" sort ranks it first too', async () => {
      await open(page, issuesPath(project.slug))
      expect(await listedTitles(page, project.slug)).toEqual([voted.title, other.title])
    })
  })
})

test.describe('S4.5–S4.6 voting API', () => {
  let project: GameProject
  let publicIssue: Issue
  let privateIssue: Issue

  test.beforeAll(async ({ api, uniqueSlug, world }) => {
    const aOwner = api('aOwner')
    project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('vote-api'))
    publicIssue = await createIssue(aOwner, project, uniqueSlug('vote-api-public'), { title: 'Fog flickers' })
    privateIssue = await createIssue(aOwner, project, uniqueSlug('vote-api-private'), {
      title: 'Crash in debug menu',
      isPublic: false,
    })
  })

  test('S4.5 rejects bad bodies and hidden issues', async ({ api, playwright }) => {
    const malformed = [{}, { issueId: null }, { issueId: -1 }, { issueId: 'abc' }, { issueId: 2 ** 40 }, { issueId: { $ne: 1 } }]
    for (const body of [...malformed, 'not json']) {
      const reply = await postVote(playwright, body)
      expect(reply.status, JSON.stringify(body)).toBe(400)
    }
    expect((await postVote(playwright, { issueId: 2_000_000_000 })).status).toBe(404)
    expect((await postVote(playwright, { issueId: privateIssue.id })).status).toBe(404)
    expect((await tally(api('superAdmin'), privateIssue.id)).rows).toBe(0)
  })

  test('S4.5 votes are JSON only, so other sites can\'t post them [F7]', async ({ api, playwright, uniqueSlug }) => {
    // A cross-site form or `no-cors` fetch can only send CORS-safelisted
    // types; a valid JSON body under any of them must not vote.
    const superAdmin = api('superAdmin')
    const issue = await createIssue(api('aOwner'), project, uniqueSlug('vote-json-only'), { title: 'Lamps hum' })
    const json = JSON.stringify({ issueId: issue.id })
    const player = await newRequestContext(playwright)
    try {
      for (const contentType of ['text/plain', 'text/plain; x=application/json', 'text/plain;charset=UTF-8']) {
        const reply = await player.post('/api/vote', { data: json, headers: { 'Content-Type': contentType } })
        expect(reply.status(), contentType).toBe(400)
      }
      const form = await player.post('/api/vote', { form: { issueId: String(issue.id) } })
      expect(form.status(), 'urlencoded form').toBe(400)
      const multipart = await player.post('/api/vote', { multipart: { issueId: String(issue.id) } })
      expect(multipart.status(), 'multipart form').toBe(400)
      expect(await tally(superAdmin, issue.id)).toMatchObject({ upvoteCount: 0, rows: 0 })

      // Real clients may add parameters to the JSON type.
      const real = await player.post('/api/vote', {
        data: json,
        headers: { 'Content-Type': 'Application/JSON; charset=utf-8' },
      })
      expect(real.status(), await real.text()).toBe(200)
      expect(await tally(superAdmin, issue.id)).toMatchObject({ upvoteCount: 1, rows: 1 })
    } finally {
      await player.dispose()
    }
  })

  test('S4.5 a tampered cookie is replaced and counted as a new voter', async ({ api, playwright }) => {
    const first = await postVote(playwright, { issueId: publicIssue.id })
    expect(first.body).toMatchObject({ voted: true, upvoteCount: 1, issuedNewToken: true })
    const [token] = (first.cookie ?? '').slice(VOTE_COOKIE.length + 1).split('.')
    expect(token).toMatch(/^[0-9a-f]{64}$/)
    const tampered = `${VOTE_COOKIE}=${token}.${'0'.repeat(64)}`
    const second = await postVote(playwright, { issueId: publicIssue.id }, tampered)
    expect(second.status).toBe(200)
    expect(second.body).toMatchObject({ voted: true, upvoteCount: 2, issuedNewToken: true })
    expect(second.cookie).not.toBe(tampered)

    // The original cookie still owns its vote.
    const withdrawn = await postVote(playwright, { issueId: publicIssue.id }, first.cookie)
    expect(withdrawn.body).toMatchObject({ voted: false, upvoteCount: 1, issuedNewToken: false })
    expect(await tally(api('superAdmin'), publicIssue.id)).toMatchObject({ upvoteCount: 1, rows: 1 })
  })

  test('S4.6 parallel votes and withdrawals from different players all count [F4]', async ({
    api,
    playwright,
    uniqueSlug,
  }) => {
    const superAdmin = api('superAdmin')
    const issue = await createIssue(api('aOwner'), project, uniqueSlug('vote-parallel'), { title: 'Wind stutters' })

    const votes = await Promise.all(Array.from({ length: 8 }, () => postVote(playwright, { issueId: issue.id })))
    expect(votes.map((reply) => reply.status)).toEqual(Array(8).fill(200))
    expect(await tally(superAdmin, issue.id)).toMatchObject({ upvoteCount: 8, rows: 8 })

    const withdrawals = await Promise.all(
      votes.map((reply) => postVote(playwright, { issueId: issue.id }, reply.cookie)),
    )
    expect(withdrawals.map((reply) => [reply.status, reply.body.voted])).toEqual(Array(8).fill([200, false]))
    expect(await tally(superAdmin, issue.id)).toMatchObject({ upvoteCount: 0, rows: 0 })
  })

  test('S4.6 votes leave the issue\'s updatedAt alone [F4]', async ({ api, playwright }) => {
    // A vote isn't an edit: `updatedAt` keeps meaning the studio's last change.
    const superAdmin = api('superAdmin')
    const before = await tally(superAdmin, publicIssue.id)
    const reply = await postVote(playwright, { issueId: publicIssue.id })
    expect(reply.body.voted).toBe(true)
    const after = await tally(superAdmin, publicIssue.id)
    expect(after.upvoteCount).toBe(before.rows + 1)
    expect(after.updatedAt).toBe(before.updatedAt)
  })

  test('S4.6 parallel toggles with one cookie never error and keep the count true [F4]', async ({
    api,
    playwright,
    uniqueSlug,
  }) => {
    const superAdmin = api('superAdmin')
    const issue = await createIssue(api('aOwner'), project, uniqueSlug('vote-same-cookie'), { title: 'Sky flashes' })
    const { cookie } = await postVote(playwright, { issueId: publicIssue.id })
    expect(cookie).toBeDefined()

    const togglePair = async (label: string) => {
      const pair = await Promise.all([1, 2].map(() => postVote(playwright, { issueId: issue.id }, cookie)))
      expect(pair.map((reply) => reply.status), `${label}: ${JSON.stringify(pair.map((r) => r.body))}`).toEqual([
        200, 200,
      ])
      const { upvoteCount, rows } = await tally(superAdmin, issue.id)
      expect(upvoteCount, label).toBe(rows)
      return rows
    }

    for (let round = 1; round <= 5; round++) {
      // From "voted": both requests try to withdraw the same vote.
      if ((await tally(superAdmin, issue.id)).rows === 0) {
        expect((await postVote(playwright, { issueId: issue.id }, cookie)).body.voted).toBe(true)
      }
      await togglePair(`round ${round}, withdrawing`)

      // From "not voted": both requests try to add it.
      if ((await tally(superAdmin, issue.id)).rows === 1) {
        expect((await postVote(playwright, { issueId: issue.id }, cookie)).body.voted).toBe(false)
      }
      await togglePair(`round ${round}, adding`)
    }
  })
})

test.describe('S4.7 archived items', () => {
  let project: GameProject
  let openItem: Issue
  let archived: Issue

  test.beforeAll(async ({ api, playwright, uniqueSlug, world }) => {
    const aOwner = api('aOwner')
    project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('archived'))
    // The open item keeps the hub's section and the board's columns on screen.
    openItem = await createIssue(aOwner, project, uniqueSlug('archived-open'), { title: 'Torches flicker at dusk' })
    archived = await createIssue(aOwner, project, uniqueSlug('archived-closed'), { title: 'Old launcher crash' })
    // Voted while open, then closed: the vote route refuses archived items.
    await castVote(playwright, archived.id)
    const { status } = await aOwner.update('issues', archived.id, { status: 'CLOSED' })
    expect(status).toBe(200)
  })

  test('an archived item leaves the board, the list and the hub, keeps its page and stops taking votes', async ({
    api,
    page,
    playwright,
  }) => {
    await test.step('the list shows only the open item', async () => {
      await open(page, issuesPath(project.slug))
      expect(await listedTitles(page, project.slug)).toEqual([openItem.title])
    })

    await test.step('the board shows only the open item', async () => {
      await open(page, `${issuesPath(project.slug)}?view=board`)
      expect(await listedTitles(page, project.slug)).toEqual([openItem.title])
    })

    await test.step('the hub shows only the open item', async () => {
      await open(page, `/g/${project.slug}`)
      const knownIssues = page.locator('section[aria-labelledby="fs-top-feedback-heading"] li')
      await expect(knownIssues).toHaveText([new RegExp(`^${openItem.title}`)])
    })

    await test.step('its page says Archived and shows the count without a vote button', async () => {
      await open(page, `${issuesPath(project.slug)}/${archived.slug}`)
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(archived.title)
      await expect(page.locator('article .fs-issue-meta')).toContainText('Archived')
      await expect(page.locator('article .fs-tally')).toHaveText('1')
      await expect(page.getByRole('button', { name: /^Upvoted?\s*\d+$/ })).toHaveCount(0)
    })

    await test.step('the vote API answers 409 and the count stays 1', async () => {
      const reply = await postVote(playwright, { issueId: archived.id })
      expect(reply.status).toBe(409)
      expect(await tally(api('superAdmin'), archived.id)).toMatchObject({ upvoteCount: 1, rows: 1 })
    })
  })
})
