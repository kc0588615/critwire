import { randomInt, sign } from 'node:crypto'

import type { APIRequestContext, APIResponse } from '@playwright/test'

import type { RecordedRequest } from './fakeDiscord'
import {
  DISCORD_TEST_APPLICATION_ID,
  DISCORD_TEST_KEYS,
  FAKE_DISCORD_URL,
  type DiscordTestKeys,
} from './env'

export const INTERACTIONS_PATH = '/api/discord/interactions'

/** A fresh 18-digit Discord ID, so tests never share a server, a user or an interaction. */
export const snowflake = (): string =>
  `1${String(randomInt(1e9)).padStart(9, '0')}${String(randomInt(1e8)).padStart(8, '0')}`

export const nowSeconds = (): number => Math.floor(Date.now() / 1000)

/** The headers Discord signs a request with: Ed25519 over timestamp‖body. */
export const signatureHeaders = (
  body: string,
  {
    keys = DISCORD_TEST_KEYS,
    timestamp = nowSeconds(),
  }: { keys?: DiscordTestKeys; timestamp?: number } = {},
): Record<string, string> => ({
  'x-signature-ed25519': sign(null, Buffer.from(`${timestamp}${body}`), keys.privateKey).toString(
    'hex',
  ),
  'x-signature-timestamp': String(timestamp),
})

/** POSTs exactly `body` to the interactions endpoint with the given headers. */
export const postInteraction = (
  request: APIRequestContext,
  body: string,
  headers: Record<string, string>,
): Promise<APIResponse> =>
  request.post(INTERACTIONS_PATH, {
    // A Buffer goes out byte for byte; Playwright would JSON-encode a string that isn't JSON.
    data: Buffer.from(body),
    headers: { 'content-type': 'application/json', ...headers },
    maxRedirects: 0,
  })

/** POSTs `payload` signed as Discord would sign it (or with another key or timestamp). */
export const signedInteraction = (
  request: APIRequestContext,
  payload: unknown,
  options: { keys?: DiscordTestKeys; timestamp?: number } = {},
): Promise<APIResponse> => {
  const body = JSON.stringify(payload)
  return postInteraction(request, body, signatureHeaders(body, options))
}

/** The PING Discord sends when the endpoint URL is saved. */
export const pingInteraction = () => ({
  application_id: DISCORD_TEST_APPLICATION_ID,
  id: snowflake(),
  token: 'e2e-interaction-token',
  type: 1,
  version: 1,
})

/** Every call the Discord stand-in has received, oldest first. */
export const discordRequests = async (request: APIRequestContext): Promise<RecordedRequest[]> => {
  const response = await request.get(`${FAKE_DISCORD_URL}/debug/requests`)
  if (!response.ok()) throw new Error(`fake Discord /debug/requests answered ${response.status()}`)
  return (await response.json()) as RecordedRequest[]
}

export const INSTALL_PATH = '/api/discord/install'
export const CALLBACK_PATH = '/api/discord/callback'

const authHeaders = (token?: string): Record<string, string> =>
  token ? { Authorization: `JWT ${token}` } : {}

/** "Add critwire to your Discord" for `gameID`, as `token`'s user (or anonymously); no redirects followed. */
export const startDiscordInstall = (
  request: APIRequestContext,
  gameID: number,
  token?: string,
): Promise<APIResponse> =>
  request.get(`${INSTALL_PATH}?game=${gameID}`, { headers: authHeaders(token), maxRedirects: 0 })

/** Discord sending the browser back to the callback with `query`, as `token`'s user; no redirects followed. */
export const discordCallback = (
  request: APIRequestContext,
  query: Record<string, string>,
  token?: string,
): Promise<APIResponse> =>
  request.get(`${CALLBACK_PATH}?${new URLSearchParams(query)}`, {
    headers: authHeaders(token),
    maxRedirects: 0,
  })

/** The `state` on the authorize URL an install answered with. */
export const stateOf = (install: APIResponse): string => {
  const state = new URL(install.headers().location ?? '').searchParams.get('state')
  if (!state) throw new Error(`No state in ${install.headers().location}`)
  return state
}

/** The stand-in's authorization code for a studio that picked `guild` and `channel`. */
export const discordCode = ({ guild, channel }: { guild: string; channel: string }): string =>
  `guild-${guild}-channel-${channel}`

/**
 * Links `gameID` to `guild` and `channel` through the real install and
 * callback, as `token`'s user, the way a studio does on Discord's screen.
 * Returns the callback's answer.
 */
export const linkDiscord = async (
  request: APIRequestContext,
  token: string,
  gameID: number,
  target: { guild: string; channel: string },
): Promise<APIResponse> => {
  const install = await startDiscordInstall(request, gameID, token)
  if (install.status() !== 303) throw new Error(`install answered ${install.status()}`)
  return discordCallback(request, { code: discordCode(target), state: stateOf(install) }, token)
}
