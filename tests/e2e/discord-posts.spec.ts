import type { APIRequestContext } from '@playwright/test'

import type { GameProject } from '../../src/payload-types'
import { BASE_URL } from './support/env'
import { linkDiscord, pendingDiscordPosts, postKey, runDiscordPosts, snowflake } from './support/discord'
import { type Account, createPatchNote, createProject, expect, hold, test } from './support/fixtures'

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
  const titles = () =>
    webhookSink
      .received(sinkPath)
      .map((post) => (post.body as { embeds: { title: string }[] }).embeds[0].title)

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
