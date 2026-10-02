import type { CollectionAfterChangeHook } from 'payload'

import { extractID } from 'payload/shared'

import type { Issue } from '../../../payload-types'

import { postedStage, queueDiscordPost } from '@/lib/discord/posts'
import { publicStage } from '@/lib/game-portal/stages'

/**
 * Queues the game's Discord post when a public item moves to a public
 * stage critwire announces: Planned, In progress or Shipped. Creations,
 * moves within one stage and writes that only change `_order` queue
 * nothing, and the post log keeps a round trip from posting again.
 */
export const queueDiscordStagePost: CollectionAfterChangeHook<Issue> = async ({
  doc,
  operation,
  previousDoc,
  req,
}) => {
  const stage = postedStage(doc.status)
  if (
    operation === 'update' &&
    doc.isPublic &&
    stage &&
    publicStage(previousDoc.status)?.id !== stage
  ) {
    await queueDiscordPost({
      gameID: Number(extractID(doc.gameProject)),
      post: { input: { issueID: doc.id }, task: 'discord-stage-post' },
      req,
    })
  }
  return doc
}
