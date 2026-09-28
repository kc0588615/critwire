import type { BasePayload, CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath } from 'next/cache'

import type { GameProject } from '../../../payload-types'

import { PORTAL_ROUTE } from '../../../hooks/portalRoutes'

/**
 * Project fields (name, logo, links, accent color…) render on every
 * public page under /g/[gameSlug]: the landing, patch notes and their RSS
 * feed, and the issue, report and contact pages. So any change revalidates
 * the whole portal route, which also covers a renamed or deleted slug.
 */
const revalidatePortal = (slug: string, payload: BasePayload): void => {
  payload.logger.info(`Revalidating game portals after a change to /g/${slug}`)
  revalidatePath(PORTAL_ROUTE, 'layout')
}

export const revalidateGameProject: CollectionAfterChangeHook<GameProject> = ({
  doc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate) revalidatePortal(doc.slug, payload)
  return doc
}

export const revalidateGameProjectDelete: CollectionAfterDeleteHook<GameProject> = ({
  doc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate && doc?.slug) revalidatePortal(doc.slug, payload)
  return doc
}
