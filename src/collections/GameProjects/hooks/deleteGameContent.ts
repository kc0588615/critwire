import type { CollectionBeforeDeleteHook } from 'payload'

import { deleteContactJobs } from '@/jobs/contact'
import { deleteWhereOrThrow } from '@/lib/payload/deleteWhereOrThrow'

/**
 * Deleting a game deletes its content, in the game delete's transaction:
 * its Discord post records, feedback reports, feedback items (each takes
 * its votes, `deleteIssueVotes`), updates with their versions, and queued
 * contact messages. Their keys to the game are NOT NULL with Payload's
 * default ON DELETE SET NULL, so the game can't go first. Each delete runs
 * its collection's hooks, so the items and updates revalidate themselves.
 * Any failure throws, and the whole delete rolls back.
 */
export const deleteGameContent: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const ofGame = { gameProject: { equals: id } }
  for (const collection of ['discord-posts', 'issue-reports', 'issues', 'patch-notes'] as const) {
    await deleteWhereOrThrow({ collection, req, where: ofGame })
  }
  // The job input's `projectID` is text.
  await deleteContactJobs({ req, where: { 'input.projectID': { equals: String(id) } } })
}
