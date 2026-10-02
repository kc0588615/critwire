import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { extractID } from 'payload/shared'

import type { Issue, PatchNote } from '../../../payload-types'

import { revalidateUpdatePage } from '../../../hooks/revalidateUpdatePage'

/**
 * An update's page lists the public items it shipped, with their title,
 * type and votes (votes revalidate it from `adjustUpvoteCount`).
 *
 * Same contract as `revalidateIssueLanding`: writes that only move a
 * kanban card (`_order`) change none of these fields and never revalidate.
 */
const UPDATE_PAGE_FIELDS = [
  'title',
  'slug',
  'status',
  'type',
  'isPublic',
] as const satisfies readonly (keyof Issue)[]

const linkedNoteID = (issue: Partial<Issue> | undefined): null | PatchNote['id'] =>
  issue?.fixedInPatchNote == null ? null : extractID(issue.fixedInPatchNote)

export const revalidateLinkedUpdates: CollectionAfterChangeHook<Issue> = async ({
  doc,
  previousDoc,
  req,
}) => {
  if (req.context.disableRevalidate) return doc
  // Items that never appeared publicly were never listed on an update.
  if (!doc.isPublic && !previousDoc?.isPublic) return doc

  // On create, previousDoc is an empty object.
  const previousNote = linkedNoteID(previousDoc)
  const note = linkedNoteID(doc)
  const linkChanged = previousNote !== note
  const shownFieldChanged = UPDATE_PAGE_FIELDS.some((field) => doc[field] !== previousDoc?.[field])
  if (!linkChanged && !(note != null && shownFieldChanged)) return doc

  const notes = new Set([previousNote, note].filter((id): id is PatchNote['id'] => id != null))
  for (const id of notes) await revalidateUpdatePage(id, req)
  return doc
}

export const revalidateLinkedUpdatesDelete: CollectionAfterDeleteHook<Issue> = async ({
  doc,
  req,
}) => {
  const note = linkedNoteID(doc)
  if (req.context.disableRevalidate || !doc?.isPublic || note == null) return doc
  await revalidateUpdatePage(note, req)
  return doc
}
