import type { BasePayload } from 'payload'

import { revalidatePath } from 'next/cache'

import { PORTAL_ROUTE } from './portalRoutes'

/**
 * Revalidates every public page under /g/[gameSlug] (the landing, patch
 * notes and their RSS feed, and the issue, report and contact pages) for
 * every game at once; see `portalRoutes.ts` for why it can't be narrower.
 * `source` names what changed, for the log line.
 */
export const revalidateGamePortal = (source: string, payload: BasePayload): void => {
  payload.logger.info(`Revalidating game portals after a change to ${source}`)
  revalidatePath(PORTAL_ROUTE, 'layout')
}
