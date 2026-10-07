import type { Locator, Page } from '@playwright/test'

import { ISSUE_STATUS_OPTIONS } from '../../src/collections/options'
import { publicStage } from '../../src/lib/game-portal/stages'
import type { GameProject, Issue } from '../../src/payload-types'
import type { RestClient } from './support/api'
import { CREDENTIALS, PASSWORD, storageStatePath, TURNSTILE_DUMMY_TOKEN } from './support/env'
import { createIssue, createProject, eventually, expect, test } from './support/fixtures'

/**
 * Studio triage in the admin panel: sign-in, the Feedback kanban (moves,
 * reordering, failed saves), the table view, and publishing a player
 * report.
 */

type IssueStatus = Issue['status']

const KANBAN = '/admin/collections/issues'
const LABEL = Object.fromEntries(ISSUE_STATUS_OPTIONS.map(({ label, value }) => [value, label])) as Record<
  IssueStatus,
  string
>

/** A kanban column, found by its header label. */
const column = (page: Page, status: IssueStatus): Locator =>
  page.locator('.issues-kanban__column').filter({ has: page.locator('.issues-kanban__head', { hasText: LABEL[status] }) })

/** The column's drop area, which holds its cards. */
const dropArea = (page: Page, status: IssueStatus): Locator => column(page, status).locator('.issues-kanban__drop')

/** The column's card count pill. */
const countPill = (page: Page, status: IssueStatus): Locator =>
  column(page, status).locator('.issues-kanban__count')

/** Card titles in a column, top to bottom (pin marker stripped). */
const cardTitles = async (page: Page, status: IssueStatus): Promise<string[]> =>
  (await dropArea(page, status).locator('.issues-kanban__card .issues-kanban__card-title').allTextContents()).map((t) => t.replace(/^📌 /, ''))

const card = (page: Page, issue: Pick<Issue, 'title'>): Locator =>
  page.locator('.issues-kanban__card').filter({ has: page.locator('.issues-kanban__card-title', { hasText: issue.title }) })

async function openKanban(page: Page): Promise<void> {
  const response = await page.goto(KANBAN)
  expect(response?.status(), KANBAN).toBe(200)
  await expect(page.getByRole('heading', { level: 1, name: 'Feedback' })).toBeVisible()
}

/**
 * Drags `issue`'s card onto `target` with real pointer events. dnd-kit's
 * sensor only activates after 6 px of movement, so the pointer moves in
 * steps rather than jumping.
 */
async function drag(page: Page, issue: Pick<Issue, 'title'>, target: Locator): Promise<void> {
  // Grab the title: the card's "Open →" link swallows pointer-down.
  const title = card(page, issue).locator('.issues-kanban__card-title')
  await title.scrollIntoViewIfNeeded()
  const handle = await title.boundingBox()
  const drop = await target.boundingBox()
  if (!handle || !drop) throw new Error(`drag: "${issue.title}" or its target is not on screen`)
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2)
  await page.mouse.down()
  await page.mouse.move(handle.x + handle.width / 2 + 10, handle.y + handle.height / 2 + 10, { steps: 5 })
  await page.mouse.move(drop.x + drop.width / 2, drop.y + drop.height / 2, { steps: 15 })
  await page.mouse.up()
}

/** Resolves with the kanban's PATCH for `issue` once the browser has its response. */
const issuePatch = (page: Page, issue: Pick<Issue, 'id'>) =>
  page.waitForResponse(
    (response) => response.request().method() === 'PATCH' && new URL(response.url()).pathname === `/api/issues/${issue.id}`,
  )

async function statusOf(client: RestClient, issue: Pick<Issue, 'id'>): Promise<IssueStatus> {
  const { status, body } = await client.findByID('issues', issue.id, { depth: 0 })
  expect(status).toBe(200)
  return body.status
}

/** The public board column of `status`'s stage; the same shape as S4.2's. */
const boardColumn = (page: Page, status: IssueStatus): Locator => {
  const stage = publicStage(status)
  if (!stage) throw new Error(`boardColumn: ${status} is archived, so it's on no column`)
  return page.getByRole('region', { name: stage.label, exact: true })
}

