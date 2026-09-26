const DISCORD_WEBHOOK_HOSTS = new Set([
  'canary.discord.com',
  'discord.com',
  'discordapp.com',
  'ptb.discord.com',
])

/**
 * True only for a Discord webhook URL: https, a Discord host, no port or
 * credentials, and a path under `/api/webhooks/`. The server POSTs player
 * messages to this URL, so anything else would let a studio member point it
 * at internal or third-party endpoints (SSRF).
 *
 * `DISCORD_WEBHOOK_TEST_ORIGIN` admits exactly one other origin, for the E2E
 * harness's local sink. Production never sets it.
 */
export const isAllowedDiscordWebhookUrl = (value: string): boolean => {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }

  if (url.username || url.password) return false
  if (!url.pathname.startsWith('/api/webhooks/')) return false

  const testOrigin = process.env.DISCORD_WEBHOOK_TEST_ORIGIN
  if (testOrigin && url.origin === testOrigin) return true

  return url.protocol === 'https:' && url.port === '' && DISCORD_WEBHOOK_HOSTS.has(url.hostname)
}

/**
 * Payload validator for `contact.discordWebhookUrl`. Applies only while the
 * project routes contact to Discord, so a stale value in the hidden field
 * never blocks saving a project that routes elsewhere.
 */
export const validateContactDiscordWebhookUrl = (
  value: null | string | string[] | undefined,
  { siblingData }: { siblingData: Partial<{ target: null | string }> },
): string | true => {
  if (siblingData?.target !== 'DISCORD_WEBHOOK') return true
  if (value == null || value === '') return true
  if (typeof value !== 'string' || !isAllowedDiscordWebhookUrl(value)) {
    return 'Must be a Discord webhook URL, e.g. https://discord.com/api/webhooks/…'
  }
  return true
}
