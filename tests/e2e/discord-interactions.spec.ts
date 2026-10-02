import type { APIRequestContext } from '@playwright/test'

import type { GameProject } from '../../src/payload-types'
import type { RestClient } from './support/api'
import {
  BASE_URL,
  DISCORD_TEST_APPLICATION_ID,
  DISCORD_TEST_CLIENT_SECRET,
  DISCORD_WRONG_KEYS,
  SECOND_BASE_URL,
} from './support/env'
import {
  type DiscordMember,
  type DiscordPlace,
  discordRequests,
  feedbackCommand,
  fieldIDs,
  formSubmission,
  interact,
  linkDiscord,
  nowSeconds,
  openForm,
  pingInteraction,
  postInteraction,
  signatureHeaders,
  signedInteraction,
  snowflake,
} from './support/discord'
import { createProject, expect, hold, newRequestContext, test } from './support/fixtures'

/**
 * Discord's interactions endpoint (plans/2026-10-02-discord.md §5, §13).
 * Every request is signed with the fixed-seed test key pair; nothing
 * calls the real Discord.
 */

test('D1 only requests Discord signed, within five minutes, get through', async ({
  playwright,
  request,
}) => {
  const ping = await signedInteraction(request, pingInteraction())
  expect(ping.status()).toBe(200)
  expect(await ping.json()).toEqual({ type: 1 })

  const expectRefused = async (label: string, body: string, headers: Record<string, string>) => {
    const response = await postInteraction(request, body, headers)
    expect(response.status(), label).toBe(401)
    expect(await response.text(), label).toBe('')
  }

  const body = JSON.stringify(pingInteraction())
  await expectRefused('the wrong key', body, signatureHeaders(body, { keys: DISCORD_WRONG_KEYS }))
  await expectRefused(
    'a tampered body',
    body.replace('"version":1', '"version":2'),
    signatureHeaders(body),
  )
  await expectRefused('no headers', body, {})
  const { 'x-signature-ed25519': signature } = signatureHeaders(body)
  await expectRefused('no timestamp', body, { 'x-signature-ed25519': signature })
  await expectRefused(
    '10 minutes old',
    body,
    signatureHeaders(body, { timestamp: nowSeconds() - 600 }),
  )
  await expectRefused(
    '10 minutes ahead',
    body,
    signatureHeaders(body, { timestamp: nowSeconds() + 600 }),
  )

  // Signed, but not an interaction this app handles: a 400.
  const notJSON = 'not json'
  expect((await postInteraction(request, notJSON, signatureHeaders(notJSON))).status()).toBe(400)
  const otherApp = await signedInteraction(request, {
    ...pingInteraction(),
    application_id: snowflake(),
  })
  expect(otherApp.status()).toBe(400)
  const unknownType = await signedInteraction(request, { ...pingInteraction(), type: 99 })
  expect(unknownType.status()).toBe(400)

  // Discord is off on the self-hosted profile: the endpoint doesn't exist.
  const second = await newRequestContext(playwright, SECOND_BASE_URL)
  try {
    const off = await signedInteraction(second, pingInteraction())
    expect(off.status()).toBe(404)
  } finally {
    await second.dispose()
  }
})

test('D4 the commands are registered at boot, once, as the app', async ({ request }) => {
  // Fire-and-forget at boot: poll until the overwrite has landed.
  await expect
    .poll(async () => (await discordRequests(request)).filter((r) => r.method === 'PUT').length)
    .toBeGreaterThan(0)
  const received = await discordRequests(request)

  // Other specs exchange authorization codes; this is the app's own grant.
  const tokenRequests = received.filter(
    (r) =>
      r.path === '/oauth2/token' &&
      (r.body as { grant_type?: string } | null)?.grant_type === 'client_credentials',
  )
  expect(tokenRequests).toHaveLength(1)
  const basic = `Basic ${Buffer.from(`${DISCORD_TEST_APPLICATION_ID}:${DISCORD_TEST_CLIENT_SECRET}`).toString('base64')}`
  expect(tokenRequests[0]).toMatchObject({
    authorization: basic,
    body: { grant_type: 'client_credentials', scope: 'applications.commands.update' },
    method: 'POST',
  })

  // Only the first server has Discord on, so one overwrite in the whole run.
  const puts = received.filter((r) => r.method === 'PUT')
  expect(puts).toHaveLength(1)
  expect(puts[0].path).toBe(`/applications/${DISCORD_TEST_APPLICATION_ID}/commands`)
  expect(puts[0].authorization).toMatch(/^Bearer \S+$/)

  const commands = puts[0].body as Record<string, unknown>[]
  expect(commands).toHaveLength(2)
  const feedback = commands.find((c) => c.name === 'feedback')
  expect(feedback).toMatchObject({
    contexts: [0],
    integration_types: [0],
    options: [
      {
        choices: [
          { name: 'Bug', value: 'bug' },
          { name: 'Idea', value: 'idea' },
        ],
        name: 'type',
        required: true,
        type: 3,
      },
    ],
    type: 1,
  })
  // Everyone may use /feedback.
  expect(feedback).not.toHaveProperty('default_member_permissions')
  expect(commands.find((c) => c.name === 'Send to critwire')).toMatchObject({
    contexts: [0],
    default_member_permissions: '8192',
    integration_types: [0],
    type: 3,
  })
})