test('S6.1 the login page speaks Critwire and a studio owner signs in to the dashboard', async ({ browser }) => {
  const context = await browser.newContext()
  const page = await context.newPage()
  try {
    // Payload's forms reset a value typed before they hydrate.
    await page.goto('/admin/login', { waitUntil: 'networkidle' })
    await expect(page.getByText('Welcome to Critwire.')).toBeVisible()
    await test.step('sign in through the form', async () => {
      await page.getByLabel('Email').fill(CREDENTIALS.aOwner.email)
      await page.getByLabel('Password').fill(PASSWORD)
      await page.getByRole('button', { name: 'Login' }).click()
      await expect(page).toHaveURL(/\/admin\/?$/)
      await expect(page.getByRole('heading', { name: 'Your portals' })).toBeVisible()
    })
  } finally {
    await context.close()
  }
})

test.describe('S6.2–S6.7 triage as studio A', () => {
  test.use({ storageState: storageStatePath('aOwner') })

  let project: GameProject
  let reported: Issue
  let moving: Issue
  let failing: Issue
  let investigating: Issue[]
  let bIssue: Issue
  /** Title prefix unique to this worker, so a re-seed after a failure adds no look-alike cards. */
  let tag: string

  test.beforeAll(async ({ api, uniqueSlug, world }) => {
    const aOwner = api('aOwner')
    tag = uniqueSlug('triage')
    project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('at-triage'))
    // Created in this order, so their `_order` keys put them top to bottom.
    // Investigating is the second column, on screen without scrolling.
    investigating = []
    for (const name of ['first', 'second', 'third']) {
      investigating.push(
        await createIssue(aOwner, project, uniqueSlug(`at-investigating-${name}`), {
          title: `${tag}: investigating ${name}`,
          status: 'INVESTIGATING',
        }),
      )
    }
    reported = await createIssue(aOwner, project, uniqueSlug('at-reported'), { title: `${tag}: fog pops in` })
    failing = await createIssue(aOwner, project, uniqueSlug('at-failing'), { title: `${tag}: save icon never stops` })
    // Newest, so the hub (five top open items) lists it.
    moving = await createIssue(aOwner, project, uniqueSlug('at-moving'), { title: `${tag}: ladder drops the player` })
    const bProject = await createProject(api('bOwner'), world.tenants.B.id, uniqueSlug('at-triage-b'))
    bIssue = await createIssue(api('bOwner'), bProject, uniqueSlug('at-b'), { title: `${tag}: studio B only` })
  })

  test("S6.2 the kanban holds only studio A's issues, counted per column", async ({ api, browser, page }) => {
    await openKanban(page)

    await test.step('each issue sits in its status column', async () => {
      expect(await cardTitles(page, 'REPORTED')).toEqual(expect.arrayContaining([reported.title, moving.title]))
      expect(await cardTitles(page, 'INVESTIGATING')).toEqual(
        expect.arrayContaining(investigating.map((issue) => issue.title)),
      )
    })

    await test.step("studio B's issue is nowhere on the board", async () => {
      await expect(page.locator('body')).not.toContainText(bIssue.title)
    })

    await test.step("each count matches studio A's issues in that status", async () => {
      for (const { value } of ISSUE_STATUS_OPTIONS) {
        const { body } = await api('aOwner').find('issues', { where: { status: { equals: value } }, limit: 1 })
        await expect(countPill(page, value), value).toHaveText(String(body.totalDocs))
      }
    })

    await test.step("studio B opening A's issue lands on its own board with Payload's not-found banner", async () => {
      const bContext = await browser.newContext({ storageState: storageStatePath('bOwner') })
      const bPage = await bContext.newPage()
      try {
        await bPage.goto(`${KANBAN}/${reported.id}`)
        // Payload's list view may then append its default query params (depth, limit, sort).
        await expect(bPage).toHaveURL(
          (url) => url.pathname === KANBAN && url.searchParams.get('notFound') === String(reported.id),
        )
        await expect(bPage.getByText(`The document with ID ${reported.id} could not be found.`)).toBeVisible()
        await expect(bPage.locator('body')).toContainText(bIssue.title)
        await expect(bPage.locator('body')).not.toContainText(reported.title)
      } finally {
        await bContext.close()
      }
    })

    await test.step("a super admin's board follows the tenant selector without a reload [F17]", async () => {
      const adminContext = await browser.newContext({ storageState: storageStatePath('superAdmin') })
      const adminPage = await adminContext.newPage()
      const selector = adminPage.locator('.tenant-selector .rs__control')
      const selectTenant = async (name: string): Promise<void> => {
        // The selector lives in the nav, which starts collapsed at this width
        // and can collapse just after the first paint, so retry until it opens.
        await expect(async () => {
          const openMenu = adminPage.getByRole('button', { name: 'Open Menu' })
          if (await openMenu.isVisible()) await openMenu.click()
          await selector.click({ timeout: 2_000 })
        }).toPass({ timeout: 15_000 })
        await adminPage.locator('.rs__option', { hasText: new RegExp(`^${name}$`) }).click()
      }
      const board = adminPage.locator('.list-header ~ div')
      try {
        await openKanban(adminPage)
        await selectTenant('E2E Studio A')
        await expect(board).toContainText(reported.title)
        await expect(board).not.toContainText(bIssue.title)

        // A reload or navigation would drop this marker.
        await adminPage.evaluate(() => Object.assign(window, { __sameDocument: true }))
        await selectTenant('E2E Studio B')
        await expect(board).toContainText(bIssue.title)
        await expect(board).not.toContainText(reported.title)
        expect(await adminPage.evaluate(() => '__sameDocument' in window)).toBe(true)
      } finally {
        await adminContext.close()
      }
    })
  })

  test('S6.3 dragging a card to another column changes its status everywhere', async ({ api, page }) => {
    // Planned is the fifth column: wide enough that it and Reported are both on screen.
    await page.setViewportSize({ width: 2400, height: 900 })
    await openKanban(page)

    await test.step('drag from Reported to Planned', async () => {
      const saved = issuePatch(page, moving)
      await drag(page, moving, dropArea(page, 'PLANNED'))
      expect((await saved).status()).toBe(200)
      await expect(dropArea(page, 'PLANNED')).toContainText(moving.title)
      await expect(dropArea(page, 'REPORTED')).not.toContainText(moving.title)
    })

    await test.step('the move survives a reload', async () => {
      await openKanban(page)
      await expect(dropArea(page, 'PLANNED')).toContainText(moving.title)
      await expect(dropArea(page, 'REPORTED')).not.toContainText(moving.title)
    })

    await test.step('REST reports the new status', async () => {
      expect(await statusOf(api('aOwner'), moving)).toBe('PLANNED')
    })

    // Players see stages: Reported → Investigating would look the same to them.
    await test.step('the public board and the hub follow', async () => {
      await eventually(async () => {
        await page.goto(`/g/${project.slug}/feedback?view=board`)
        await expect(boardColumn(page, 'PLANNED').getByRole('link')).toContainText([moving.title], {
          timeout: 1_000,
        })
      })
      await eventually(async () => {
        await page.goto(`/g/${project.slug}`)
        const known = page.locator('section[aria-labelledby="fs-top-feedback-heading"]')
        await expect(known.getByRole('link', { name: new RegExp(moving.title) })).toContainText('Planned', {
          timeout: 1_000,
        })
      })
    })
  })

  test('S6.4 reordering a column survives a reload', async ({ api, page }) => {
    const [first, second, third] = investigating
    await openKanban(page)
    // Only the seeded three are compared: a re-seed after a failure adds more.
    const columnOrder = async () =>
      (await cardTitles(page, 'INVESTIGATING')).filter((title) => investigating.some((issue) => issue.title === title))
    expect(await columnOrder()).toEqual([first.title, second.title, third.title])

    await test.step('drag the third card onto the first', async () => {
      const saved = issuePatch(page, third)
      await drag(page, third, card(page, first))
      expect((await saved).status()).toBe(200)
      expect(await columnOrder()).toEqual([third.title, first.title, second.title])
    })

    await test.step('the new order survives a reload', async () => {
      await openKanban(page)
      expect(await columnOrder()).toEqual([third.title, first.title, second.title])
    })

    await test.step('REST sorts the column the same way', async () => {
      const { body } = await api('aOwner').find('issues', {
        where: { id: { in: investigating.map((issue) => issue.id).join(',') } },
        sort: '_order',
        depth: 0,
      })
      expect(body.docs.map((issue) => issue.id)).toEqual([third.id, first.id, second.id])
    })
  })

  test('S6.5 a move the server rejects goes back, with an error toast [F6]', async ({ api, page }) => {
    await page.route(`**/api/issues/${failing.id}`, (route) =>
      route.request().method() === 'PATCH'
        ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"errors":[{"message":"boom"}]}' })
        : route.fallback(),
    )
    await openKanban(page)

    const rejected = issuePatch(page, failing)
    await drag(page, failing, dropArea(page, 'NEEDS_MORE_INFO'))
    expect((await rejected).status()).toBe(500)
    expect(await statusOf(api('aOwner'), failing)).toBe('REPORTED')

    await test.step('the card returns to Reported', async () => {
      await expect(dropArea(page, 'REPORTED')).toContainText(failing.title)
      await expect(dropArea(page, 'NEEDS_MORE_INFO')).not.toContainText(failing.title)
    })

    await test.step('an error toast says the move failed', async () => {
      await expect(page.locator('[data-sonner-toast][data-type="error"]')).toBeVisible()
    })
  })

  test("S6.6 the table view lists studio A's issues", async ({ page }) => {
    // Payload's table pages by 10; a re-seed after a failure would push these past page 1.
    const response = await page.goto(`${KANBAN}?limit=100`)
    expect(response?.status()).toBe(200)
    await page.getByRole('button', { name: 'Table' }).click()
    const table = page.locator('.table table')
    await expect(table).toBeVisible()
    for (const issue of [reported, moving, ...investigating]) {
      await expect(table.getByRole('link', { name: issue.title })).toBeVisible()
    }
    await expect(table).not.toContainText(bIssue.title)
  })

  test('S6.7 publishing a player report in the admin creates its public issue', async ({ api, page }) => {
    const title = `${tag}: crows freeze midair`

    await test.step('a player files the report through the public form endpoint', async () => {
      const { status, body } = await api('anonymous').raw<{ ok?: boolean }>('POST', `/g/${project.slug}/feedback/new/submit`, {
        data: {
          title,
          description: 'Crows over the harbor stop flapping and hang in the sky.',
          category: 'VISUAL',
          turnstileToken: TURNSTILE_DUMMY_TOKEN,
        },
      })
      expect(status, JSON.stringify(body)).toBe(200)
    })

    await test.step('the owner opens it from the reports list', async () => {
      await page.goto('/admin/collections/issue-reports')
      await page.getByRole('link', { name: title }).click()
      await expect(page).toHaveURL(/\/admin\/collections\/issue-reports\/\d+/)
      await expect(page.locator('#field-title')).toHaveValue(title)
    })

    await test.step('set Published and save', async () => {
      await page.locator('#field-status .rs__control').click()
      await page.locator('.rs__option', { hasText: /^Published$/ }).click()
      await page.getByRole('button', { name: 'Save' }).click()
      await expect(page.locator('[data-sonner-toast][data-type="success"]')).toBeVisible()
    })

    await test.step('the report now links its new issue', async () => {
      await page.reload()
      await expect(page.locator('#field-issue')).toContainText(title)
    })

    await test.step('the public board lists the issue as Reported', async () => {
      await eventually(async () => {
        await page.goto(`/g/${project.slug}/feedback?view=board`)
        await expect(boardColumn(page, 'REPORTED').getByRole('link', { name: title })).toBeVisible({ timeout: 1_000 })
      })
    })
  })
})
