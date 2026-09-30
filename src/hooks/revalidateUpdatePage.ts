import type { BasePayload } from 'payload'

import { revalidatePath } from 'next/cache'

import type { PatchNote } from '../payload-types'

import { portalPaths } from '@/lib/game-portal/paths'

import { resolveProjectSlug } from './resolveProjectSlug'

/**
 * Revalidates one published update's page, which lists the feedback it
 * shipped ("From your feedback"). A single page, so it's revalidated by
 * its URL (see `PORTAL_ROUTE`). A draft or deleted update has no public
 * page, so there's nothing to do.
 */
export const revalidateUpdatePage = async (
  noteID: PatchNote['id'],
  payload: BasePayload,
): Promise<void> => {
  const note = await payload.findByID({
    collection: 'patch-notes',
    depth: 0,
    disableErrors: true,
    id: noteID,
    select: { _status: true, gameProject: true, slug: true },
  })
  if (note?._status !== 'published' || !note.slug) return

  const gameSlug = await resolveProjectSlug(note.gameProject, payload)
  if (!gameSlug) return

  const path = portalPaths(gameSlug).update(note.slug)
  payload.logger.info(`Revalidating update page at ${path}`)
  revalidatePath(path)
}
