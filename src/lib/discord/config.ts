/**
 * The Discord app's settings. Off unless all three of
 * `DISCORD_APPLICATION_ID`, `DISCORD_PUBLIC_KEY` and `DISCORD_CLIENT_SECRET`
 * are set; a blank value counts as unset. Checked at boot by
 * `instrumentation-node.ts`, so a partial or malformed set stops the server.
 */
export interface DiscordConfig {
  apiBaseUrl: string
  applicationId: string
  clientSecret: string
  publicKey: string
}

const DEFAULT_API_BASE_URL = 'https://discord.com/api/v10'
const LOOPBACK_HOSTS = new Set(['127.0.0.1', '[::1]', 'localhost'])
const REQUEST_TIMEOUT_MS = 10_000

const REQUIRED = {
  DISCORD_APPLICATION_ID: { pattern: /^\d{17,20}$/, shape: 'a Discord application ID (17 to 20 digits)' },
  DISCORD_PUBLIC_KEY: { pattern: /^[0-9a-f]{64}$/i, shape: '64 hexadecimal characters' },
  DISCORD_CLIENT_SECRET: { pattern: /^\S+$/, shape: 'the client secret, without spaces' },
} as const

type RequiredName = keyof typeof REQUIRED

const readVar = (name: string): string | undefined => process.env[name]?.trim() || undefined

/**
 * `DISCORD_API_BASE_URL`, for development and E2E only: an http(s) URL on
 * a loopback host, so a typo can never send the client secret elsewhere.
 */
const parseApiBaseUrl = (): string => {
  const raw = readVar('DISCORD_API_BASE_URL')
  if (!raw) return DEFAULT_API_BASE_URL

  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error(`DISCORD_API_BASE_URL must be a URL (got "${raw}").`)
  }
  const isLoopback =
    (url.protocol === 'http:' || url.protocol === 'https:') &&
    LOOPBACK_HOSTS.has(url.hostname) &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash
  if (!isLoopback) {
    throw new Error(
      `DISCORD_API_BASE_URL is for development and tests only and must be an http(s) URL on 127.0.0.1, localhost or [::1] (got "${raw}"). Leave it unset to use Discord.`,
    )
  }
  return raw.replace(/\/+$/, '')
}

/** The settings, or `null` when Discord is off. Throws, naming the variable, on a partial or malformed set. */
export function getDiscordConfig(): DiscordConfig | null {
  const apiBaseUrl = parseApiBaseUrl()

  const names = Object.keys(REQUIRED) as RequiredName[]
  const values = Object.fromEntries(names.map((name) => [name, readVar(name)])) as Record<
    RequiredName,
    string | undefined
  >

  const missing = names.filter((name) => !values[name])
  if (missing.length === names.length) return null
  if (missing.length) {
    throw new Error(
      `Discord needs all three of ${names.join(', ')}, or none of them; ${missing.join(' and ')} ${missing.length === 1 ? 'is' : 'are'} missing.`,
    )
  }

  for (const name of names) {
    const { pattern, shape } = REQUIRED[name]
    if (!pattern.test(values[name] as string)) {
      throw new Error(`${name} must be ${shape}.`)
    }
  }

  return {
    apiBaseUrl,
    applicationId: values.DISCORD_APPLICATION_ID as string,
    clientSecret: values.DISCORD_CLIENT_SECRET as string,
    publicKey: (values.DISCORD_PUBLIC_KEY as string).toLowerCase(),
  }
}

export const isDiscordOn = (): boolean => getDiscordConfig() !== null

/** Discord's API answered with a non-2xx status. */
export class DiscordAPIError extends Error {
  readonly body: string
  readonly status: number

  constructor(status: number, body: string) {
    super(`Discord API answered ${status}: ${body.slice(0, 500)}`)
    this.name = 'DiscordAPIError'
    this.body = body
    this.status = status
  }
}

/**
 * Calls Discord's API at `path` (e.g. `/oauth2/token`) and returns the
 * parsed JSON body, or `null` for an empty one. A 10 s timeout, no
 * redirects; throws `DiscordAPIError` on any non-2xx answer, and throws
 * when Discord is off.
 */
export const discordFetch = async (path: string, init: RequestInit = {}): Promise<unknown> => {
  const config = getDiscordConfig()
  if (!config) throw new Error('Discord is off: DISCORD_* variables are not set.')

  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    ...init,
    redirect: 'error',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  const text = await response.text()
  if (!response.ok) throw new DiscordAPIError(response.status, text)
  return text ? (JSON.parse(text) as unknown) : null
}
