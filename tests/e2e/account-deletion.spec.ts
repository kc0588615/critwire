import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import path from 'node:path'

import type { PlaywrightWorkerArgs } from '@playwright/test'
import type { CollectionSlug, Where } from 'payload'

import type { GameProject, PayloadJob, User } from '../../src/payload-types'
import type { RestClient } from './support/api'
import { countInDatabase } from './support/db'
import { linkDiscord, postKey, runDiscordPosts, snowflake } from './support/discord'
import { emailsTo } from './support/email'
import { PASSWORD, TURNSTILE_DUMMY_TOKEN } from './support/env'
import { legalConsentForm } from './support/legal'
import {
  castVote,
  createIssue,
  createPatchNote,
  createProject,
  createReport,
  expect,
  newRequestContext,
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
 * Deleting an account anonymizes it: its studios and content stay.
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

const DELETED_USER = 'Deleted user'

/** The address a deleted account is left with. */
const deletedEmail = (id: number): string => `deleted-${id}@deleted.invalid`

/** The super admin ticks "Delete this account" on `id`, and the save succeeds. */
async function deleteAccount(superAdmin: RestClient, id: number): Promise<User> {
  const { status, body } = await superAdmin.update('users', id, { deleted: true })
  expect(status, JSON.stringify(body)).toBe(200)
  return body.doc
}

/** The HTTP status of a REST sign-in with `email` and `password`. */
async function logInStatus(
  playwright: PlaywrightWorkerArgs['playwright'],
  email: string,
  password: string,
): Promise<number> {
  const context = await newRequestContext(playwright)
  try {
    return (await context.post('/api/users/login', { data: { email, password } })).status()
  } finally {
    await context.dispose()
  }
}

test('AD3 deleting an account anonymizes it, and its studio stays', async ({
  api,
  playwright,
  signUpStudio,
}) => {
  const superAdmin = api('superAdmin')
  const { owner, project, tenant } = await signUpStudio('AD3 Studio')
  const acceptances = { user: { equals: owner.id } }
  expect((await superAdmin.find('legal-acceptances', { where: acceptances })).body.totalDocs).toBeGreaterThan(0)
  expect(await countInDatabase(owner.email), 'the address is in the database').toBeGreaterThan(0)

  await test.step('the super admin deletes the account, and the response shows it scrubbed', async () => {
    const doc = await deleteAccount(superAdmin, owner.id)
    expect(doc).toMatchObject({ deleted: true, email: deletedEmail(owner.id), name: DELETED_USER, roles: ['user'] })
  })

  await test.step('the studio’s creator and the users list show "Deleted user"', async () => {
    const { body: studio } = await superAdmin.findByID('tenants', tenant.id, { depth: 1 })
    expect(studio.createdBy).toMatchObject({ id: owner.id, name: DELETED_USER })
    const { body: users } = await superAdmin.find('users', { depth: 0, where: { id: { equals: owner.id } } })
    expect(users.docs.map(({ name }) => name)).toEqual([DELETED_USER])
  })

  await test.step('the portal and its content stay', async () => {
    expect((await api('anonymous').raw('GET', `/g/${project.slug}`)).status).toBe(200)
    expect((await superAdmin.findByID('game-projects', project.id)).status).toBe(200)
    const { body: member } = await superAdmin.findByID('users', owner.id, { depth: 0 })
    expect(member.tenants?.map(({ tenant: id, roles }) => ({ id, roles }))).toEqual([
      { id: tenant.id, roles: ['owner'] },
    ])
  })

  await test.step('the old session, the old password and the old address no longer sign in', async () => {
    const me = await owner.client.raw<{ user: unknown }>('GET', '/api/users/me')
    expect(me.status).toBe(200)
    expect(me.body.user, 'the old JWT is revoked').toBeNull()
    expect(await logInStatus(playwright, owner.email, owner.password), 'the old address').toBe(401)
    expect(await logInStatus(playwright, deletedEmail(owner.id), owner.password), 'the old password').toBe(401)
  })

  await test.step('nothing holds the address, and the acceptance stays', async () => {
    expect(await countInDatabase(owner.email)).toBe(0)
    expect((await superAdmin.find('legal-acceptances', { where: acceptances })).body.totalDocs).toBeGreaterThan(0)
  })
})

test('AD4 a deleted account stays deleted, and nobody deletes themselves', async ({
  api,
  playwright,
  seedUser,
  signIn,
}) => {
  const superAdmin = api('superAdmin')
  const account = await seedUser('ad4')
  await deleteAccount(superAdmin, account.id)
  const address = deletedEmail(account.id)

  for (const [label, data] of [
    ['a new email', { email: randomEmail('ad4-new') }],
    ['unticking deleted', { deleted: false }],
    ['a new name', { name: 'Back again' }],
    ['a new password', { password: PASSWORD }],
  ] as [string, Partial<User>][]) {
    await test.step(`refused: ${label}`, async () => {
      const { status, body } = await superAdmin.update('users', account.id, data)
      expect(status, JSON.stringify(body)).toBe(400)
    })
  }

  await test.step('refused: a REST DELETE', async () => {
    expect((await superAdmin.remove('users', account.id)).status).toBe(403)
  })

  await test.step('the account is as deletion left it', async () => {
    const { body } = await superAdmin.findByID('users', account.id, { depth: 0 })
    expect(body).toMatchObject({ deleted: true, email: address, name: DELETED_USER })
    expect(await logInStatus(playwright, address, PASSWORD), 'the refused password didn’t take').toBe(401)
  })

  await test.step('a super admin can’t delete their own account', async () => {
    const email = randomEmail('ad4-admin')
    await seed(superAdmin, 'users', { email, password: PASSWORD, roles: ['admin'] })
    const admin = await signIn(email, PASSWORD)
    const { status, body } = await admin.client.update('users', admin.id, { deleted: true })
    expect(status, JSON.stringify(body)).toBe(400)
    expect((await superAdmin.findByID('users', admin.id, { depth: 0 })).body).toMatchObject({ deleted: false, email })
  })

  await test.step('recovery and signup refuse the deleted address, and send nothing', async () => {
    const anonymous = api('anonymous')
    const recovery = await anonymous.raw('POST', '/forgot-password/submit', {
      data: { email: address, turnstileToken: TURNSTILE_DUMMY_TOKEN },
    })
    expect(recovery.status, 'recovery').toBe(400)
    const signup = await anonymous.raw('POST', '/signup/submit', {
      data: { email: address, turnstileToken: TURNSTILE_DUMMY_TOKEN, ...legalConsentForm() },
    })
    expect(signup.status, 'signup').toBe(400)
    expect(await emailsTo(address)).toHaveLength(0)
  })
})
