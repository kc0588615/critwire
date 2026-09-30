import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath } from 'next/cache'
import { extractID } from 'payload/shared'

import type { PatchNote } from '../../../payload-types'

import { UPDATES_ROUTE } from '@/lib/game-portal/paths'

import { revalidateGameLanding } from '../../../hooks/revalidateGameLanding'

/**
 * A published patch note, or one that just stopped being public,
 * invalidates the updates pages (feed, pagination, detail pages,
 * RSS) and the landing, which renders the latest published note live.
 */
const revalidatePatchNotePages = (): void => revalidatePath(UPDATES_ROUTE, 'layout')

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
    const wasPublished = previousDoc?._status === 'published'

    if (doc._status === 'published' || wasPublished) {
      revalidatePatchNotePages()
    }
    if (doc._status === 'published') {
      await revalidateGameLanding(doc.gameProject, payload)
    }
    if (wasPublished && (projectChanged || doc._status !== 'published')) {
      await revalidateGameLanding(previousDoc.gameProject, payload)
    }
  }
  return doc
}

export const revalidatePatchNotesDelete: CollectionAfterDeleteHook<PatchNote> = async ({
  doc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate && doc) {
    revalidatePatchNotePages()
    await revalidateGameLanding(doc.gameProject, payload)
  }
  return doc
}
