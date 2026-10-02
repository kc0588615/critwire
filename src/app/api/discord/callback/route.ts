import config from '@payload-config'
import * as Sentry from '@sentry/nextjs'
import { APIError, getPayload } from 'payload'
import { z } from 'zod'

import { gameShareHref } from '@/lib/admin/paths'
import { DiscordAPIError, isDiscordOn } from '@/lib/discord/config'
import { linkGame } from '@/lib/discord/link'
import { exchangeCode, readState } from '@/lib/discord/oauth'
import { deleteDiscordWebhook } from '@/lib/discord/webhook'
import { getLogger } from '@/lib/logger'

const log = getLogger('discord.callback')

const querySchema = z.object({
  code: z.string().min(1).max(512).optional(),
  error: z.string().max(100).optional(),
  state: z.string().min(1).max(1024),
})

type Outcome = 'cancelled' | 'failed' | 'linked'

const redirect = (req: Request, path: string): Response =>
  Response.redirect(new URL(path, req.url), 303)

const toShareTab = (req: Request, gameID: number, outcome: Outcome): Response =>
  redirect(req, `${gameShareHref(gameID)}?discord=${outcome}`)

/**
 * Where Discord sends the studio back after "Add critwire to your
 * Discord". Exchanges the code for the webhook Discord made in the chosen
 * channel and links the game to it, as the user who started the flow.
 */
export async function GET(req: Request): Promise<Response> {
  if (!isDiscordOn()) return new Response(null, { status: 404 })

  const parsed = querySchema.safeParse(Object.fromEntries(new URL(req.url).searchParams))
  if (!parsed.success) return new Response('Invalid request.', { status: 400 })
  const { code, error, state: rawState } = parsed.data

  const state = readState(rawState)
  if (!state) {
    return new Response('This link has expired. Start again from the Share tab.', { status: 400 })
  }

  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: req.headers })
  // The session lapsed on Discord's screen: sign in and start again.
  if (!user) return redirect(req, '/admin/login')
  if (user.id !== state.userID) {
    return new Response('This link was started by another account.', { status: 403 })
  }

  if (error === 'access_denied') return toShareTab(req, state.gameID, 'cancelled')
  if (error || !code) {
    log.warn({ error, gameId: state.gameID }, 'Discord authorization failed')
    return toShareTab(req, state.gameID, 'failed')
  }

  let link
  try {
    link = await exchangeCode(code)
  } catch (err) {
    // A 4xx is a used or bad code (a refreshed callback); anything else is ours to fix.
    const expected = err instanceof DiscordAPIError && err.status < 500
    log[expected ? 'warn' : 'error']({ err, gameId: state.gameID }, 'Discord code exchange failed')
    if (!expected) Sentry.captureException(err)
    return toShareTab(req, state.gameID, 'failed')
  }

  // The webhook this replaces, deleted only once the new link has committed.
  const previous = await payload.findByID({
    collection: 'game-projects',
    depth: 0,
    disableErrors: true,
    id: state.gameID,
    overrideAccess: false,
    // No `select`: the group's read rule needs the document's tenant.
    user,
  })

  try {
    await linkGame({ gameID: state.gameID, link, payload, user })
  } catch (err) {
    // Refused (a suspended studio, a game the user lost) or broken: nothing links to the new webhook.
    const refused = err instanceof APIError
    log[refused ? 'warn' : 'error']({ err, gameId: state.gameID }, 'Linking a game to Discord failed')
    if (!refused) Sentry.captureException(err)
    await deleteDiscordWebhook(link.webhookUrl)
    return toShareTab(req, state.gameID, 'failed')
  }

  const previousUrl = previous?.discord?.webhookUrl
  if (previousUrl && previousUrl !== link.webhookUrl) await deleteDiscordWebhook(previousUrl)

  log.info({ gameId: state.gameID, guildId: link.guildId }, 'Game linked to Discord')
  return toShareTab(req, state.gameID, 'linked')
}
