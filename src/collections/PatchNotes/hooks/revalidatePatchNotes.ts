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
}

export const revalidatePatchNotes: CollectionAfterChangeHook<PatchNote> = async ({
  doc,
  previousDoc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate) {
    if (doc._status === 'published' || previousDoc?._status === 'published') {
      await revalidatePatchNotesTree(doc, payload)
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
