import config from '@payload-config'
import { getPayload, type Payload } from 'payload'

import type { DiscordLink } from '@/lib/discord/oauth'
import { type FeedbackType, reportRefusal } from '@/lib/game-portal/reports'
import type { GameProject, User } from '@/payload-types'

/**
 * The only writers of `GameProject.discord`. Each writes through the
 * Local API with `context.discordLink`, the one thing
 * `discordLinkFieldAccess` admits besides a super admin. The fields render
 * nowhere public, so the writes skip revalidation.
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

/** A select in a Discord form lists at most 25 options. */
const MAX_GUILD_GAMES = 25

export type GuildGame = Pick<GameProject, 'id' | 'name' | 'reportForm' | 'slug' | 'tenant'>

/**
 * The games linked to a Discord server that take reports of `type` now,
 * by name, at most 25. Only the link lookup is privileged, and it returns
 * IDs: the games themselves are read as an anonymous visitor, so a held
 * game or a suspended studio's game drops out through the public read rule.
 */
export const guildGames = async (guildId: string, type: FeedbackType): Promise<GuildGame[]> => {
  const payload = await getPayload({ config })
  const linked = await payload.find({
    collection: 'game-projects',
    depth: 0,
    overrideAccess: true,
    pagination: false,
    select: { slug: true },
    where: { 'discord.guildId': { equals: guildId } },
  })
  if (linked.docs.length === 0) return []

  const visible = await payload.find({
    collection: 'game-projects',
    depth: 0,
    overrideAccess: false,
    pagination: false,
    select: { name: true, reportForm: true, slug: true, tenant: true },
    sort: 'name',
    where: { id: { in: linked.docs.map((game) => game.id) } },
  })
  return visible.docs.filter((game) => reportRefusal(game, type) === null).slice(0, MAX_GUILD_GAMES)
}
