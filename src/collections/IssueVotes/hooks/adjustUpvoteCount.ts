import type { PayloadRequest } from 'payload'

import type { Issue } from '../../../payload-types'

import { revalidateGameLanding } from '../../../hooks/revalidateGameLanding'

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
    select: { gameProject: true, isPublic: true },
  })) as Pick<Issue, 'gameProject' | 'isPublic'>

  if (issue.isPublic && !req.context.disableRevalidate) {
    await revalidateGameLanding(issue.gameProject, req.payload)
  }
}
