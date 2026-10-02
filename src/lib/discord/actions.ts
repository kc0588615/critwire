'use server'

import config from '@payload-config'
import { headers } from 'next/headers'
import { getPayload } from 'payload'
import { z } from 'zod'

import { isDiscordOn } from '@/lib/discord/config'
import { unlinkGame } from '@/lib/discord/link'
import { deleteDiscordWebhook } from '@/lib/discord/webhook'
import { getLogger } from '@/lib/logger'

/*
 * Every export of this file is a public endpoint (a Server Action), so it
 * holds only what a studio may call from the Discord tab. `linkGame` and
 * `stopPosting` stay in `link.ts`, out of reach.
 */

const log = getLogger('discord.disconnect')

const gameIDSchema = z.number().int().positive().max(2_147_483_647)

/**
 * The Discord tab's Disconnect: unlinks the game as the signed-in user,
 * then deletes its webhook at Discord, best effort. Throws when Discord is
 * off, with no session, or when the write is refused (another studio's
 * game, a suspended studio). Next checks a Server Action's Origin, so no
 * CSRF token is needed.
 */
export async function disconnectDiscord(gameID: number): Promise<void> {
  if (!isDiscordOn()) throw new Error('Discord is off.')
  const id = gameIDSchema.parse(gameID)

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await headers() })
  if (!user) throw new Error('Sign in to disconnect Discord.')

  // As the user, with no `select`: the group's read rule needs the document's tenant.
  const game = await payload.findByID({
    collection: 'game-projects',
    depth: 0,
    id,
    overrideAccess: false,
    user,
  })
  await unlinkGame({ gameID: id, payload, user })

  const webhookUrl = game.discord?.webhookUrl
  if (webhookUrl) await deleteDiscordWebhook(webhookUrl)
  log.info({ gameId: id }, 'Game unlinked from Discord')
}
