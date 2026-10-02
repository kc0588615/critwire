import type { Payload, PayloadRequest } from 'payload'

import type { DiscordLink } from '@/lib/discord/oauth'
import type { User } from '@/payload-types'

/**
 * The only writers of `GameProject.discord`, and the privileged read of its
 * webhook. Each writes through the Local API with `context.discordLink`,
 * the one thing `discordLinkFieldAccess` admits besides a super admin. The
 * fields render nowhere public, so the writes skip revalidation.
 *
 * Collection hooks and jobs import this module, so it never imports
 * `@payload-config`: callers pass `payload` or `req`.
 */

/**
 * Links a game to the server and channel its studio picked, as the
 * signed-in user: collection access, the plugin's tenant scope and
 * `enforceTenantWrite` (membership, suspension) all still apply.
 */
export const linkGame = async ({
  gameID,
  link,
  payload,
  user,
}: {
  gameID: number
  link: DiscordLink
  payload: Payload
  user: User
}): Promise<void> => {
  await payload.update({
    collection: 'game-projects',
    context: { disableRevalidate: true, discordLink: true },
    data: { discord: link },
    depth: 0,
    id: gameID,
    overrideAccess: false,
    user,
  })
}

/**
 * Unlinks a game from its server, as the signed-in user, through the same
 * checks as `linkGame`. Deleting the webhook at Discord is the caller's,
 * once this has committed.
 */
export const unlinkGame = async ({
  gameID,
  payload,
  user,
}: {
  gameID: number
  payload: Payload
  user: User
}): Promise<void> => {
  await payload.update({
    collection: 'game-projects',
    context: { disableRevalidate: true, discordLink: true },
    data: { discord: { channelId: null, guildId: null, webhookUrl: null } },
    depth: 0,
    id: gameID,
    overrideAccess: false,
    user,
  })
}

/**
 * The webhook a game posts to, or `null`. Privileged: the writer behind a
 * hook may have no user, and a job's runner may be anyone, while the URL
 * is readable only by the game's studio. A hook passes `req` only to stay
 * in its write's transaction; a job passes none.
 */
export const gameWebhook = async ({
  gameID,
  payload,
  req,
}: {
  gameID: number
  payload: Payload
  req?: PayloadRequest
}): Promise<null | string> => {
  const game = await payload.findByID({
    collection: 'game-projects',
    depth: 0,
    disableErrors: true,
    id: gameID,
    overrideAccess: true,
    req,
    select: { discord: true },
  })
  return game?.discord?.webhookUrl || null
}

/**
 * Turns posting off for a game whose webhook `failedUrl` was deleted in
 * Discord: clears the channel and webhook, keeping the server link for
 * `/feedback`. Compare and clear: it only touches the game while its
 * webhook is still `failedUrl`, so a link made since the job read it is
 * kept. A system write with no user, so `enforceTenantWrite` lets it through.
 */
export const stopPosting = async ({
  failedUrl,
  gameID,
  payload,
}: {
  failedUrl: string
  gameID: number
  payload: Payload
}): Promise<void> => {
  await payload.update({
    collection: 'game-projects',
    context: { disableRevalidate: true, discordLink: true },
    data: { discord: { channelId: null, webhookUrl: null } },
    depth: 0,
    overrideAccess: true,
    where: { and: [{ id: { equals: gameID } }, { 'discord.webhookUrl': { equals: failedUrl } }] },
  })
}
