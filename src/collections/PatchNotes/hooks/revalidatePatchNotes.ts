import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath } from 'next/cache'

import type { PatchNote } from '../../../payload-types'

import { resolveProjectSlug } from '../../../hooks/resolveProjectSlug'

/**
 * Invalidates the whole patch-notes subtree for the project: the feed,
 * pagination pages, detail pages, and the RSS route.
 */
const revalidatePatchNotesTree = async (
  doc: PatchNote,
  payload: Parameters<CollectionAfterChangeHook>[0]['req']['payload'],
): Promise<void> => {
  const slug = await resolveProjectSlug(doc.gameProject, payload)
  if (!slug) return

  payload.logger.info(`Revalidating patch notes at /g/${slug}/patch-notes`)
  revalidatePath(`/g/${slug}/patch-notes`, 'layout')
  // The flagship landing page renders the latest published note live.
  revalidatePath(`/g/${slug}`)
}

const relationshipID = (value: PatchNote['gameProject']): number | string =>
  typeof value === 'object' ? value.id : value

export const revalidatePatchNotes: CollectionAfterChangeHook<PatchNote> = async ({
  doc,
  previousDoc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate) {
    const projectChanged =
      previousDoc !== undefined &&
      String(relationshipID(doc.gameProject)) !== String(relationshipID(previousDoc.gameProject))

    if (doc._status === 'published') {
      await revalidatePatchNotesTree(doc, payload)
    }
    if (previousDoc?._status === 'published' && (projectChanged || doc._status !== 'published')) {
      await revalidatePatchNotesTree(previousDoc, payload)
    }
  }
  return doc
}

export const revalidatePatchNotesDelete: CollectionAfterDeleteHook<PatchNote> = async ({
  doc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate && doc) {
    await revalidatePatchNotesTree(doc, payload)
  }
  return doc
}
