import { randomInt, sign } from 'node:crypto'

import type { APIRequestContext, APIResponse } from '@playwright/test'

import type { PayloadJob } from '../../../src/payload-types'
import type { RestClient } from './api'
import type { RecordedRequest } from './fakeDiscord'
import { runDueJobs } from './jobs'
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

/** Where an interaction happens: a server and one of its channels. */
export interface DiscordPlace {
  guild: string
  channel: string
}

/** The member who sent it. Permissions default to Send Messages only. */
export interface DiscordMember {
  id: string
  username: string
  permissions?: string
}

const SEND_MESSAGES = '2048'

/** What every interaction in a server carries, with a fresh interaction ID. */
const guildInteraction = (place: DiscordPlace, member: DiscordMember) => ({
  application_id: DISCORD_TEST_APPLICATION_ID,
  channel_id: place.channel,
  guild_id: place.guild,
  id: snowflake(),
  member: {
    permissions: member.permissions ?? SEND_MESSAGES,
    user: { id: member.id, username: member.username },
  },
  token: 'e2e-interaction-token',
  version: 1,
})

/** `/feedback type:<kind>`. */
export const feedbackCommand = (place: DiscordPlace, member: DiscordMember, kind: 'bug' | 'idea') => ({
  ...guildInteraction(place, member),
  data: { id: snowflake(), name: 'feedback', options: [{ name: 'type', type: 3, value: kind }], type: 1 },
  type: 2,
})

/** A message in a server's channel, as Discord resolves it for a message command. */
export interface DiscordMessage {
  id: string
  content: string
  author: { id: string; username: string }
}

/** "Send to critwire" on `message`, by `member`. */
export const sendCommand = (place: DiscordPlace, member: DiscordMember, message: DiscordMessage) => ({
  ...guildInteraction(place, member),
  data: {
    id: snowflake(),
    name: 'Send to critwire',
    resolved: {
      messages: {
        [message.id]: {
          ...message,
          author: { ...message.author, discriminator: '0', global_name: null },
          channel_id: place.channel,
          timestamp: new Date().toISOString(),
          type: 0,
        },
      },
    },
    target_id: message.id,
    type: 3,
  },
  type: 2,
})

/** One field of a form the endpoint answered with: a Label holding a text input or a select. */
export interface DiscordFormField {
  type: 18
  label: string
  component: {
    type: 3 | 4
    custom_id: string
    options?: { label: string; value: string }[]
    required?: boolean
    style?: number
    min_length?: number
    max_length?: number
    value?: string
  }
}

export interface DiscordForm {
  custom_id: string
  title: string
  components: DiscordFormField[]
}

/** The reply to an interaction: a form (type 9) or a message (type 4). */
export interface DiscordReply {
  type: number
  data: {
    content?: string
    flags?: number
    allowed_mentions?: { parse: string[] }
  } & Partial<DiscordForm>
}

/** Sends a signed interaction and returns its 200 reply. */
export const interact = async (request: APIRequestContext, payload: unknown): Promise<DiscordReply> => {
  const response = await signedInteraction(request, payload)
  if (response.status() !== 200) {
    throw new Error(`interaction answered ${response.status()}: ${await response.text()}`)
  }
  return (await response.json()) as DiscordReply
}

/** Sends a command that must answer with a form, and returns the form. */
export const openForm = async (request: APIRequestContext, payload: unknown): Promise<DiscordForm> => {
  const reply = await interact(request, payload)
  if (reply.type !== 9) throw new Error(`expected a form, got ${JSON.stringify(reply)}`)
  return reply.data as DiscordForm
}

/** The custom IDs of a form's fields, in order. */
export const fieldIDs = (form: DiscordForm): string[] => form.components.map((field) => field.component.custom_id)

/**
 * Submitting `form` with `values` by field ID; a select gets its one value.
 * Discord's current layout wraps each field in a Label; `layout: 'row'`
 * sends the older Action Row shape instead.
 */
export const formSubmission = (
  place: DiscordPlace,
  member: DiscordMember,
  form: DiscordForm,
  values: Record<string, string>,
  { layout = 'label' }: { layout?: 'label' | 'row' } = {},
) => ({
  ...guildInteraction(place, member),
  data: {
    components: form.components.map((field, index) => {
      const { custom_id, type } = field.component
      const value = values[custom_id] ?? ''
      const submitted = type === 3 ? { custom_id, type, values: [value] } : { custom_id, type, value }
      return layout === 'row'
        ? { components: [submitted], id: index + 1, type: 1 }
        : { component: submitted, id: index + 1, type: 18 }
    }),
    custom_id: form.custom_id,
  },
  type: 5,
})

/** The concurrency key of the post an update or a feedback item queues. */
export const postKey = (subject: { update: number } | { issue: number }): string =>
  'update' in subject ? `discord-update:${subject.update}` : `discord-stage:${subject.issue}`

/** Discord post jobs under `key` that haven't run yet, as a super admin sees them. */
export const pendingDiscordPosts = async (superAdmin: RestClient, key: string): Promise<PayloadJob[]> => {
  const { status, body } = await superAdmin.find('payload-jobs', {
    depth: 0,
    limit: 100,
    where: {
      and: [
        { concurrencyKey: { equals: key } },
        { completedAt: { exists: false } },
        { processing: { equals: false } },
      ],
    },
  })
  if (status !== 200) throw new Error(`payload-jobs answered ${status}: ${JSON.stringify(body)}`)
  return body.docs
}

/**
 * "A minute passes" for the posts under `keys`: `runDueJobs` makes their
 * pending jobs due and runs the `discord` queue through the REST endpoint
 * as the super admin until they've run. That's deliberate: the run endpoint hands its caller's
 * request, and so its user, to every job, and a super admin reads
 * everything (F5). The jobs must still post only what's public.
 */
export const runDiscordPosts = (superAdmin: RestClient, keys: string[]): Promise<void> =>
  runDueJobs(superAdmin, { queue: 'discord', where: { concurrencyKey: { in: keys } } })
