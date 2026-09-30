import * as Sentry from '@sentry/nextjs'

import { getLogger } from '@/lib/logger'
import { seedCritterConnect } from '@/seed/critterConnect'

const log = getLogger('seed.critter-connect')

export const dynamic = 'force-dynamic'

const authorize = (request: Request) => {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return request.headers.get('authorization') === `Bearer ${secret}`
}

export async function POST(request: Request): Promise<Response> {
  if (!authorize(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await seedCritterConnect()
    return Response.json({ ok: true, ...result })
  } catch (err) {
    Sentry.captureException(err)
    log.error({ err, msg: 'Critter Connect seed failed.' })
    // Only the operator holding CRON_SECRET gets here, so the reason goes back to the script.
    const reason = err instanceof Error ? err.message : String(err)
    return Response.json({ error: `Critter Connect seed failed: ${reason}` }, { status: 500 })
  }
}
