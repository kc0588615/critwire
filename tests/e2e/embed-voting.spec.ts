import type { BrowserContext, ConsoleMessage, Frame, Page, Request } from '@playwright/test'

import { portalPaths } from '../../src/lib/game-portal/paths'
import { withRef } from '../../src/lib/share/kit'
import { BASE_URL } from './support/env'
import { createIssue, createProject, expect, tally, test } from './support/fixtures'

/**
 * Voting from the board widget (section 4 of the embed plan). The embed
 * holds no vote control: its vote link opens critwire's own item page in
 * a popup, where the one first-party vote cookie applies, and the page
 * tells the embed the new count. The host page is `embedHost`, on
 * 127.0.0.1, so it's cross-site from the app, as a studio's site is.
 */

const VOTE_API = `${BASE_URL}/api/vote`
const SELF = "frame-ancestors 'self'"

const itemURL = (gameSlug: string, slug: string) => `${BASE_URL}${portalPaths(gameSlug).feedbackItem(slug)}`

/** The item page's vote button, named "Upvote 3" or "Upvoted 3". */
const upvote = (on: Page) => on.getByRole('button', { name: /^Upvoted?\s*\d+$/ })

const expectUpvote = async (on: Page, pressed: boolean, count: number) => {
  await expect(upvote(on)).toHaveAttribute('aria-pressed', String(pressed))
  await expect(upvote(on).locator('.fs-vote-count')).toHaveText(String(count))
}

/** The board frame on the host page. */
const boardFrame = (page: Page): Frame => {
  const frame = page.frames().find((candidate) => candidate.url().includes('/embed/board'))
  if (!frame) throw new Error('The host page has no board frame')
  return frame
}

/** The page `action` opens in `context`: the popup or the fallback tab. */
const opens = async (context: BrowserContext, action: () => Promise<void>): Promise<Page> => {
  const [opened] = await Promise.all([context.waitForEvent('page'), action()])
  await opened.waitForLoadState('domcontentloaded')
  return opened
}

