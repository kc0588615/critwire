import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'

import type { CollectionSlug, Where } from 'payload'

import type { GameProject, PayloadJob } from '../../src/payload-types'
import type { RestClient } from './support/api'
import { countInDatabase } from './support/db'
import { linkDiscord, postKey, runDiscordPosts, snowflake } from './support/discord'
import { PASSWORD, TURNSTILE_DUMMY_TOKEN } from './support/env'
import {
  castVote,
  createIssue,
  createPatchNote,
  createProject,
  createReport,
  expect,
  randomEmail,
  seed,
  test,
  uploadImage,
} from './support/fixtures'

/**
 * Deleting things (plans/2026-10-04-legal-launch.md, Goal 6). A game takes
 * its feedback, votes, updates, Discord post records and queued contact
 * messages with it, and a studio takes its games, images and memberships,
 * each in its delete's one transaction. Accounts and abuse reports stay.
 */

const MEDIA_DIR = path.join(process.cwd(), 'media')

/** Fails unless the super admin finds nothing in `collection` matching `where`. */
async function expectNone(superAdmin: RestClient, collection: CollectionSlug, where: Where): Promise<void> {
  const { status, body } = await superAdmin.find(collection, { depth: 0, limit: 1, where })
  expect(status, JSON.stringify(body)).toBe(200)
  expect(body.totalDocs, `${collection} matching ${JSON.stringify(where)}`).toBe(0)
}

/** The contact jobs queued for `game`, in any state, as the super admin sees them. */
async function contactJobsOf(superAdmin: RestClient, game: GameProject): Promise<PayloadJob[]> {
  const { status, body } = await superAdmin.find('payload-jobs', {
    depth: 0,
    limit: 100,
    where: {
      and: [
        { taskSlug: { in: ['email-contact-form', 'discord-webhook'] } },
        { 'input.projectID': { equals: String(game.id) } },
      ],
    },
  })
  expect(status, JSON.stringify(body)).toBe(200)
  return body.docs
}

/**
 * A player sends `message` through `game`'s contact form. The game routes
 * contact to email and E2E has no Resend, so the job fails and is kept
 * with its input.
 */
async function queueUndeliveredContact(
  { anonymous, superAdmin }: { anonymous: RestClient; superAdmin: RestClient },
  game: GameProject,
  message: string,
): Promise<void> {
  const { status, body } = await anonymous.raw('POST', `/g/${game.slug}/contact/submit`, {
    data: { message, turnstileToken: TURNSTILE_DUMMY_TOKEN },
  })
  expect(status, JSON.stringify(body)).toBe(200)
  expect(await contactJobsOf(superAdmin, game), 'the undelivered message is kept').toHaveLength(1)
}

const emailContact: Partial<GameProject> = { contact: { target: 'EMAIL', email: 'studio@e2e.test' } }

test('AD1 an owner deletes a game, and its content goes with it', async ({
  api,
  playwright,
  request,
  seedStudio,
  webhookSink,
}) => {
  const superAdmin = api('superAdmin')
  const marker = `ad1-${randomUUID()}`
  const { tenant, owner } = await seedStudio('ad1')
  const game = await createProject(owner.client, tenant.id, `${tenant.slug}-game`, emailContact)
  const otherGame = await createProject(owner.client, tenant.id, `${tenant.slug}-other`)
  const otherItem = await createIssue(owner.client, otherGame, `${tenant.slug}-other-item`)

  const item = await createIssue(owner.client, game, `${tenant.slug}-item`, { title: `Item ${marker}` })
  expect((await castVote(playwright, item.id)).upvoteCount).toBe(1)
  const report = await createReport(owner.client, game, { title: `Report ${marker}` })

  const linked = await linkDiscord(request, owner.token, game.id, { channel: snowflake(), guild: snowflake() })
  expect(linked.headers().location, 'link the game').toContain('discord=linked')
  const { body: linkedGame } = await owner.client.findByID('game-projects', game.id, { depth: 0 })
  const sinkPath = new URL(linkedGame.discord?.webhookUrl as string).pathname
  const update = await createPatchNote(owner.client, game, `${tenant.slug}-update`, { title: `Update ${marker}` })
  await runDiscordPosts(superAdmin, [postKey({ update: update.id })])
  expect(webhookSink.received(sinkPath), 'the update was posted').toHaveLength(1)
  const posts = await superAdmin.find('discord-posts', { where: { gameProject: { equals: game.id } } })
  expect(posts.body.totalDocs, 'a Discord post record').toBe(1)

  await queueUndeliveredContact({ anonymous: api('anonymous'), superAdmin }, game, `Message ${marker}`)
  expect(await countInDatabase(marker), 'the content is in the database').toBeGreaterThan(0)

  await test.step('the owner deletes the game', async () => {
    const { status, body } = await owner.client.remove('game-projects', game.id)
    expect(status, JSON.stringify(body)).toBe(200)
  })

  await test.step('its content is gone', async () => {
    expect((await superAdmin.findByID('game-projects', game.id)).status).toBe(404)
    const ofGame = { gameProject: { equals: game.id } }
    for (const collection of ['issues', 'issue-reports', 'patch-notes', 'discord-posts'] as const) {
      await expectNone(superAdmin, collection, ofGame)
    }
    await expectNone(superAdmin, 'issue-votes', { issue: { equals: item.id } })
    expect((await superAdmin.findByID('issue-reports', report.id)).status).toBe(404)
    expect((await superAdmin.findByID('patch-notes', update.id)).status).toBe(404)
    expect(await contactJobsOf(superAdmin, game)).toHaveLength(0)
    expect(await countInDatabase(marker), 'nothing holds the content, versions and job logs included').toBe(0)
  })

  await test.step('the studio and its other game stay', async () => {
    expect((await superAdmin.findByID('tenants', tenant.id)).status).toBe(200)
    expect((await superAdmin.findByID('game-projects', otherGame.id)).status).toBe(200)
    expect((await superAdmin.findByID('issues', otherItem.id)).status).toBe(200)
  })
})

