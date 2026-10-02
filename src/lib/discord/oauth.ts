import { discordFetch, getDiscordConfig } from '@/lib/discord/config'

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
