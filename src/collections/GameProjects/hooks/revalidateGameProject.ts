import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath } from 'next/cache'

import type { GameProject } from '../../../payload-types'

/**
 * Project fields (name, links, accent color, banner…) render on the
 * public portal, so any change revalidates /g/[slug] — including the
 * old path when the slug itself changes.
 */
export const revalidateGameProject: CollectionAfterChangeHook<GameProject> = ({
  doc,
  previousDoc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate) {
    payload.logger.info(`Revalidating game portal at /g/${doc.slug}`)
    revalidatePath(`/g/${doc.slug}`)

    if (previousDoc?.slug && previousDoc.slug !== doc.slug) {
      revalidatePath(`/g/${previousDoc.slug}`)
    }
  }
  return doc
}

export const revalidateGameProjectDelete: CollectionAfterDeleteHook<GameProject> = ({
  doc,
  req: { context },
}) => {
  if (!context.disableRevalidate && doc?.slug) {
    revalidatePath(`/g/${doc.slug}`)
  }
  return doc
}
