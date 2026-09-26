import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath } from 'next/cache'

import type { GameProject } from '../../../payload-types'

/**
 * Project fields (name, logo, links, accent color…) render on every
 * public page under /g/[slug]: the landing, patch notes and their RSS
 * feed, and the issue, report and contact pages. So any change
 * revalidates the whole subtree, including the old one when the slug
 * itself changes.
 */
const revalidatePortal = (slug: string): void => revalidatePath(`/g/${slug}`, 'layout')

export const revalidateGameProject: CollectionAfterChangeHook<GameProject> = ({
  doc,
  previousDoc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate) {
    payload.logger.info(`Revalidating game portal at /g/${doc.slug}`)
    revalidatePortal(doc.slug)

    if (previousDoc?.slug && previousDoc.slug !== doc.slug) {
      revalidatePortal(previousDoc.slug)
    }
  }
  return doc
}

export const revalidateGameProjectDelete: CollectionAfterDeleteHook<GameProject> = ({
  doc,
  req: { context },
}) => {
  if (!context.disableRevalidate && doc?.slug) {
    revalidatePortal(doc.slug)
  }
  return doc
}
