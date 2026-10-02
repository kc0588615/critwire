import type { Payload, TaskConfig } from 'payload'

import * as Sentry from '@sentry/nextjs'
import { extractID } from 'payload/shared'

import type { DiscordPost } from '@/payload-types'

import { isDiscordOn } from '@/lib/discord/config'
import { gameWebhook, stopPosting } from '@/lib/discord/link'
import { postedStage, stagePostMessage, updatePostMessage } from '@/lib/discord/posts'
import { DiscordWebhookGoneError, executeDiscordWebhook } from '@/lib/discord/webhook'
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
 * when the game has no webhook, or its webhook was deleted in Discord,
 * which turns the game's posts off.
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

  try {
    await executeDiscordWebhook(url, message)
  } catch (err) {
    if (!(err instanceof DiscordWebhookGoneError)) throw err
    await stopPosting({ failedUrl: url, gameID, payload })
    log.info({ gameID, status: err.status }, 'The game’s Discord webhook is gone, so its posts are off')
    return false
  }
  await payload.create({
    collection: 'discord-posts',
    data: { gameProject: gameID, ...record },
    depth: 0,
    overrideAccess: true,
  })
  return true
}

/** The game's name and slug as an anonymous visitor reads them: `null` when it's held or its studio is suspended. */
const publicGame = (payload: Payload, gameID: number) =>
  payload.findByID({
    collection: 'game-projects',
    depth: 0,
    disableErrors: true,
    id: gameID,
    overrideAccess: false,
    select: { name: true, slug: true },
  })

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
  const game = await publicGame(payload, gameID)
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

/**
 * Posts the public stage a feedback item is in now, if critwire announces
 * it and it isn't the stage it last posted, so a quick round trip posts
 * nothing. `false` when the item isn't public now.
 */
const postStage = async (payload: Payload, issueID: number): Promise<boolean> => {
  if (!isDiscordOn()) return false

  const issue = await payload.findByID({
    collection: 'issues',
    depth: 0,
    disableErrors: true,
    id: issueID,
    overrideAccess: false,
    select: { gameProject: true, slug: true, status: true, title: true },
  })
  if (!issue) return false
  const gameID = Number(extractID(issue.gameProject))
  const game = await publicGame(payload, gameID)
  if (!game) return false
  const stage = postedStage(issue.status)
  if (!stage) return false

  const latest = await payload.find({
    collection: 'discord-posts',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    select: { stage: true },
    sort: '-id',
    where: { issue: { equals: issueID } },
  })
  if (latest.docs[0]?.stage === stage) return false

  const posted = await deliver({
    gameID,
    message: stagePostMessage(game, issue, stage),
    payload,
    record: { issue: issueID, stage },
  })
  if (posted) log.info({ gameID, issueID, stage }, 'Posted a feedback stage to Discord')
  return posted
}

/** A post task's result, with any failure sent to Sentry before the queue retries it. */
const postResult = async (post: Promise<boolean>): Promise<{ output: { posted: boolean } }> => {
  try {
    return { output: { posted: await post } }
  } catch (err) {
    Sentry.captureException(err)
    throw err
  }
}

export const discordUpdatePostTask: TaskConfig<'discord-update-post'> = {
  slug: 'discord-update-post',
  // A newer change replaces the update's pending post, so quick changes become one post.
  concurrency: { key: ({ input }) => `discord-update:${input.patchNoteID}`, supersedes: true },
  inputSchema: [{ name: 'patchNoteID', type: 'number', required: true }],
  outputSchema: [{ name: 'posted', type: 'checkbox', required: true }],
  retries: RETRIES,
  handler: ({ input, req }) => postResult(postUpdate(req.payload, input.patchNoteID)),
}

export const discordStagePostTask: TaskConfig<'discord-stage-post'> = {
  slug: 'discord-stage-post',
  // A newer stage change replaces the item's pending post; the job posts the stage it's in when it runs.
  concurrency: { key: ({ input }) => `discord-stage:${input.issueID}`, supersedes: true },
  inputSchema: [{ name: 'issueID', type: 'number', required: true }],
  outputSchema: [{ name: 'posted', type: 'checkbox', required: true }],
  retries: RETRIES,
  handler: ({ input, req }) => postResult(postStage(req.payload, input.issueID)),
}
