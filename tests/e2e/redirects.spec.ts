import type { APIRequestContext } from '@playwright/test'

import type { GameProject, Issue, PatchNote } from '../../src/payload-types'
import { BASE_URL, TURNSTILE_DUMMY_TOKEN } from './support/env'
import { createIssue, createPatchNote, createProject, expect, newRequestContext, test } from './support/fixtures'

/**
 * The feedback pivot renamed the portal's routes: issues → feedback,
 * report → feedback/new, patch-notes → updates. Every old URL, the RSS
 * feed included, redirects permanently, and the feed's guids stay put
 * so subscribers don't get every update again.
 */

/** Distinct, ordered publish dates, so "newest first" is deterministic. */
const publishedOn = (day: number): string => new Date(Date.UTC(2026, 0, day, 12)).toISOString()

/** `Location` resolved against the server, so relative and absolute answers compare equal. */
const locationOf = (headers: Record<string, string>): string => new URL(headers.location ?? '', BASE_URL).href

test.describe('S7.1 redirects', () => {
  let project: GameProject
  let issue: Issue
  let note: PatchNote
  let player: APIRequestContext

  test.beforeAll(async ({ api, playwright, uniqueSlug, world }) => {
    const aOwner = api('aOwner')
    project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('rd-portal'))
    issue = await createIssue(aOwner, project, uniqueSlug('rd-issue'), { isPublic: true })
    // Eleven published updates: the feed shows ten a page, so page 2 exists.
    const notes: PatchNote[] = []
    for (let day = 1; day <= 11; day++) {
      notes.push(
        await createPatchNote(aOwner, project, uniqueSlug(`rd-update-${day}`), { publishedAt: publishedOn(day) }),
      )
    }
    note = notes[notes.length - 1]
    player = await newRequestContext(playwright)
  })

  test.afterAll(async () => {
    await player.dispose()
  })

  test('S7.1 every old portal URL redirects permanently', async ({ api }) => {
    const game = `/g/${project.slug}`

    await test.step('each old GET answers 301 to its new URL, which answers 200', async () => {
      for (const [from, to] of [
        [`${game}/issues?view=board`, `${game}/feedback?view=board`],
        [`${game}/issues/${issue.slug}`, `${game}/feedback/${issue.slug}`],
        [`${game}/report`, `${game}/feedback/new`],
        [`${game}/patch-notes`, `${game}/updates`],
        [`${game}/patch-notes/page/2`, `${game}/updates/page/2`],
        [`${game}/patch-notes/${note.slug}`, `${game}/updates/${note.slug}`],
        [`${game}/patch-notes/feed.xml`, `${game}/updates/feed.xml`],
      ]) {
        const hop = await player.get(from, { maxRedirects: 0 })
        expect(hop.status(), from).toBe(301)
        expect(locationOf(hop.headers()), from).toBe(`${BASE_URL}${to}`)

        const followed = await player.get(from)
        expect(followed.status(), `${from} followed`).toBe(200)
        expect(followed.url(), `${from} followed`).toBe(`${BASE_URL}${to}`)
      }
    })

    await test.step('a POST to the old form answers 308 and, followed, stores the report', async () => {
      const title = 'Old form still reaches the studio'
      const data = {
        category: 'OTHER',
        description: 'Posted by a form cached before the rename.',
        title,
        turnstileToken: TURNSTILE_DUMMY_TOKEN,
      }

      const hop = await player.post(`${game}/report/submit`, { data, maxRedirects: 0 })
      expect(hop.status()).toBe(308)
      expect(locationOf(hop.headers())).toBe(`${BASE_URL}${game}/feedback/new/submit`)

      const followed = await player.post(`${game}/report/submit`, { data })
      expect(followed.status(), await followed.text()).toBe(200)
      const { id } = (await followed.json()) as { id: number }

      const { status, body } = await api('aOwner').findByID('issue-reports', id, { depth: 0 })
      expect(status, JSON.stringify(body)).toBe(200)
      expect(body.title).toBe(title)
      expect(body.gameProject).toBe(project.id)
    })

    await test.step('the new feed links to /updates, and its guids are still the /patch-notes URLs', async () => {
      const response = await player.get(`${game}/updates/feed.xml`)
      expect(response.status()).toBe(200)
      const items = [...(await response.text()).matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => item)
      expect(items.length).toBeGreaterThan(0)
      const latest = items[0]
      expect(latest).toContain(`<link>${BASE_URL}${game}/updates/${note.slug}</link>`)
      expect(latest).toContain(`<guid isPermaLink="true">${BASE_URL}${game}/patch-notes/${note.slug}</guid>`)
    })
  })
})
