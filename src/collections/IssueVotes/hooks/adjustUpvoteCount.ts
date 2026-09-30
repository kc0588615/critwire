import type { PayloadRequest } from 'payload'

import { extractID } from 'payload/shared'

import type { Issue } from '../../../payload-types'

import { revalidateGameLanding } from '../../../hooks/revalidateGameLanding'
import { revalidateUpdatePage } from '../../../hooks/revalidateUpdatePage'

/**
 * Moves an issue's `upvoteCount` by `delta` with an atomic `$inc` inside
 * the vote write's transaction, so concurrent votes never overwrite each
 * other. The adapter call skips Issue hooks, and `updatedAt: null` tells
 * it to leave the timestamp alone: a vote is not an edit.
 */
export const adjustUpvoteCount = async ({
  delta,
  issueID,
  req,
}: {
  delta: -1 | 1
  issueID: number
  req: PayloadRequest
}): Promise<void> => {
  const issue = (await req.payload.db.updateOne({
    collection: 'issues',
    data: { updatedAt: null, upvoteCount: { $inc: delta } },
    id: issueID,
    req,
    select: { fixedInPatchNote: true, gameProject: true, isPublic: true, status: true },
  })) as Pick<Issue, 'fixedInPatchNote' | 'gameProject' | 'isPublic' | 'status'>

  if (!issue.isPublic || req.context.disableRevalidate) return
  await revalidateGameLanding(issue.gameProject, req.payload)
  // A shipped item's votes also show on the update that shipped it.
  if (issue.status === 'FIXED' && issue.fixedInPatchNote != null) {
    await revalidateUpdatePage(extractID(issue.fixedInPatchNote), req.payload)
  }
}
