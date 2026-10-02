import config from '@payload-config'
import { getPayload } from 'payload'
import { z } from 'zod'

import { isDiscordOn } from '@/lib/discord/config'
import { authorizeURL, signState } from '@/lib/discord/oauth'

const querySchema = z.object({ game: z.coerce.number().int().positive().max(2_147_483_647) })

/**
 * "Add critwire to your Discord": sends a signed-in studio member to
 * Discord's authorization screen for one of their games, where they pick
 * the server and the channel for posts. The callback links the game.
 */
export async function GET(req: Request): Promise<Response> {
  if (!isDiscordOn()) return new Response(null, { status: 404 })

  const url = new URL(req.url)
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  if (!user) {
    const back = `${url.pathname}${url.search}`
    return Response.redirect(new URL(`/admin/login?redirect=${encodeURIComponent(back)}`, url), 303)
  }

  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams))
  if (!parsed.success) return new Response('Invalid game.', { status: 400 })

  // As the user: the plugin limits a studio member to their own studios' games.
  const game = await payload.findByID({
    collection: 'game-projects',
    depth: 0,
    disableErrors: true,
    id: parsed.data.game,
    overrideAccess: false,
    user,
  })
  if (!game) return new Response(null, { status: 404 })

  return Response.redirect(authorizeURL(signState({ gameID: game.id, userID: user.id })), 303)
}
