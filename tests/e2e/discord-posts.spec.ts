import type { APIRequestContext } from '@playwright/test'

import { gameShareHref } from '../../src/lib/admin/paths'
import type { GameProject, Issue } from '../../src/payload-types'
import type { RestClient } from './support/api'
import { BASE_URL } from './support/env'
import { linkDiscord, pendingDiscordPosts, postKey, runDiscordPosts, snowflake } from './support/discord'
import {
  type Account,
  asStudioAdmin,
  createIssue,
  createPatchNote,
  createProject,
  expect,
  hold,
  type Studio,
  test,
} from './support/fixtures'

/**
 * Posts to a studio's Discord channel (plans/2026-10-02-discord.md §9,
 * §13). Each game is linked through the real install and callback, so its
 * webhook is on the webhook sink; `runDiscordPosts` stands in for the
 * minute a post waits, and runs the queue as a super admin.
 */

/** Links `game` to a new server and channel, and returns its webhook's path on the sink. */
const linkToNewChannel = async (
  request: APIRequestContext,
  owner: Account,
  game: GameProject,
): Promise<string> => {
  const linked = await linkDiscord(request, owner.token, game.id, { channel: snowflake(), guild: snowflake() })
  expect(linked.headers().location, 'link the game').toContain('discord=linked')
  const { body } = await owner.client.findByID('game-projects', game.id, { depth: 0 })
  const webhookUrl = body.discord?.webhookUrl
  expect(webhookUrl, 'the game has a webhook').toBeTruthy()
  return new URL(webhookUrl as string).pathname
}

/** Moves a feedback item to `status` as its studio does on the board. */
const move = async (owner: Account, issue: Issue, status: Issue['status']): Promise<void> => {
  const { status: code, body } = await owner.client.update('issues', issue.id, { status })
  expect(code, JSON.stringify(body)).toBe(200)
}

interface Embed {
  author: { name: string }
  description?: string
  title: string
  url: string
}

/** The embeds the sink received on `path`, oldest first. */
const embedsAt = (webhookSink: { received: (path: string) => { body: unknown }[] }, path: string): Embed[] =>
  webhookSink.received(path).map((post) => (post.body as { embeds: Embed[] }).embeds[0])

test('D7 a published update posts once to the game’s channel, after a minute', async ({
  api,
  request,
  seedStudio,
  webhookSink,
}) => {
  const superAdmin = api('superAdmin')
  const { tenant, owner } = await seedStudio('d7')
  const game = await createProject(owner.client, tenant.id, `${tenant.slug}-game`, { name: 'Harbor Lights' })
  const sinkPath = await linkToNewChannel(request, owner, game)
  const summary = 'The lighthouse keeper finally has a name. '.repeat(10).trim()

  const note = await createPatchNote(owner.client, game, `${tenant.slug}-lanterns`, {
    summary,
    title: 'Lanterns',
    versionLabel: 'v1.2',
  })
  const key = postKey({ update: note.id })

  await test.step('publishing queues one post on the discord queue, due in a minute', async () => {
    const jobs = await pendingDiscordPosts(superAdmin, key)
    expect(jobs).toHaveLength(1)
    expect(jobs[0]).toMatchObject({
      input: { patchNoteID: note.id },
      queue: 'discord',
      taskSlug: 'discord-update-post',
    })
    expect(Date.parse(jobs[0].waitUntil ?? '') - Date.now()).toBeGreaterThan(30_000)
    expect(webhookSink.received(sinkPath)).toHaveLength(0)
  })

  await test.step('the run posts the update, linked with ref=discord, and pings no one', async () => {
    await runDiscordPosts(superAdmin, [key])
    const received = webhookSink.received(sinkPath)
    expect(received).toHaveLength(1)
    expect(received[0].method).toBe('POST')
    expect(received[0].body).toEqual({
      allowed_mentions: { parse: [] },
      embeds: [
        {
          author: { name: 'Harbor Lights' },
          description: `${summary.slice(0, 299).trimEnd()}…`,
          title: 'v1.2 — Lanterns',
          url: `${BASE_URL}/g/${game.slug}/updates/${note.slug}?ref=discord`,
        },
      ],
    })
    expect(await pendingDiscordPosts(superAdmin, key)).toHaveLength(0)
  })

  await test.step('unpublished and published again, it isn’t posted twice', async () => {
    for (const _status of ['draft', 'published'] as const) {
      const { status, body } = await owner.client.update('patch-notes', note.id, { _status })
      expect(status, JSON.stringify(body)).toBe(200)
    }
    expect(await pendingDiscordPosts(superAdmin, key)).toHaveLength(1)
    await runDiscordPosts(superAdmin, [key])
    expect(await pendingDiscordPosts(superAdmin, key)).toHaveLength(0)
    expect(webhookSink.received(sinkPath)).toHaveLength(1)
  })

  await test.step('editing the published update queues nothing', async () => {
    const { status } = await owner.client.update('patch-notes', note.id, { summary: 'A shorter summary.' })
    expect(status).toBe(200)
    expect(await pendingDiscordPosts(superAdmin, key)).toHaveLength(0)
  })
})

