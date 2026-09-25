import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath } from 'next/cache'

import type { Issue } from '../../../payload-types'

import { resolveProjectSlug } from '../../../hooks/resolveProjectSlug'

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

const relationshipID = (value: Issue['gameProject']): number | string =>
  typeof value === 'object' ? value.id : value

const revalidateIssueProject = async (
  project: Issue['gameProject'],
  payload: Parameters<CollectionAfterChangeHook>[0]['req']['payload'],
): Promise<void> => {
  const slug = await resolveProjectSlug(project, payload)
  if (!slug) return
  payload.logger.info(`Revalidating game landing at /g/${slug} (issue change)`)
  revalidatePath(`/g/${slug}`)
}

export const revalidateIssueLanding: CollectionAfterChangeHook<Issue> = async ({
  doc,
  previousDoc,
  req: { context, payload },
}) => {
  if (context.disableRevalidate) return doc
  // Issues that never appeared publicly can't affect the landing page.
  if (!doc.isPublic && !previousDoc?.isPublic) return doc
  const projectChanged =
    previousDoc !== undefined &&
    String(relationshipID(doc.gameProject)) !== String(relationshipID(previousDoc.gameProject))
  if (
    previousDoc &&
    !projectChanged &&
    LANDING_FIELDS.every((field) => doc[field] === previousDoc[field])
  ) {
    return doc
  }

  if (projectChanged && previousDoc) {
    if (previousDoc.isPublic) await revalidateIssueProject(previousDoc.gameProject, payload)
    if (doc.isPublic) await revalidateIssueProject(doc.gameProject, payload)
  } else {
    await revalidateIssueProject(doc.gameProject, payload)
  }
  return doc
}

export const revalidateIssueLandingDelete: CollectionAfterDeleteHook<Issue> = async ({
  doc,
  req: { context, payload },
}) => {
  if (context.disableRevalidate || !doc?.isPublic) return doc

  const slug = await resolveProjectSlug(doc.gameProject, payload)
  if (slug) {
    payload.logger.info(`Revalidating game landing at /g/${slug} (issue deleted)`)
    revalidatePath(`/g/${slug}`)
  }
  return doc
}
