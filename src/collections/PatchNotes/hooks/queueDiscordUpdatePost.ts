import type { CollectionAfterChangeHook } from 'payload'

import { extractID } from 'payload/shared'

import type { PatchNote } from '../../../payload-types'

import { queueDiscordPost } from '@/lib/discord/posts'

/** What an anonymous visitor may see of the update itself; the job checks the game and studio. */
const isVisible = (note: Partial<PatchNote> | undefined): boolean =>
  note?._status === 'published' && !note.flagged

/**
 * Queues the game's Discord post when an update becomes visible: a first
 * publish, a republish, or a super admin approving a held update. Saving a
 * draft or editing a published update queues nothing, and the post log
 * keeps a republish from posting twice.
 */
export const queueDiscordUpdatePost: CollectionAfterChangeHook<PatchNote> = async ({
  doc,
  previousDoc,
  req,
}) => {
  if (isVisible(doc) && !isVisible(previousDoc)) {
    await queueDiscordPost({
      gameID: Number(extractID(doc.gameProject)),
      post: { input: { patchNoteID: doc.id }, task: 'discord-update-post' },
      req,
    })
  }
  return doc
}