/** A fresh server and channel, linked to `game` through install and callback as `token`'s user. */
const linkToNewServer = async (
  request: APIRequestContext,
  token: string,
  game: GameProject,
  guild: string = snowflake(),
): Promise<DiscordPlace> => {
  const place = { channel: snowflake(), guild }
  const linked = await linkDiscord(request, token, game.id, place)
  expect(linked.status(), 'link the game').toBe(303)
  expect(linked.headers().location).toContain('discord=linked')
  return place
}

const player = (username: string): DiscordMember => ({ id: snowflake(), username })

const boardLink = (game: GameProject): string =>
  `<${BASE_URL}/g/${game.slug}/feedback?view=board&ref=discord>`

/** Every report on `game`, read as `client`. */
const reportsOn = async (client: RestClient, game: GameProject) => {
  const { status, body } = await client.find('issue-reports', {
    depth: 0,
    limit: 0,
    where: { gameProject: { equals: game.id } },
  })
  expect(status, JSON.stringify(body)).toBe(200)
  return body.docs
}

const expectPrivateReply = (reply: Awaited<ReturnType<typeof interact>>) => {
  expect(reply.type).toBe(4)
  expect(reply.data.flags).toBe(64)
  expect(reply.data.allowed_mentions).toEqual({ parse: [] })
}

const BUG = {
  title: 'Raft sinks at the harbor',
  details: 'Stepping onto the raft at the harbor sinks it straight away.',
  platform: 'Steam Deck',
  version: '1.4.2',
}

test('D2 /feedback files a private report in the review queue, once', async ({
  api,
  request,
  seedStudio,
}) => {
  const { tenant, owner } = await seedStudio('d2')
  const game = await createProject(owner.client, tenant.id, `${tenant.slug}-game`, { name: 'Harbor Lights' })
  const place = await linkToNewServer(request, owner.token, game)
  const sender = player('harbor_player')

  const bugForm = await openForm(request, feedbackCommand(place, sender, 'bug'))
  await test.step('the bug form: bound to the game, no picker, with platform and version', async () => {
    expect(bugForm.custom_id).toBe(`cw1:fb:bug:${game.id}`)
    expect(bugForm.title).toBe('Report a bug: Harbor Lights')
    expect(fieldIDs(bugForm)).toEqual(['title', 'details', 'platform', 'version'])
    expect(bugForm.components.map((field) => field.label)).toEqual([
      'Title',
      'What happened',
      'Platform',
      'Game version',
    ])
    expect(bugForm.components.every((field) => field.type === 18)).toBe(true)
    expect(bugForm.components[1].component).toMatchObject({ max_length: 4000, min_length: 10, required: true, style: 2 })
  })

  await test.step('the idea form has neither', async () => {
    const ideaForm = await openForm(request, feedbackCommand(place, sender, 'idea'))
    expect(ideaForm.custom_id).toBe(`cw1:fb:idea:${game.id}`)
    expect(fieldIDs(ideaForm)).toEqual(['title', 'details'])
    expect(ideaForm.components[1].label).toBe('Your idea')
  })

  const body = JSON.stringify(formSubmission(place, sender, bugForm, BUG))
  const headers = signatureHeaders(body)
  const submission = JSON.parse(body) as { id: string }

  await test.step('submitting answers privately, with the board link tagged ref=discord', async () => {
    const response = await postInteraction(request, body, headers)
    expect(response.status()).toBe(200)
    const reply = (await response.json()) as Awaited<ReturnType<typeof interact>>
    expectPrivateReply(reply)
    expect(reply.data.content).toBe(
      `Thanks, your bug report for **${game.name}** is in. The studio reviews reports before they go on the board.\n${boardLink(game)}`,
    )
  })

  await test.step('the studio sees a NEW report with the sender, but not the interaction ID', async () => {
    const reports = await reportsOn(owner.client, game)
    expect(reports).toHaveLength(1)
    expect(reports[0]).toMatchObject({
      description: BUG.details,
      discord: { userId: sender.id, username: sender.username },
      gameVersion: BUG.version,
      platform: BUG.platform,
      status: 'NEW',
      title: BUG.title,
      type: 'BUG',
    })
    expect(reports[0].discord).not.toHaveProperty('interactionId')
    const [asSuperAdmin] = await reportsOn(api('superAdmin'), game)
    expect(asSuperAdmin.discord?.interactionId).toBe(submission.id)
  })

  await test.step('anonymous REST and GraphQL read no reports, and nothing went public', async () => {
    const anonymous = api('anonymous')
    expect((await anonymous.find('issue-reports')).status).toBe(403)
    const graphql = await anonymous.raw<{ data?: { IssueReports: { docs: unknown[] } | null } }>(
      'POST',
      '/api/graphql',
      { data: { query: '{ IssueReports { docs { id title discord { userId username } } } }' } },
    )
    expect(graphql.body.data?.IssueReports?.docs ?? []).toHaveLength(0)
    const items = await owner.client.find('issues', { limit: 0, where: { gameProject: { equals: game.id } } })
    expect(items.body.totalDocs).toBe(0)
  })

  await test.step('the same signed request again creates nothing', async () => {
    const response = await postInteraction(request, body, headers)
    expect(response.status()).toBe(200)
    const reply = (await response.json()) as Awaited<ReturnType<typeof interact>>
    expectPrivateReply(reply)
    expect(reply.data.content).toBe('That was already sent.')
    expect(await reportsOn(owner.client, game)).toHaveLength(1)
  })
})