test('AD2 a super admin deletes a studio, and only its content goes', async ({ api, playwright, seedStudio }) => {
  const superAdmin = api('superAdmin')
  const marker = `ad2-${randomUUID()}`
  const { tenant, owner } = await seedStudio('ad2')
  const member = await seed(superAdmin, 'users', {
    email: randomEmail('ad2-member'),
    password: PASSWORD,
    roles: ['user'],
    tenants: [{ tenant: tenant.id, roles: ['member'] }],
  })

  const control = await seedStudio('ad2-control')
  const controlGame = await createProject(control.owner.client, control.tenant.id, `${control.tenant.slug}-game`)
  const controlItem = await createIssue(control.owner.client, controlGame, `${control.tenant.slug}-item`)

  const image = await uploadImage(owner.client, tenant.id, `${marker}.png`, `Logo ${marker}`)
  const imageFile = path.join(MEDIA_DIR, image.filename as string)
  const game = await createProject(owner.client, tenant.id, `${tenant.slug}-game`, { ...emailContact, logo: image.id })
  const hub = `/g/${game.slug}`
  const item = await createIssue(owner.client, game, `${tenant.slug}-item`, { title: `Item ${marker}` })
  const report = await createReport(owner.client, game, { title: `Report ${marker}` })
  const update = await createPatchNote(owner.client, game, `${tenant.slug}-update`, { title: `Update ${marker}` })

  await test.step('the studio has an image, an item with a vote, a report, an update, a queued contact message and an abuse report', async () => {
    expect(existsSync(imageFile), 'the image is on disk').toBe(true)
    expect((await api('anonymous').raw('GET', image.url as string)).status, 'the image URL').toBe(200)
    expect((await castVote(playwright, item.id)).upvoteCount).toBe(1)
    await queueUndeliveredContact({ anonymous: api('anonymous'), superAdmin }, game, `Message ${marker}`)
    const abuse = await api('anonymous').raw('POST', '/report-abuse/submit', {
      data: { page: hub, reason: 'spam', details: 'Links to a phishing site.', turnstileToken: TURNSTILE_DUMMY_TOKEN },
    })
    expect(abuse.status, JSON.stringify(abuse.body)).toBe(200)
    expect((await api('anonymous').raw('GET', hub)).status).toBe(200)
    expect(await countInDatabase(marker), 'the content is in the database').toBeGreaterThan(0)
  })

  await test.step('the super admin deletes the studio', async () => {
    const { status, body } = await superAdmin.remove('tenants', tenant.id)
    expect(status, JSON.stringify(body)).toBe(200)
  })

  await test.step('its games, content and image are gone', async () => {
    expect((await superAdmin.findByID('tenants', tenant.id)).status).toBe(404)
    const ofStudio = { tenant: { equals: tenant.id } }
    for (const collection of ['game-projects', 'issues', 'issue-reports', 'issue-votes', 'patch-notes', 'media'] as const) {
      await expectNone(superAdmin, collection, ofStudio)
    }
    expect((await superAdmin.findByID('issue-reports', report.id)).status).toBe(404)
    expect((await superAdmin.findByID('patch-notes', update.id)).status).toBe(404)
    expect(await contactJobsOf(superAdmin, game)).toHaveLength(0)
    // Payload answers 403 for a file no readable media row names.
    expect((await api('anonymous').raw('GET', image.url as string)).status, 'the image URL').toBe(403)
    expect(existsSync(imageFile), 'the image file is deleted').toBe(false)
    expect((await api('anonymous').raw('GET', hub)).status, 'the portal').toBe(404)
    expect(await countInDatabase(marker), 'nothing holds the studio’s content').toBe(0)
  })

  await test.step('its accounts stay, without the studio', async () => {
    for (const id of [owner.id, member.id]) {
      const { status, body } = await superAdmin.findByID('users', id, { depth: 0 })
      expect(status).toBe(200)
      expect(body.tenants ?? []).toEqual([])
    }
  })

  await test.step('the abuse report stays, with its page and no game', async () => {
    const { body } = await superAdmin.find('abuse-reports', { depth: 0, where: { pageUrl: { equals: hub } } })
    expect(body.docs).toHaveLength(1)
    expect(body.docs[0]).toMatchObject({ gameProject: null, pageUrl: hub })
  })

  await test.step('another studio is untouched', async () => {
    expect((await superAdmin.findByID('tenants', control.tenant.id)).status).toBe(200)
    expect((await superAdmin.findByID('game-projects', controlGame.id)).status).toBe(200)
    expect((await superAdmin.findByID('issues', controlItem.id)).status).toBe(200)
  })
})
