import type { BasePayload } from 'payload'

import { revalidatePath } from 'next/cache'

import { PORTAL_ROUTE } from '@/lib/game-portal/paths'

/**
 * Revalidates every public page under /g/[gameSlug] (the hub, the
 * updates and their RSS feed, and the feedback, form and contact pages) for
 * every game at once; see `PORTAL_ROUTE` for why it can't be narrower.
 * `source` names what changed, for the log line.
 */
export const revalidateGamePortal = (source: string, payload: BasePayload): void => {
  payload.logger.info(`Revalidating game portals after a change to ${source}`)
  revalidatePath(PORTAL_ROUTE, 'layout')
}
