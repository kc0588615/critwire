import config from '@payload-config'
import * as Sentry from '@sentry/nextjs'
import { getPayload } from 'payload'
import { z } from 'zod'

import { getLogger } from '@/lib/logger'
import { getClientIP, isJSONRequest } from '@/lib/public-forms/request'
import { isReferralCounterOn, recordReferral } from '@/lib/referrals/counter'
import { REF_SOURCES } from '@/lib/share/platforms'
import { checkRateLimit } from '@/lib/upstash/rate-limit'

const log = getLogger('public.referrals')

// Game IDs are Postgres serial integers.
const referralSchema = z.object({
  game: z.number().int().positive().max(2_147_483_647),
  ref: z.enum(REF_SOURCES),
})

/**
 * Counts one arrival at a game's portal from a kit link tagged `?ref=`,
 * sent by the portal's `ReferralPing`. JSON only and no CORS headers, so
 * another site can't make visitors' browsers send it: forms and `no-cors`
 * fetches can't send JSON, and Next answers the preflight a cross-site JSON
 * fetch needs with no `Access-Control-*` header. Writes only to Upstash.
 */
export async function POST(req: Request): Promise<Response> {
  if (!isJSONRequest(req)) {
    return Response.json({ error: 'Expected application/json.' }, { status: 400 })
  }

  try {
    const parsed = referralSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return Response.json({ error: 'Invalid request body.' }, { status: 400 })
    }
    if (!isReferralCounterOn()) {
      return Response.json({ error: 'Not found.' }, { status: 404 })
    }

    const { game, ref } = parsed.data
    const { success } = await checkRateLimit({
      identifier: `${await getClientIP()}:${game}`,
      key: 'referral',
      limit: 60,
      windowSeconds: 60,
    })
    if (!success) {
      return Response.json({ error: 'Too many requests.' }, { status: 429 })
    }

    // Read as the anonymous visitor: a held game, a suspended studio's game
    // and an unknown ID all count zero.
    const payload = await getPayload({ config })
    const { totalDocs } = await payload.count({
      collection: 'game-projects',
      overrideAccess: false,
      where: { id: { equals: game } },
    })
    if (totalDocs === 0) {
      return Response.json({ error: 'Not found.' }, { status: 404 })
    }

    await recordReferral(game, ref)
    return new Response(null, { status: 204 })
  } catch (err) {
    Sentry.captureException(err)
    log.error({ err, msg: 'Referral count failed.' })
    return Response.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