test('D3 Discord reports go through the content filter, and their sender never goes public', async ({
  api,
  request,
  seedStudio,
}) => {
  const { tenant, owner } = await seedStudio('d3')
  const game = await createProject(owner.client, tenant.id, `${tenant.slug}-game`, {
    name: 'Lantern Tide',
    reportForm: { provider: 'native', reviewSubmissions: false },
  })
  const place = await linkToNewServer(request, owner.token, game)
  const sender = player('lantern_fan')
  const ideaForm = await openForm(request, feedbackCommand(place, sender, 'idea'))

  await test.step('offensive text is held as NEW, even with review off', async () => {
    const title = 'This fucking door will not open'
    const reply = await interact(
      request,
      formSubmission(place, sender, ideaForm, {
        details: 'The cellar door in the harbor never opens, whatever I press.',
        title,
      }),
    )
    expectPrivateReply(reply)
    // The same answer as for a clean report under review, as on the web form.
    expect(reply.data.content).toContain('The studio reviews reports before they go on the board.')
    const [report] = (await reportsOn(owner.client, game)).filter((doc) => doc.title === title)
    expect(report).toMatchObject({ flagged: true, issue: null, status: 'NEW' })
  })

  const title = 'Let the raft carry two players'
  await test.step('clean text, in the older Action Row layout, publishes at once', async () => {
    const reply = await interact(
      request,
      formSubmission(
        place,
        sender,
        ideaForm,
        { details: 'A second seat on the raft would make co-op crossings possible.', title },
        { layout: 'row' },
      ),
    )
    expect(reply.data.content).toBe(
      `Thanks, your idea for **Lantern Tide** is in. It’s on the board now.\n${boardLink(game)}`,
    )
  })

  await test.step('the public item carries no Discord field, in REST or feedback.json', async () => {
    const anonymous = api('anonymous')
    const items = await anonymous.find('issues', { depth: 0, where: { gameProject: { equals: game.id } } })
    expect(items.status).toBe(200)
    expect(items.body.docs.map((doc) => doc.title)).toEqual([title])
    const feed = await anonymous.raw<{ items: { title: string }[] }>('GET', `/g/${game.slug}/feedback.json`)
    expect(feed.status).toBe(200)
    expect(feed.body.items.map((item) => item.title)).toEqual([title])
    for (const doc of [items.body.docs[0], feed.body.items[0]]) {
      expect(doc).not.toHaveProperty('discord')
      const text = JSON.stringify(doc)
      expect(text).not.toContain(sender.id)
      expect(text).not.toContain(sender.username)
    }
  })
})