test('D9 a held update never posts, and approving it posts it once', async ({
  api,
  request,
  seedStudio,
  webhookSink,
}) => {
  const superAdmin = api('superAdmin')
  const { tenant, owner } = await seedStudio('d9u')
  const game = await createProject(owner.client, tenant.id, `${tenant.slug}-game`)
  const sinkPath = await linkToNewChannel(request, owner, game)
  const titles = () => embedsAt(webhookSink, sinkPath).map((embed) => embed.title)

  const held = await createPatchNote(owner.client, game, `${tenant.slug}-held`, {
    title: 'This fucking patch',
  })
  const heldKey = postKey({ update: held.id })

  await test.step('an update the filter held queues nothing, and a run posts nothing', async () => {
    expect(held.flagged).toBe(true)
    expect(await pendingDiscordPosts(superAdmin, heldKey)).toHaveLength(0)
    await runDiscordPosts(superAdmin, [heldKey])
    expect(titles()).toEqual([])
  })

  await test.step('a super admin approving it posts it exactly once', async () => {
    await hold(superAdmin, 'patch-notes', held.id, false)
    expect(await pendingDiscordPosts(superAdmin, heldKey)).toHaveLength(1)
    await runDiscordPosts(superAdmin, [heldKey])
    await runDiscordPosts(superAdmin, [heldKey])
    expect(titles()).toEqual(['This fucking patch'])
  })

  await test.step('an update held after its post was queued: the super admin’s run posts nothing', async () => {
    const pulled = await createPatchNote(owner.client, game, `${tenant.slug}-pulled`, { title: 'Pulled patch' })
    const pulledKey = postKey({ update: pulled.id })
    expect(await pendingDiscordPosts(superAdmin, pulledKey)).toHaveLength(1)

    await hold(superAdmin, 'patch-notes', pulled.id)
    await runDiscordPosts(superAdmin, [pulledKey])
    // The job completed, without posting and without an error.
    expect(await pendingDiscordPosts(superAdmin, pulledKey)).toHaveLength(0)
    expect(titles()).toEqual(['This fucking patch'])
  })
})

test('D8 a feedback item posts once per stage it reaches, and quick changes become one post', async ({
  api,
  request,
  seedStudio,
  webhookSink,
}) => {
  const superAdmin = api('superAdmin')
  const { tenant, owner } = await seedStudio('d8')
  const game = await createProject(owner.client, tenant.id, `${tenant.slug}-game`, { name: 'Moss Garden' })
  const sinkPath = await linkToNewChannel(request, owner, game)
  const item = await createIssue(owner.client, game, `${tenant.slug}-flicker`, { title: 'The lantern flickers' })
  const key = postKey({ issue: item.id })
  const stages = () => embedsAt(webhookSink, sinkPath).map((embed) => embed.description)

  await test.step('creating an item already in a public stage queues nothing', async () => {
    const planned = await createIssue(owner.client, game, `${tenant.slug}-planned`, { status: 'PLANNED' })
    expect(await pendingDiscordPosts(superAdmin, postKey({ issue: planned.id }))).toHaveLength(0)
  })

  await test.step('a move within Under review queues nothing', async () => {
    await move(owner, item, 'INVESTIGATING')
    expect(await pendingDiscordPosts(superAdmin, key)).toHaveLength(0)
  })

  await test.step('Planned then In progress within seconds: one pending post, then one post', async () => {
    await move(owner, item, 'PLANNED')
    await move(owner, item, 'IN_PROGRESS')
    const jobs = await pendingDiscordPosts(superAdmin, key)
    expect(jobs).toHaveLength(1)
    expect(jobs[0]).toMatchObject({ input: { issueID: item.id }, queue: 'discord', taskSlug: 'discord-stage-post' })
    expect(Date.parse(jobs[0].waitUntil ?? '') - Date.now()).toBeGreaterThan(30_000)

    await runDiscordPosts(superAdmin, [key])
    const received = webhookSink.received(sinkPath)
    expect(received).toHaveLength(1)
    expect(received[0].body).toEqual({
      allowed_mentions: { parse: [] },
      embeds: [
        {
          author: { name: 'Moss Garden' },
          description: 'Now in progress',
          title: 'The lantern flickers',
          url: `${BASE_URL}/g/${game.slug}/feedback/${item.slug}?ref=discord`,
        },
      ],
    })
    expect(await pendingDiscordPosts(superAdmin, key)).toHaveLength(0)
  })

  await test.step('editing the item without moving it queues nothing', async () => {
    const { status } = await owner.client.update('issues', item.id, { summary: 'Only near water.' })
    expect(status).toBe(200)
    expect(await pendingDiscordPosts(superAdmin, key)).toHaveLength(0)
  })

  await test.step('Fixed posts “Shipped”', async () => {
    await move(owner, item, 'FIXED')
    await runDiscordPosts(superAdmin, [key])
    expect(stages()).toEqual(['Now in progress', 'Shipped'])
  })

  await test.step('Fixed → Planned → Fixed in quick succession posts nothing', async () => {
    await move(owner, item, 'PLANNED')
    await move(owner, item, 'FIXED')
    expect(await pendingDiscordPosts(superAdmin, key)).toHaveLength(1)
    await runDiscordPosts(superAdmin, [key])
    // The job completed, without posting and without an error.
    expect(await pendingDiscordPosts(superAdmin, key)).toHaveLength(0)
    expect(stages()).toEqual(['Now in progress', 'Shipped'])
  })

  await test.step('a private item queues nothing', async () => {
    const hidden = await createIssue(owner.client, game, `${tenant.slug}-hidden`, { isPublic: false })
    await move(owner, hidden, 'PLANNED')
    expect(await pendingDiscordPosts(superAdmin, postKey({ issue: hidden.id }))).toHaveLength(0)
  })
})

