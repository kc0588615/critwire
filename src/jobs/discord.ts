import type { Payload, TaskConfig } from 'payload'

import * as Sentry from '@sentry/nextjs'
import { extractID } from 'payload/shared'

import type { DiscordPost } from '@/payload-types'

import { isDiscordOn } from '@/lib/discord/config'
import { gameWebhook } from '@/lib/discord/link'
import { updatePostMessage } from '@/lib/discord/posts'
import { executeDiscordWebhook } from '@/lib/discord/webhook'
import { getLogger } from '@/lib/logger'

const log = getLogger('jobs.discord')

/**
 * Posts to a game's Discord channel (plans/2026-10-02-discord.md §9). Each
 * job reads its subject as an anonymous visitor: it never passes the job's
 * `req`, whose user is whoever ran the queue (a super admin reads
 * everything), so the public read rules decide what's held, suspended or
 * private. The webhook and the post log are named privileged reads.
 */

/** Discord takes about 30 posts a minute per webhook; the `discord` autorun runs at most 10 jobs a minute. */
const RETRIES = { attempts: 3, backoff: { delay: 60_000, type: 'exponential' as const } }

/**
 * Posts `message` to the game's webhook, then records it, so a crash in
 * between gives a duplicate post on retry, never a silent miss. `false`
 * when the game has no webhook.
 */
const deliver = async ({
  gameID,
  message,
  payload,
  record,
}: {
  gameID: number
  message: Record<string, unknown>
  payload: Payload
  record: Pick<DiscordPost, 'issue' | 'patchNote' | 'stage'>
}): Promise<boolean> => {
  const url = await gameWebhook({ gameID, payload })
  if (!url) return false

  await executeDiscordWebhook(url, message)
  await payload.create({
    collection: 'discord-posts',
    data: { gameProject: gameID, ...record },
    depth: 0,
    overrideAccess: true,
  })
  return true
}

/** Posts a published update once. `false` when it isn't public now or was already posted. */
const postUpdate = async (payload: Payload, patchNoteID: number): Promise<boolean> => {
  if (!isDiscordOn()) return false

  const note = await payload.findByID({
    collection: 'patch-notes',
    depth: 0,
    disableErrors: true,
    id: patchNoteID,
    overrideAccess: false,
  })
  if (!note) return false
  const gameID = Number(extractID(note.gameProject))
  const game = await payload.findByID({
    collection: 'game-projects',
    depth: 0,
    disableErrors: true,
    id: gameID,
    overrideAccess: false,
    select: { name: true, slug: true },
  })
  if (!game) return false

  const posts = await payload.count({
    collection: 'discord-posts',
    overrideAccess: true,
    where: { patchNote: { equals: patchNoteID } },
  })
  if (posts.totalDocs > 0) return false

  const posted = await deliver({
    gameID,
    message: updatePostMessage(game, note),
    payload,
    record: { patchNote: patchNoteID },
  })
  if (posted) log.info({ gameID, patchNoteID }, 'Posted an update to Discord')
  return posted
}

export const discordUpdatePostTask: TaskConfig<'discord-update-post'> = {
  slug: 'discord-update-post',
  // A newer change replaces the update's pending post, so quick changes become one post.
  concurrency: { key: ({ input }) => `discord-update:${input.patchNoteID}`, supersedes: true },
  inputSchema: [{ name: 'patchNoteID', type: 'number', required: true }],
  outputSchema: [{ name: 'posted', type: 'checkbox', required: true }],
  retries: RETRIES,
  handler: async ({ input, req }) => {
    try {
      return { output: { posted: await postUpdate(req.payload, input.patchNoteID) } }
    } catch (err) {
      Sentry.captureException(err)
      throw err
    }
  },
}
