import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { extractID } from 'payload/shared'

import type { Issue } from '../../../payload-types'

import { revalidateGameLanding } from '../../../hooks/revalidateGameLanding'

/**
 * The flagship landing page shows a live known-issues summary, so
 * public-visible issue changes must revalidate /g/[slug].
 *
 * Cross-plan contract with the admin kanban: writes that only move a
 * card (the fractional `_order` field — or any field outside this
 * list) must NOT revalidate, so drag-and-drop never churns public ISR.
 */
const LANDING_FIELDS = [
  'title',
  'slug',
  'summary',
  'status',
  'category',
  'isPublic',
  'isPinned',
  'upvoteCount',
] as const satisfies readonly (keyof Issue)[]

export const revalidateIssueLanding: CollectionAfterChangeHook<Issue> = async ({
  doc,
  previousDoc,
  req: { context, payload },
}) => {
  if (context.disableRevalidate) return doc
  // Issues that never appeared publicly can't affect the landing page.
  if (!doc.isPublic && !previousDoc?.isPublic) return doc
  const projectChanged =
    // On create, previousDoc is an empty object.
    previousDoc?.gameProject != null &&
    String(extractID(doc.gameProject)) !== String(extractID(previousDoc.gameProject))
  if (
    previousDoc &&
    !projectChanged &&
    LANDING_FIELDS.every((field) => doc[field] === previousDoc[field])
  ) {
    return doc
  }

  if (projectChanged && previousDoc) {
    if (previousDoc.isPublic) await revalidateGameLanding(previousDoc.gameProject, payload)
    if (doc.isPublic) await revalidateGameLanding(doc.gameProject, payload)
  } else {
    await revalidateGameLanding(doc.gameProject, payload)
  }
  return doc
}

export const revalidateIssueLandingDelete: CollectionAfterDeleteHook<Issue> = async ({
  doc,
  req: { context, payload },
}) => {
  if (context.disableRevalidate || !doc?.isPublic) return doc
  await revalidateGameLanding(doc.gameProject, payload)
  return doc
}