test('E4 a vote from the embed is cast on critwire’s page, once per browser', async ({
  api,
  browser,
  context,
  embedHost,
  page,
  uniqueSlug,
  world,
}) => {
  test.setTimeout(90_000)
  const aOwner = api('aOwner')
  const superAdmin = api('superAdmin')
  const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('embed-vote'))
  const first = await createIssue(aOwner, project, uniqueSlug('embed-vote-first'), { title: 'Lantern flickers' })
  const second = await createIssue(aOwner, project, uniqueSlug('embed-vote-second'), { title: 'Map pins vanish' })
  const frame = page.frameLocator('iframe')
  const row = (title: string) => frame.locator('.cw-embed-rows > li', { hasText: title })
  const voteLink = (title: string) => row(title).getByRole('link', { name: `Vote for ${title},`, exact: false })
  const expectRow = async (title: string, votes: number, voted: boolean) => {
    await expect(row(title).locator('.cw-embed-vote .fs-vote-inline')).toHaveText(new RegExp(`^▲ ${votes} votes?$`))
    await expect(row(title).getByText('Voted', { exact: true })).toHaveCount(voted ? 1 : 0)
  }
  const hostVoteRequests: string[] = []
  page.on('request', (request: Request) => {
    if (request.url().startsWith(VOTE_API)) hostVoteRequests.push(request.frame().url())
  })

  await page.goto(embedHost.url({ game: project.slug, widget: 'board' }))
  await expectRow(first.title, 0, false)
  await expectRow(second.title, 0, false)

  let popup: Page
  await test.step('the vote link opens the item page in one popup, which keeps its opener (V1, V2)', async () => {
    popup = await opens(context, () => voteLink(first.title).click())
    expect(popup.url()).toBe(withRef(itemURL(project.slug, first.slug), 'embed'))
    // The item page sends COOP `unsafe-none`, so the popup can still answer the embed.
    expect(await popup.evaluate(() => window.opener !== null)).toBe(true)
    await expectUpvote(popup, false, 0)
    expect(context.pages()).toHaveLength(2)
  })

  await test.step('vote messages from the host page, or from the frame itself, change no row (V3)', async () => {
    const forged = { critwire: 1, type: 'vote', issueId: String(second.id), votes: 99, voted: true }
    // The right shape, from the wrong origin…
    await page.evaluate((message) => {
      document.querySelector('iframe')!.contentWindow!.postMessage(message, '*')
    }, forged)
    // …and from the right origin, but not from the window the embed opened.
    await boardFrame(page).evaluate((message) => window.postMessage(message, location.origin), forged)
  })

  await test.step('Upvote in the popup counts once, and the embed shows it (V5)', async () => {
    await upvote(popup).click()
    await expectUpvote(popup, true, 1)
    expect(await tally(superAdmin, first.id)).toMatchObject({ upvoteCount: 1, rows: 1 })
    await expectRow(first.title, 1, true)
    // Messages arrive in order, so the forged ones were already handled, and ignored.
    await expectRow(second.title, 0, false)
  })

  await test.step('voting again from the embed opens a page already showing "Upvoted"', async () => {
    await popup.close()
    const again = await opens(context, () => voteLink(first.title).click())
    await expectUpvote(again, true, 1)
    await again.close()
    expect(await tally(superAdmin, first.id)).toMatchObject({ upvoteCount: 1, rows: 1 })
  })

  await test.step('a vote on the portal first: the embed’s popup shows it, and the count stays 1', async () => {
    const portal = await context.newPage()
    await portal.goto(itemURL(project.slug, second.slug))
    await upvote(portal).click()
    await expectUpvote(portal, true, 1)
    await portal.close()
    const fromEmbed = await opens(context, () => voteLink(second.title).click())
    await expectUpvote(fromEmbed, true, 1)
    await fromEmbed.close()
    expect(await tally(superAdmin, second.id)).toMatchObject({ upvoteCount: 1, rows: 1 })
  })

  await test.step('with the popup blocked, the link opens a new tab instead (V1)', async () => {
    await boardFrame(page).evaluate(() => {
      window.open = () => null
    })
    const tab = await opens(context, () => voteLink(first.title).click())
    expect(tab.url()).toBe(withRef(itemURL(project.slug, first.slug), 'embed'))
    await expectUpvote(tab, true, 1)
    expect(context.pages()).toHaveLength(2)
    await tab.close()
  })

  await test.step('the host page and its frame never called the vote API (V6)', async () => {
    expect(hostVoteRequests).toEqual([])
  })

  await test.step('another browser sees both counts, and no "Voted"', async () => {
    const other = await browser.newContext()
    try {
      const otherPage = await other.newPage()
      await otherPage.goto(embedHost.url({ game: project.slug, widget: 'board' }))
      const otherRow = (title: string) =>
        otherPage.frameLocator('iframe').locator('.cw-embed-rows > li', { hasText: title })
      for (const title of [first.title, second.title]) {
        await expect(otherRow(title).locator('.cw-embed-vote .fs-vote-inline')).toHaveText(/^▲ 1 vote$/)
        await expect(otherRow(title).getByText('Voted', { exact: true })).toHaveCount(0)
      }
    } finally {
      await other.close()
    }
  })
})

