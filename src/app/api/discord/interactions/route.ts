import * as Sentry from '@sentry/nextjs'

import { getDiscordConfig } from '@/lib/discord/config'
import { handleFeedbackCommand, handleFormSubmit } from '@/lib/discord/feedback'
import {
  ephemeralMessage,
  type Interaction,
  type InteractionResponse,
  InteractionType,
  parseInteraction,
  pong,
} from '@/lib/discord/interactions'
import { isValidInteractionRequest } from '@/lib/discord/verify'
import { getLogger } from '@/lib/logger'

const log = getLogger('discord.interactions')

/** A form submission slower than this risks Discord's 3 s; warn before players see timeouts. */
const SLOW_SUBMISSION_MS = 2000

const respond = (interaction: Exclude<Interaction, { type: 1 }>): Promise<InteractionResponse> =>
  interaction.type === InteractionType.APPLICATION_COMMAND
    ? handleFeedbackCommand(interaction)
    : handleFormSubmit(interaction)

/**
 * Discord's interactions endpoint: every command and form submission
 * arrives here as a signed POST, which must be answered within 3 s.
 * The body is verified before it's parsed; a bad signature is a bare 401
 * with no Sentry event, since Discord sends some on purpose when the
 * endpoint URL is saved.
 */
export async function POST(req: Request): Promise<Response> {
  const config = getDiscordConfig()
  if (!config) return new Response(null, { status: 404 })

  const startedAt = Date.now()
  const body = Buffer.from(await req.arrayBuffer())
  const verified = isValidInteractionRequest({
    body,
    nowSeconds: Math.floor(startedAt / 1000),
    publicKey: config.publicKey,
    signature: req.headers.get('x-signature-ed25519'),
    timestamp: req.headers.get('x-signature-timestamp'),
  })
  if (!verified) return new Response(null, { status: 401 })

  const interaction = parseInteraction(body, config.applicationId)
  if (!interaction) {
    log.warn('Unsupported interaction')
    return Response.json({ error: 'Unsupported interaction.' }, { status: 400 })
  }

  if (interaction.type === InteractionType.PING) {
    log.info({ durationMs: Date.now() - startedAt, interactionType: interaction.type }, 'Discord interaction')
    return Response.json(pong())
  }

  let response: InteractionResponse
  try {
    response = await respond(interaction)
  } catch (err) {
    Sentry.captureException(err)
    log.error({ err, guildID: interaction.guild_id, interactionType: interaction.type }, 'Discord interaction failed')
    response = ephemeralMessage('Something went wrong, so nothing was sent. Try again.')
  }

  const durationMs = Date.now() - startedAt
  const fields = { durationMs, guildID: interaction.guild_id, interactionType: interaction.type }
  if (interaction.type === InteractionType.MODAL_SUBMIT && durationMs > SLOW_SUBMISSION_MS) {
    log.warn(fields, 'Slow Discord form submission')
  } else {
    log.info(fields, 'Discord interaction')
  }
  return Response.json(response)
}