test('D6 a server with several games: the player picks one, and a form stays bound to its game', async ({
  api,
  request,
  seedStudio,
}) => {
  const superAdmin = api('superAdmin')
  const { tenant, owner } = await seedStudio('d6')
  const guild = snowflake()
  // Linked in this order; the picker lists them by name.
  const bay = await createProject(owner.client, tenant.id, `${tenant.slug}-bay`, {
    name: 'Beacon Bay',
    reportForm: { provider: 'native', acceptIdeas: false },
  })
  const isle = await createProject(owner.client, tenant.id, `${tenant.slug}-isle`, { name: 'Anchor Isle' })
  const place = await linkToNewServer(request, owner.token, bay, guild)
  await linkToNewServer(request, owner.token, isle, guild)
  const sender = player('two_games')

  const bugForm = await openForm(request, feedbackCommand(place, sender, 'bug'))
  await test.step('the bug form lists both games, by name; the idea form only the one taking ideas', async () => {
    expect(bugForm.custom_id).toBe('cw1:fb:bug:-')
    expect(bugForm.title).toBe('Report a bug')
    expect(fieldIDs(bugForm)).toEqual(['game', 'title', 'details', 'platform', 'version'])
    expect(bugForm.components[0].component.options).toEqual([
      { label: 'Anchor Isle', value: String(isle.id) },
      { label: 'Beacon Bay', value: String(bay.id) },
    ])
    const ideaForm = await openForm(request, feedbackCommand(place, sender, 'idea'))
    expect(ideaForm.custom_id).toBe(`cw1:fb:idea:${isle.id}`)
    expect(fieldIDs(ideaForm)).toEqual(['title', 'details'])
  })

  await test.step('the report lands on the chosen game', async () => {
    const reply = await interact(request, formSubmission(place, sender, bugForm, { ...BUG, game: String(bay.id) }))
    expect(reply.data.content).toContain('for **Beacon Bay** is in.')
    expect(await reportsOn(owner.client, bay)).toHaveLength(1)
    expect(await reportsOn(owner.client, isle)).toHaveLength(0)
  })

  await test.step("another studio's game as the select's value is refused", async () => {
    const other = await seedStudio('d6-other')
    const theirs = await createProject(other.owner.client, other.tenant.id, `${other.tenant.slug}-game`)
    await linkToNewServer(request, other.owner.token, theirs)
    const reply = await interact(request, formSubmission(place, sender, bugForm, { ...BUG, game: String(theirs.id) }))
    expectPrivateReply(reply)
    expect(reply.data.content).toBe('That game doesn’t take bugs from this server now. Run the command again.')
    expect(await reportsOn(superAdmin, theirs)).toHaveLength(0)
  })

  await test.step('a form opened for one game never sends to another linked since', async () => {
    const x = await createProject(owner.client, tenant.id, `${tenant.slug}-x`)
    const y = await createProject(owner.client, tenant.id, `${tenant.slug}-y`)
    const server = await linkToNewServer(request, owner.token, x)
    const form = await openForm(request, feedbackCommand(server, sender, 'bug'))
    expect(form.custom_id).toBe(`cw1:fb:bug:${x.id}`)

    const unlinked = await superAdmin.update('game-projects', x.id, {
      discord: { channelId: null, guildId: null, webhookUrl: null },
    })
    expect(unlinked.status, JSON.stringify(unlinked.body)).toBe(200)
    await linkToNewServer(request, owner.token, y, server.guild)

    const reply = await interact(request, formSubmission(server, sender, form, BUG))
    expect(reply.data.content).toBe('That game doesn’t take bugs from this server now. Run the command again.')
    expect(await reportsOn(owner.client, x)).toHaveLength(0)
    expect(await reportsOn(owner.client, y)).toHaveLength(0)
  })

  await test.step('a held game is not offered', async () => {
    const shown = await createProject(owner.client, tenant.id, `${tenant.slug}-shown`)
    const held = await createProject(owner.client, tenant.id, `${tenant.slug}-held`)
    const server = await linkToNewServer(request, owner.token, shown)
    await linkToNewServer(request, owner.token, held, server.guild)
    await hold(superAdmin, 'game-projects', held.id)
    const form = await openForm(request, feedbackCommand(server, sender, 'bug'))
    expect(form.custom_id).toBe(`cw1:fb:bug:${shown.id}`)
    expect(fieldIDs(form)).not.toContain('game')
  })

  await test.step('a server with no linked game says so', async () => {
    const reply = await interact(request, feedbackCommand({ channel: snowflake(), guild: snowflake() }, sender, 'bug'))
    expectPrivateReply(reply)
    expect(reply.data.content).toBe('This server isn’t linked to a game on critwire that takes bugs here.')
  })
})
