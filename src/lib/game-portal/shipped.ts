import type { Issue, PatchNote } from '@/payload-types'

/**
 * The published update a shipped item links to, or null. Items are read
 * through access, so a draft update stays an ID; the status check keeps
 * it that way for readers who can see drafts.
 */
export const shippedUpdate = (
  issue: Pick<Issue, 'fixedInPatchNote' | 'status'>,
): null | PatchNote => {
  const note = issue.fixedInPatchNote
  if (issue.status !== 'FIXED' || note == null || typeof note !== 'object') return null
  return note._status === 'published' ? note : null
}

/** An update's short name: its version, or its title when it has none. */
export const updateName = (note: Pick<PatchNote, 'title' | 'versionLabel'>): string =>
  note.versionLabel || note.title
