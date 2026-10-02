import { discordFetch } from '@/lib/discord/config'
import { getLogger } from '@/lib/logger'
import { isAllowedDiscordWebhookUrl } from '@/lib/validation/discordWebhook'

const log = getLogger('discord.webhook')

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

/**
 * Deletes a webhook critwire created, through Discord's API with the
 * webhook's own token. Best effort: a failure is logged (by webhook ID,
 * never the token) and swallowed, since the link it belonged to is
 * already gone; the studio can remove it in Server Settings → Integrations.
 */
export const deleteDiscordWebhook = async (url: string): Promise<void> => {
  const match = /^\/api\/webhooks\/(\d+)\/([^/]+)$/.exec(new URL(url).pathname)
  if (!match) {
    log.warn('Not deleting a webhook whose URL has no ID and token')
    return
  }
  const [, id, token] = match
  try {
    await discordFetch(`/webhooks/${id}/${token}`, { method: 'DELETE' })
  } catch (error) {
    log.warn({ err: error, webhookId: id }, 'Could not delete a Discord webhook')
  }
}
