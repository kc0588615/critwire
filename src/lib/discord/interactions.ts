import { z } from 'zod'

/** Discord's interaction types (https://discord.com/developers/docs/interactions/receiving-and-responding). */
export const InteractionType = {
  PING: 1,
  APPLICATION_COMMAND: 2,
  MODAL_SUBMIT: 5,
} as const

export const InteractionResponseType = {
  PONG: 1,
  CHANNEL_MESSAGE_WITH_SOURCE: 4,
  MODAL: 9,
} as const

export const ApplicationCommandType = {
  CHAT_INPUT: 1,
  MESSAGE: 3,
} as const

export const ApplicationCommandOptionType = {
  STRING: 3,
} as const

/** Commands work in servers only, for apps installed to a server. */
export const GUILD_CONTEXT = 0
export const GUILD_INSTALL = 0

export const MessageFlags = {
  EPHEMERAL: 1 << 6,
} as const

/** The permission bits the message command checks. */
export const Permissions = {
  ADMINISTRATOR: 1n << 3n,
  MANAGE_MESSAGES: 1n << 13n,
} as const

/** A Discord ID. */
export const snowflake = z.string().regex(/^\d{17,20}$/)

const pingSchema = z.object({
  application_id: snowflake,
  id: snowflake,
  type: z.literal(InteractionType.PING),
})

const interactionSchema = z.discriminatedUnion('type', [pingSchema])

export type Interaction = z.infer<typeof interactionSchema>

/**
 * The verified request body as an interaction for this application, or
 * `null` for anything else: not JSON, an unknown type or shape, or another
 * application's ID.
 */
export function parseInteraction(body: Buffer, applicationId: string): Interaction | null {
  let json: unknown
  try {
    json = JSON.parse(body.toString('utf8'))
  } catch {
    return null
  }
  const parsed = interactionSchema.safeParse(json)
  if (!parsed.success || parsed.data.application_id !== applicationId) return null
  return parsed.data
}

export const pong = () => ({ type: InteractionResponseType.PONG })

/** A reply only the player sees, which can never mention anyone. */
export const ephemeralMessage = (content: string) => ({
  data: { allowed_mentions: { parse: [] }, content, flags: MessageFlags.EPHEMERAL },
  type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
})
