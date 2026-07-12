import * as Sentry from '@sentry/nextjs'

import { seedCritterConnect } from '@/seed/critterConnect'

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
    return Response.json({ error: 'Critter Connect seed failed' }, { status: 500 })
  }
}
