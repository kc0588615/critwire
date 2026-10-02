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
