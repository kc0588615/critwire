import config from '@payload-config'
import * as Sentry from '@sentry/nextjs'
import { getPayload } from 'payload'

export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  try {
    const payload = await getPayload({ config })
    await payload.count({ collection: 'users' })
    return Response.json({ db: 'up', status: 'ok' })
  } catch (err) {
    Sentry.captureException(err)
    return Response.json({ db: 'down', status: 'error' }, { status: 503 })
  }
}
