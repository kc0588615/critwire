import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { extractID } from 'payload/shared'

import type { PatchNote } from '../../../payload-types'

import { revalidateGameLanding } from '../../../hooks/revalidateGameLanding'

/**
 * Patch-note changes invalidate the project's whole patch-notes subtree
 * (feed, pagination, detail pages, RSS) and the landing, which renders
 * the latest published note live.
 */
const PATCH_NOTES_SECTION = 'patch-notes'

export const revalidatePatchNotes: CollectionAfterChangeHook<PatchNote> = async ({
  doc,
  previousDoc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate) {
    const projectChanged =
      // On create, previousDoc is an empty object.
      previousDoc?.gameProject != null &&
      String(extractID(doc.gameProject)) !== String(extractID(previousDoc.gameProject))

    if (doc._status === 'published') {
      await revalidateGameLanding(doc.gameProject, payload, PATCH_NOTES_SECTION)
    }
    if (previousDoc?._status === 'published' && (projectChanged || doc._status !== 'published')) {
      await revalidateGameLanding(previousDoc.gameProject, payload, PATCH_NOTES_SECTION)
    }
  }
  return doc
}

export const revalidatePatchNotesDelete: CollectionAfterDeleteHook<PatchNote> = async ({
  doc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate && doc) {
    await revalidateGameLanding(doc.gameProject, payload, PATCH_NOTES_SECTION)
  }
  return doc
}
