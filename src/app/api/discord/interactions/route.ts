import { getDiscordConfig } from '@/lib/discord/config'
import { InteractionType, parseInteraction, pong } from '@/lib/discord/interactions'
import { isValidInteractionRequest } from '@/lib/discord/verify'
import { getLogger } from '@/lib/logger'

const log = getLogger('discord.interactions')

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

  switch (interaction.type) {
    case InteractionType.PING:
      log.info(
        { durationMs: Date.now() - startedAt, interactionType: interaction.type },
        'Discord interaction',
      )
      return Response.json(pong())
  }
}
