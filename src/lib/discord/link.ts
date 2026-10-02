import type { Payload } from 'payload'

import type { DiscordLink } from '@/lib/discord/oauth'
import type { User } from '@/payload-types'

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
