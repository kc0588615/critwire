import { isAllowedDiscordWebhookUrl } from '@/lib/validation/discordWebhook'

const DELIVERY_TIMEOUT_MS = 10_000

/** Discord answered 401 or 404: the webhook was deleted, or its token reset. */
export class DiscordWebhookGoneError extends Error {
  readonly status: number

  constructor(status: number) {
    super(`Discord webhook is gone (${status}).`)
    this.name = 'DiscordWebhookGoneError'
    this.status = status
  }
}

/**
 * POSTs a message to a Discord webhook. Mentions are always disabled, so
 * player text can never ping `@everyone` or a role. Throws on a URL outside
 * the allowlist, a timeout and any non-2xx answer.
 */
export const executeDiscordWebhook = async (
  url: string,
  body: Record<string, unknown>,
): Promise<void> => {
  // Checked again here: values saved before the allowlist existed skipped it.
  if (!isAllowedDiscordWebhookUrl(url)) {
    throw new Error('Refusing to post to a webhook URL that is not Discord’s.')
  }

  const response = await fetch(url, {
    body: JSON.stringify({ ...body, allowed_mentions: { parse: [] } }),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(DELIVERY_TIMEOUT_MS),
  })

  if (response.status === 401 || response.status === 404) {
    throw new DiscordWebhookGoneError(response.status)
  }
  if (!response.ok) {
    throw new Error(`Discord webhook failed with ${response.status}: ${await response.text()}`)
  }
}
