import {
  DISCORD_TEST_APPLICATION_ID,
  DISCORD_TEST_CLIENT_SECRET,
  DISCORD_WRONG_KEYS,
  SECOND_BASE_URL,
} from './support/env'
import {
  discordRequests,
  nowSeconds,
  pingInteraction,
  postInteraction,
  signatureHeaders,
  signedInteraction,
  snowflake,
} from './support/discord'
import { expect, newRequestContext, test } from './support/fixtures'

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