test('E5 a third-party page can’t vote without the player’s click on critwire', async ({
  api,
  context,
  embedHost,
  page,
  uniqueSlug,
  world,
}) => {
  test.setTimeout(90_000)
  const aOwner = api('aOwner')
  const superAdmin = api('superAdmin')
  const project = await createProject(aOwner, world.tenants.A.id, uniqueSlug('embed-attack'))
  const issue = await createIssue(aOwner, project, uniqueSlug('embed-attack-item'), { title: 'Door clips through' })
  const item = itemURL(project.slug, issue.slug)
  const body = JSON.stringify({ issueId: issue.id })
  const embedVoteRequests: string[] = []
  page.on('request', (request: Request) => {
    if (request.url().startsWith(VOTE_API) && request.frame().url().includes('/embed/')) {
      embedVoteRequests.push(request.url())
    }
  })
  const voteResponse = () =>
    page.waitForResponse((response) => response.url() === VOTE_API && response.request().method() === 'POST')

  await page.goto(embedHost.url({ game: project.slug, widget: 'board' }))
  const frame = page.frameLocator('iframe')
  await expect(frame.locator('.cw-embed-rows > li', { hasText: issue.title })).toBeVisible()

  await test.step('a JSON fetch from the host page fails CORS', async () => {
    const outcome = await page.evaluate(
      ({ url, json }) =>
        fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: json,
          credentials: 'include',
        }).then(
          () => 'answered',
          () => 'blocked',
        ),
      { url: VOTE_API, json: body },
    )
    expect(outcome).toBe('blocked')
  })

  await test.step('a no-cors text post gets 400', async () => {
    const answered = voteResponse()
    await page.evaluate(
      ({ url, json }) => {
        void fetch(url, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain' },
          body: json,
          credentials: 'include',
        })
      },
      { url: VOTE_API, json: body },
    )
    expect((await answered).status()).toBe(400)
  })

  await test.step('the item page can’t be framed by the host page', async () => {
    const violations: string[] = []
    page.on('console', (message: ConsoleMessage) => {
      if (message.text().includes('frame-ancestors')) violations.push(message.text())
    })
    const loaded = page.waitForResponse((response) => response.url() === item)
    await page.evaluate((src) => {
      const framed = document.createElement('iframe')
      framed.id = 'attack'
      framed.src = src
      document.body.append(framed)
    }, item)
    expect((await loaded).headers()['content-security-policy']).toBe(SELF)
    await expect.poll(() => violations).toContainEqual(expect.stringContaining(SELF))
    await expect(page.frameLocator('#attack').getByRole('button', { name: /^Upvote/ })).toHaveCount(0)
    await page.locator('#attack').evaluate((framed) => framed.remove())
  })

  await test.step('the embed’s filters and vote link never call the vote API (V6)', async () => {
    await frame.getByRole('group', { name: 'Type' }).getByRole('button', { name: 'Bugs' }).click()
    await frame.getByRole('group', { name: 'Type' }).getByRole('button', { name: 'All' }).click()
    const popup = await opens(context, () =>
      frame.getByRole('link', { name: `Vote for ${issue.title},`, exact: false }).click(),
    )
    await expectUpvote(popup, false, 0)
    await popup.close()
    expect(embedVoteRequests).toEqual([])
  })

  await test.step('a form post from the host page gets 400', async () => {
    const answered = voteResponse()
    await page.evaluate(
      ({ url, id }) => {
        // The text/plain trick: the body reads `{"issueId":<id>,"x":"=1"}`.
        const form = document.createElement('form')
        form.method = 'post'
        form.action = url
        form.enctype = 'text/plain'
        const input = document.createElement('input')
        input.name = `{"issueId":${id},"x":"`
        input.value = '1"}'
        form.append(input)
        document.body.append(form)
        form.submit()
      },
      { url: VOTE_API, id: issue.id },
    )
    expect((await answered).status()).toBe(400)
  })

  await test.step('no vote was counted', async () => {
    expect(await tally(superAdmin, issue.id)).toMatchObject({ upvoteCount: 0, rows: 0 })
  })

  await test.step('a page that opens the item page itself: nothing without the click, and no message after it (V4)', async () => {
    await page.goto(embedHost.url({ game: project.slug, widget: 'board' }))
    await page.evaluate(() => {
      const received: unknown[] = []
      Object.assign(window, { received })
      window.addEventListener('message', (event) => received.push(event.data))
    })
    const opened = await opens(context, () => page.evaluate((url) => void window.open(url, 'attack'), item))
    await expectUpvote(opened, false, 0)
    expect(await opened.evaluate(() => window.opener !== null)).toBe(true)
    await opened.waitForLoadState('networkidle')
    expect(await tally(superAdmin, issue.id)).toMatchObject({ upvoteCount: 0, rows: 0 })

    // The player's own click on critwire's page is a vote, but the page that opened it isn't told.
    await upvote(opened).click()
    await expectUpvote(opened, true, 1)
    expect(await tally(superAdmin, issue.id)).toMatchObject({ upvoteCount: 1, rows: 1 })
    // A probe posted after the vote arrives after any message the vote sent.
    await opened.evaluate(() => window.opener.postMessage({ probe: true }, '*'))
    const received = () => page.evaluate(() => (window as unknown as { received: unknown[] }).received)
    await expect.poll(received).toContainEqual({ probe: true })
    // The host page's own board posts its resize messages here too; none of what arrived is a vote.
    expect((await received()).filter((data) => (data as { type?: string } | null)?.type === 'vote')).toEqual([])
    await opened.close()
  })
})
