import { sign } from '../../src/lib/security/sign'
import { BASE_URL, DISCORD_TEST_APPLICATION_ID, WEBHOOK_SINK_ORIGIN } from './support/env'
import {
  discordCallback,
  discordCode,
  discordRequests,
  linkDiscord,
  snowflake,
  startDiscordInstall,
  stateOf,
} from './support/discord'
import { createProject, expect, test } from './support/fixtures'

/**
 * "Add critwire to your Discord": the install link, Discord's
 * authorization screen (stood in for by the callback's code) and the
 * callback that links a game to a server and channel
 * (plans/2026-10-02-discord.md §4, §13). Nothing calls the real Discord.
 */

const shareTab = (gameID: number, outcome: string): string =>
  `/admin/collections/game-projects/${gameID}/share?discord=${outcome}`

const locationOf = (response: { headers: () => Record<string, string> }): string =>
  response.headers().location ?? ''

/** The stand-in's API path for deleting the webhook at `url`. */
const webhookDeletePath = (url: string): string =>
  new URL(url).pathname.replace(/^\/api\/webhooks\//, '/webhooks/')

const deletesOf = async (request: Parameters<typeof discordRequests>[0]): Promise<string[]> =>
  (await discordRequests(request)).filter((r) => r.method === 'DELETE').map((r) => r.path)

test('D11 a studio links a game to its Discord, and linking again replaces the webhook', async ({
  request,
  seedStudio,
}) => {
  const { tenant, owner } = await seedStudio('d11')
  const game = await createProject(owner.client, tenant.id, `${tenant.slug}-game`)

  // The install link goes to Discord's own screen, for this app, with a signed state.
  const install = await startDiscordInstall(request, game.id, owner.token)
  expect(install.status()).toBe(303)
  const authorize = new URL(locationOf(install))
  expect(`${authorize.origin}${authorize.pathname}`).toBe('https://discord.com/oauth2/authorize')
  expect(Object.fromEntries(authorize.searchParams)).toEqual({
    client_id: DISCORD_TEST_APPLICATION_ID,
    integration_type: '0',
    redirect_uri: `${BASE_URL}/api/discord/callback`,
    response_type: 'code',
    scope: 'applications.commands webhook.incoming',
    state: expect.stringMatching(/^[\w-]+\.[0-9a-f]{64}$/),
  })

  const guild = snowflake()
  const first = { guild, channel: snowflake() }
  const linked = await discordCallback(
    request,
    { code: discordCode(first), state: stateOf(install) },
    owner.token,
  )
  expect(linked.status()).toBe(303)
  expect(new URL(locationOf(linked)).pathname + new URL(locationOf(linked)).search).toBe(
    shareTab(game.id, 'linked'),
  )

  const read = async () => {
    const { status, body } = await owner.client.findByID('game-projects', game.id, { depth: 0 })
    expect(status).toBe(200)
    return body.discord
  }
  const firstLink = await read()
  expect(firstLink).toMatchObject({ guildId: first.guild, channelId: first.channel })
  expect(firstLink?.webhookUrl).toMatch(
    new RegExp(`^${WEBHOOK_SINK_ORIGIN.replace(/\./g, '\\.')}/api/webhooks/\\d+/[\\w-]+$`),
  )

  // Another channel in the same server: the new webhook replaces the old, which is deleted.
  const second = { guild, channel: snowflake() }
  expect(locationOf(await linkDiscord(request, owner.token, game.id, second))).toContain(
    shareTab(game.id, 'linked'),
  )
  const secondLink = await read()
  expect(secondLink).toMatchObject({ guildId: guild, channelId: second.channel })
  expect(secondLink?.webhookUrl).not.toBe(firstLink?.webhookUrl)
  const deletes = await deletesOf(request)
  expect(deletes).toContain(webhookDeletePath(firstLink?.webhookUrl as string))
  expect(deletes).not.toContain(webhookDeletePath(secondLink?.webhookUrl as string))
})

test('D12 only the studio that owns a game can link it', async ({
  api,
  request,
  seedStudio,
  world,
}) => {
  const { tenant, owner } = await seedStudio('d12')
  const game = await createProject(owner.client, tenant.id, `${tenant.slug}-game`)
  const other = await seedStudio('d12-other')

  // Anonymous: sign in first, then come back.
  const anonymous = await startDiscordInstall(request, game.id)
  expect(anonymous.status()).toBe(303)
  expect(locationOf(anonymous)).toBe(
    `${BASE_URL}/admin/login?redirect=${encodeURIComponent(`/api/discord/install?game=${game.id}`)}`,
  )

  // Another studio can't start the flow for this game, nor for one that doesn't exist.
  expect((await startDiscordInstall(request, game.id, other.owner.token)).status()).toBe(404)
  expect((await startDiscordInstall(request, 2_000_000_000, owner.token)).status()).toBe(404)
  expect((await startDiscordInstall(request, Number.NaN, owner.token)).status()).toBe(400)

  const state = stateOf(await startDiscordInstall(request, game.id, owner.token))
  const code = discordCode({ guild: snowflake(), channel: snowflake() })

  // The state names its user: another account gets a 403, and no session means signing in again.
  const swapped = await discordCallback(request, { code, state }, other.owner.token)
  expect(swapped.status()).toBe(403)
  const noSession = await discordCallback(request, { code, state })
  expect(noSession.status()).toBe(303)
  expect(locationOf(noSession)).toBe(`${BASE_URL}/admin/login`)

  // A tampered or expired state is refused before anything else.
  const [value, signature] = state.split('.')
  const tampered = `${value}.${signature.replace(/^./, (c) => (c === '0' ? '1' : '0'))}`
  expect((await discordCallback(request, { code, state: tampered }, owner.token)).status()).toBe(400)
  const forged = Buffer.from(
    JSON.stringify({ e: Math.floor(Date.now() / 1000) + 600, g: game.id, u: world.users.bOwner.id }),
  ).toString('base64url')
  expect(
    (await discordCallback(request, { code, state: `${forged}.${signature}` }, owner.token)).status(),
  ).toBe(400)
  const expiredValue = Buffer.from(
    JSON.stringify({ e: Math.floor(Date.now() / 1000) - 1, g: game.id, u: owner.id }),
  ).toString('base64url')
  const expired = `${expiredValue}.${sign('discord-oauth-state', expiredValue)}`
  expect((await discordCallback(request, { code, state: expired }, owner.token)).status()).toBe(400)

  // Cancelling on Discord's screen comes back to the Share tab.
  const cancelled = await discordCallback(request, { error: 'access_denied', state }, owner.token)
  expect(cancelled.status()).toBe(303)
  expect(locationOf(cancelled)).toBe(`${BASE_URL}${shareTab(game.id, 'cancelled')}`)

  // None of that linked anything.
  const unlinked = await api('superAdmin').findByID('game-projects', game.id, { depth: 0 })
  expect(unlinked.body.discord?.guildId ?? null).toBeNull()

  // A studio can't write the link through the API, linked or not.
  const forgedLink = {
    guildId: snowflake(),
    channelId: snowflake(),
    webhookUrl: `${WEBHOOK_SINK_ORIGIN}/api/webhooks/1/forged`,
  }
  await owner.client.update('game-projects', game.id, { discord: forgedLink })
  expect(
    (await api('superAdmin').findByID('game-projects', game.id, { depth: 0 })).body.discord
      ?.guildId ?? null,
  ).toBeNull()
  const target = { guild: snowflake(), channel: snowflake() }
  await linkDiscord(request, owner.token, game.id, target)
  await owner.client.update('game-projects', game.id, { discord: forgedLink })
  const { body: stillLinked } = await owner.client.findByID('game-projects', game.id, { depth: 0 })
  expect(stillLinked.discord).toMatchObject({ guildId: target.guild, channelId: target.channel })

  // Players never see the link.
  const { status, body: publicGame } = await api('anonymous').findByID('game-projects', game.id, {
    depth: 0,
  })
  expect(status).toBe(200)
  expect(publicGame).not.toHaveProperty('discord')
  const { body: otherStudio } = await other.owner.client.findByID('game-projects', game.id, {
    depth: 0,
  })
  expect(otherStudio).not.toHaveProperty('discord')
})

test('D12 a suspended studio can’t link, and the new webhook is deleted', async ({
  api,
  request,
  seedStudio,
}) => {
  const { tenant, owner } = await seedStudio('d12-suspended')
  const game = await createProject(owner.client, tenant.id, `${tenant.slug}-game`)
  const install = await startDiscordInstall(request, game.id, owner.token)
  expect(install.status()).toBe(303)

  const superAdmin = api('superAdmin')
  expect((await superAdmin.update('tenants', tenant.id, { suspended: true })).status).toBe(200)
  const deletesBefore = (await deletesOf(request)).length

  const callback = await discordCallback(
    request,
    { code: discordCode({ guild: snowflake(), channel: snowflake() }), state: stateOf(install) },
    owner.token,
  )
  expect(callback.status()).toBe(303)
  expect(locationOf(callback)).toBe(`${BASE_URL}${shareTab(game.id, 'failed')}`)
  expect((await superAdmin.findByID('game-projects', game.id, { depth: 0 })).body.discord?.guildId ?? null).toBeNull()
  // The webhook Discord made for it is gone too.
  await expect.poll(async () => (await deletesOf(request)).length).toBe(deletesBefore + 1)
})
