import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import type { GameProject } from '../../../payload-types'

import { revalidateGamePortal } from '../../../hooks/revalidateGamePortal'

/**
 * Project fields (name, logo, links, accent color…) render on every
 * public page under /g/[gameSlug], so any change revalidates the whole
 * portal route, which also covers a renamed or deleted slug.
 */
export const revalidateGameProject: CollectionAfterChangeHook<GameProject> = ({
  doc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate) revalidateGamePortal(`/g/${doc.slug}`, payload)
  return doc
}

export const revalidateGameProjectDelete: CollectionAfterDeleteHook<GameProject> = ({
  doc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate && doc?.slug) revalidateGamePortal(`/g/${doc.slug}`, payload)
  return doc
}
