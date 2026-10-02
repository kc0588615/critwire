import * as Sentry from '@sentry/nextjs'
import { z } from 'zod'

import { DiscordAPIError, discordFetch, getDiscordConfig } from '@/lib/discord/config'
import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  GUILD_CONTEXT,
  GUILD_INSTALL,
} from '@/lib/discord/interactions'
import { requestToken } from '@/lib/discord/oauth'
import { getLogger } from '@/lib/logger'

const log = getLogger('discord.commands')

/** The app's commands, in servers only. */
export const DISCORD_COMMANDS = [
  {
    contexts: [GUILD_CONTEXT],
    description: 'Send a bug report or an idea to the game’s team',
    integration_types: [GUILD_INSTALL],
    name: 'feedback',
    options: [
      {
        choices: [
          { name: 'Bug', value: 'bug' },
          { name: 'Idea', value: 'idea' },
        ],
        description: 'Is it a bug or an idea?',
        name: 'type',
        required: true,
        type: ApplicationCommandOptionType.STRING,
      },
    ],
    type: ApplicationCommandType.CHAT_INPUT,
  },
  {
    contexts: [GUILD_CONTEXT],
    // Manage Messages: Discord hides it from other members by default.
    default_member_permissions: '8192',
    integration_types: [GUILD_INSTALL],
    name: 'Send to critwire',
    type: ApplicationCommandType.MESSAGE,
  },
] as const

/** After a network error, a 429 or a 5xx, try again after 1, 5 and 30 minutes. */
const RETRY_DELAYS_MS = [60_000, 300_000, 1_800_000]

const tokenSchema = z.object({ access_token: z.string().min(1) })

/** Waiting can fix a network error, a 429 or a 5xx; not a wrong secret or a rejected definition. */
const isTransient = (error: unknown): boolean =>
  error instanceof DiscordAPIError
    ? error.status === 429 || error.status >= 500
    : !(error instanceof z.ZodError)

const overwriteCommands = async (applicationId: string): Promise<void> => {
  const { access_token } = tokenSchema.parse(
    await requestToken({ grant_type: 'client_credentials', scope: 'applications.commands.update' }),
  )
  await discordFetch(`/applications/${applicationId}/commands`, {
    body: JSON.stringify(DISCORD_COMMANDS),
    headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
    method: 'PUT',
  })
}

const attempt = async (applicationId: string, failures: number): Promise<void> => {
  try {
    await overwriteCommands(applicationId)
    log.info({ commands: DISCORD_COMMANDS.length }, 'Discord commands registered')
  } catch (error) {
    const delay = RETRY_DELAYS_MS[failures]
    if (isTransient(error) && delay !== undefined) {
      log.warn({ err: error, retryInMs: delay }, 'Discord command registration failed; retrying')
      setTimeout(() => void attempt(applicationId, failures + 1), delay).unref()
      return
    }
    log.error({ err: error }, 'Discord command registration failed')
    Sentry.captureException(error)
  }
}

/**
 * Registers the app's commands with Discord, overwriting what's there
 * (idempotent). Fire-and-forget from `register()` at boot: it never
 * blocks or fails the boot, and does nothing when Discord is off.
 */
export function syncDiscordCommands(): void {
  const config = getDiscordConfig()
  if (!config) return
  void attempt(config.applicationId, 0)
}
