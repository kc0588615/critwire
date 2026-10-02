import { z } from 'zod'

import { discordFetch, getDiscordConfig } from '@/lib/discord/config'
import { GUILD_INSTALL, snowflake } from '@/lib/discord/interactions'
import { sign, verifySignature } from '@/lib/security/sign'
import { isAllowedDiscordWebhookUrl } from '@/lib/validation/discordWebhook'
import { getServerSideURL } from '@/utilities/getURL'

/**
 * POSTs a grant to Discord's `/oauth2/token`, authenticated as the
 * application with HTTP Basic auth, and returns the parsed answer for the
 * caller to validate. Throws `DiscordAPIError` on a non-2xx answer.
 */
export const requestToken = async (params: Record<string, string>): Promise<unknown> => {
  const config = getDiscordConfig()
  if (!config) throw new Error('Discord is off: DISCORD_* variables are not set.')

  const credentials = Buffer.from(`${config.applicationId}:${config.clientSecret}`).toString(
    'base64',
  )
  return discordFetch('/oauth2/token', {
    body: new URLSearchParams(params),
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  })
}

/** Always Discord's own screen, never `DISCORD_API_BASE_URL`: the browser goes there. */
const AUTHORIZE_URL = 'https://discord.com/oauth2/authorize'
/** Commands, plus the webhook Discord creates in the channel the studio picks. No bot. */
const SCOPES = 'applications.commands webhook.incoming'

/** The configured site URL, never the request's host. */
const redirectURI = (): string => `${getServerSideURL()}/api/discord/callback`

/** Where "Add critwire to your Discord" sends the studio, carrying `state`. */
export const authorizeURL = (state: string): string => {
  const config = getDiscordConfig()
  if (!config) throw new Error('Discord is off: DISCORD_* variables are not set.')

  const params = new URLSearchParams({
    client_id: config.applicationId,
    integration_type: String(GUILD_INSTALL),
    redirect_uri: redirectURI(),
    response_type: 'code',
    scope: SCOPES,
    state,
  })
  return `${AUTHORIZE_URL}?${params}`
}

const STATE_PURPOSE = 'discord-oauth-state'
const STATE_TTL_SECONDS = 600

const statePayloadSchema = z.object({
  e: z.number().int(),
  g: z.number().int().positive(),
  u: z.number().int().positive(),
})

export interface OAuthState {
  gameID: number
  userID: number
}

/**
 * The OAuth `state`: which game, which user, and when it expires (10
 * minutes after `nowMs`), signed with PAYLOAD_SECRET. The callback demands
 * that same user be signed in, so no cookie is needed to stop login CSRF
 * or a link swapped between accounts.
 */
export const signState = ({ gameID, userID }: OAuthState, nowMs: number = Date.now()): string => {
  const value = Buffer.from(
    JSON.stringify({ e: Math.floor(nowMs / 1000) + STATE_TTL_SECONDS, g: gameID, u: userID }),
  ).toString('base64url')
  return `${value}.${sign(STATE_PURPOSE, value)}`
}

/** The state's game and user, or `null` when it's malformed, tampered with or expired. */
export const readState = (state: string, nowMs: number = Date.now()): OAuthState | null => {
  const [value, signature, ...rest] = state.split('.')
  if (!value || !signature || rest.length || !/^[0-9a-f]{64}$/.test(signature)) return null
  if (!verifySignature(STATE_PURPOSE, value, signature)) return null

  let decoded: unknown
  try {
    decoded = JSON.parse(Buffer.from(value, 'base64url').toString('utf8'))
  } catch {
    return null
  }
  const parsed = statePayloadSchema.safeParse(decoded)
  if (!parsed.success || parsed.data.e <= Math.floor(nowMs / 1000)) return null
  return { gameID: parsed.data.g, userID: parsed.data.u }
}

const codeGrantSchema = z.object({
  webhook: z.object({
    channel_id: snowflake,
    guild_id: snowflake,
    id: snowflake,
    token: z.string().min(1),
    url: z.string().refine(isAllowedDiscordWebhookUrl, 'Not a Discord webhook URL'),
  }),
})

/** What a studio's authorization links a game to. */
export interface DiscordLink {
  channelId: string
  guildId: string
  webhookUrl: string
}

/**
 * Exchanges the callback's code for the webhook Discord created in the
 * channel the studio picked. The user's own access token in the same
 * answer is dropped: critwire never stores or logs it.
 */
export const exchangeCode = async (code: string): Promise<DiscordLink> => {
  const { webhook } = codeGrantSchema.parse(
    await requestToken({ code, grant_type: 'authorization_code', redirect_uri: redirectURI() }),
  )
  return { channelId: webhook.channel_id, guildId: webhook.guild_id, webhookUrl: webhook.url }
}
