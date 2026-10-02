import type { PayloadRequest } from 'payload'

import type { GameProject, PatchNote } from '@/payload-types'

import { isDiscordOn } from '@/lib/discord/config'
import { truncate } from '@/lib/discord/interactions'
import { gameWebhook } from '@/lib/discord/link'
import { portalPaths } from '@/lib/game-portal/paths'
import { updateFeedTitle } from '@/lib/game-portal/updateTitle'
import { withRef } from '@/lib/share/kit'
import { absoluteURL } from '@/utilities/getURL'

/**
 * Discord posts run on their own queue, which only a server with Discord
 * on runs (`jobs.autoRun` in `payload.config.ts`), so a server with
 * Discord off never claims a post and completes it unsent.
 */
export const DISCORD_QUEUE = 'discord'

/** A post waits this long; a later change replaces it and starts the wait again. */
const POST_DELAY_MS = 60_000

export type DiscordPostJob = { input: { patchNoteID: number }; task: 'discord-update-post' }

/**
 * Queues a post in the write's transaction, if Discord is on and the game
 * has a webhook. The task's concurrency key supersedes the subject's
 * pending post, so quick changes become one post.
 */
export const queueDiscordPost = async ({
  gameID,
  post,
  req,
}: {
  gameID: number
  post: DiscordPostJob
  req: PayloadRequest
}): Promise<void> => {
  if (!isDiscordOn()) return
  if (!(await gameWebhook({ gameID, payload: req.payload, req }))) return

  await req.payload.jobs.queue({
    ...post,
    queue: DISCORD_QUEUE,
    req,
    waitUntil: new Date(Date.now() + POST_DELAY_MS),
  })
}

/** Discord's limits on an embed's author name and title. */
const EMBED_TEXT_MAX = 256
const SUMMARY_MAX = 300

/** A portal page's absolute URL, tagged so the visit counts under "Where players come from". */
const portalLink = (path: string): string => withRef(absoluteURL(path), 'discord')

/** The post for a published update: the game, the update's title and summary, and its page. */
export const updatePostMessage = (
  game: Pick<GameProject, 'name' | 'slug'>,
  note: Pick<PatchNote, 'slug' | 'summary' | 'title' | 'versionLabel'>,
): Record<string, unknown> => ({
  embeds: [
    {
      author: { name: truncate(game.name, EMBED_TEXT_MAX) },
      ...(note.summary?.trim() ? { description: truncate(note.summary.trim(), SUMMARY_MAX) } : {}),
      title: truncate(updateFeedTitle(note), EMBED_TEXT_MAX),
      url: portalLink(portalPaths(game.slug).update(note.slug)),
    },
  ],
})