test('D9 a stage post queued before its game is held, or its studio suspended, posts nothing', async ({
  api,
  request,
  seedStudio,
  webhookSink,
}) => {
  const superAdmin: RestClient = api('superAdmin')
  const pulls: { label: string; name: string; pull: (studio: Studio, game: GameProject) => Promise<void> }[] = [
    {
      label: 'd9-held',
      name: 'the game held by a super admin',
      pull: (_studio, game) => hold(superAdmin, 'game-projects', game.id),
    },
    {
      label: 'd9-suspended',
      name: 'the studio suspended',
      pull: async ({ tenant }) => {
        const { status, body } = await superAdmin.update('tenants', tenant.id, { suspended: true })
        expect(status, JSON.stringify(body)).toBe(200)
      },
    },
  ]

  for (const { label, name, pull } of pulls) {
    await test.step(`a stage change queued, then ${name}: the run posts nothing`, async () => {
      const studio = await seedStudio(label)
      const { tenant, owner } = studio
      const game = await createProject(owner.client, tenant.id, `${tenant.slug}-game`)
      const sinkPath = await linkToNewChannel(request, owner, game)
      const item = await createIssue(owner.client, game, `${tenant.slug}-item`)
      const key = postKey({ issue: item.id })

      await move(owner, item, 'PLANNED')
      expect(await pendingDiscordPosts(superAdmin, key)).toHaveLength(1)
      await pull(studio, game)
      await runDiscordPosts(superAdmin, [key])
      // The job completed, without posting and without an error.
      expect(await pendingDiscordPosts(superAdmin, key)).toHaveLength(0)
      expect(webhookSink.received(sinkPath)).toHaveLength(0)
    })
  }
})

test('D10 a webhook deleted in Discord turns the game’s posts off, and the tab says so', async ({
  api,
  browser,
  request,
  seedStudio,
  webhookSink,
}) => {
  const superAdmin = api('superAdmin')
  const studio = await seedStudio('d10')
  const { tenant, owner } = studio
  const game = await createProject(owner.client, tenant.id, `${tenant.slug}-game`)
  const sinkPath = await linkToNewChannel(request, owner, game)
  const { body: linked } = await owner.client.findByID('game-projects', game.id, { depth: 0 })
  const item = await createIssue(owner.client, game, `${tenant.slug}-item`)
  const key = postKey({ issue: item.id })

  await test.step('Discord answers 404: the job completes and clears the channel and webhook', async () => {
    webhookSink.respond(sinkPath, 404)
    await move(owner, item, 'PLANNED')
    await runDiscordPosts(superAdmin, [key])

    expect(webhookSink.received(sinkPath)).toHaveLength(1)
    expect(await pendingDiscordPosts(superAdmin, key)).toHaveLength(0)
    const posts = await superAdmin.find('discord-posts', { where: { issue: { equals: item.id } } })
    expect(posts.body.totalDocs, 'nothing was recorded as posted').toBe(0)
    const { body } = await owner.client.findByID('game-projects', game.id, { depth: 0 })
    expect(body.discord, 'the server link stays for /feedback').toMatchObject({
      channelId: null,
      guildId: linked.discord?.guildId,
      webhookUrl: null,
    })
  })

  await test.step('later changes queue nothing', async () => {
    await move(owner, item, 'IN_PROGRESS')
    expect(await pendingDiscordPosts(superAdmin, key)).toHaveLength(0)
  })

  await test.step('the Discord tab says posts are off', async () => {
    await asStudioAdmin(browser, studio, async (page) => {
      const panel = page.getByRole('region', { name: 'Put critwire on your site' })
      const kit = panel.getByRole('tabpanel', { name: 'Discord' })
      await page.goto(gameShareHref(game.id))
      await panel.getByRole('tab', { name: 'Discord' }).click()
      await expect(kit.getByRole('heading', { name: 'Linked to your Discord server' })).toBeVisible()
      await expect(kit.getByText('Posts are off: the webhook was removed in Discord.')).toBeVisible()
      await expect(kit.getByRole('link', { name: 'Open the posts channel' })).toHaveCount(0)
    })
  })
})
