import type { Page } from '@playwright/test'

import type { GameProject, Issue, PatchNote } from '../../src/payload-types'
import { castVote, createIssue, createPatchNote, createProject, expect, test } from './support/fixtures'

/**
 * The public issue tracker under /g/<slug>/issues: the filtered list,
 * the read-only board, and issue detail pages. Replaces
 * tests/manual/verify-phase5.mjs.
 */

const issuesPath = (slug: string) => `/g/${slug}/issues`

/** Loads `path` and fails unless the server answers `status`. */
async function open(page: Page, path: string, status = 200): Promise<void> {
  const response = await page.goto(path)
  expect(response?.status(), path).toBe(status)
}

/** Issue titles linked from the list or board, top to bottom. */
const listedTitles = (page: Page, slug: string): Promise<string[]> =>
  page.locator(`a[href^="${issuesPath(slug)}/"]`).allTextContents()

test.describe('S4.1–S4.3 issue list, board and detail', () => {
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

    await test.step('each row carries its status badge', async () => {
      const row = (issue: Issue) => page.getByRole('listitem').filter({ hasText: issue.title })
      await expect(row(pinned)).toContainText('Investigating')
      await expect(row(workaround)).toContainText('Workaround Available')
      await expect(row(needsInfo)).toContainText('Needs More Info')
      await expect(row(fixedReleased)).toContainText('Fixed')
      await expect(row(audio)).toContainText('Reported')
    })

    await test.step('"Latest" lists newest first, pinned still on top', async () => {
      await page.getByRole('combobox').nth(1).selectOption('latest')
      await expect(page).toHaveURL(/[?&]sort=latest/)
      await expect
        .poll(() => listedTitles(page, project.slug))
        .toEqual([pinned, ...unpinnedNewestFirst].map((issue) => issue.title))
    })

    await test.step('the category dropdown narrows the list', async () => {
      await page.getByRole('combobox').first().selectOption('QUESTS')
      await expect(page).toHaveURL(/[?&]category=QUESTS/)
      await expect.poll(() => listedTitles(page, project.slug)).toEqual([needsInfo.title])
    })

    await test.step('the search box narrows the list', async () => {
      await page.getByRole('combobox').first().selectOption('')
      await expect(page).not.toHaveURL(/category=/)
      await page.getByPlaceholder('Search issues…').fill('lantern')
      await page.getByPlaceholder('Search issues…').press('Enter')
      await expect(page).toHaveURL(/[?&]q=lantern/)
      await expect.poll(() => listedTitles(page, project.slug)).toEqual([fixedUnreleased.title])
    })
  })

  test('S4.2 the board sorts public issues into status columns and nothing drags', async ({ page }) => {
    await open(page, issuesPath(project.slug))
    await page.getByRole('button', { name: 'Board view' }).click()
    await expect(page).toHaveURL(/[?&]view=board/)
    await expect(page.getByRole('button', { name: 'List view' })).toBeVisible()

    const column = (label: string) =>
      page.locator('div.w-64').filter({ has: page.locator(':scope > div:first-child', { hasText: label }) })

    await test.step('each issue sits in its status column', async () => {
      await expect(column('Reported').getByRole('link')).toHaveText([audio.title])
      await expect(column('Investigating').getByRole('link')).toHaveText([`📌 ${pinned.title}`])
      await expect(column('Workaround Available').getByRole('link')).toHaveText([workaround.title])
      await expect(column('Needs More Info').getByRole('link')).toHaveText([needsInfo.title])
      // The board orders by pin and votes only, so equal-vote cards have no set order.
      await expect(column('Fixed').getByRole('link')).toHaveCount(2)
      expect((await column('Fixed').getByRole('link').allTextContents()).sort()).toEqual(
        [fixedReleased.title, fixedUnreleased.title].sort(),
      )
      await expect(column('Planned').getByRole('link')).toHaveCount(0)
      await expect(column('Closed').getByRole('link')).toHaveCount(0)
    })

    await test.step('private and other studios’ issues are absent', async () => {
      await expect(page.locator('body')).not.toContainText(privateIssue.title)
      await expect(page.locator('body')).not.toContainText(bIssue.title)
    })

    await test.step('the public board is read-only', async () => {
      await expect(page.locator('[draggable="true"], [aria-roledescription="draggable"]')).toHaveCount(0)
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
      await expect(link).toHaveAttribute('href', `/g/${project.slug}/patch-notes/${releasedNote.slug}`)
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
