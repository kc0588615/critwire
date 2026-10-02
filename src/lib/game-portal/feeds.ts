import type { GameProject, Issue, PatchNote } from '@/payload-types'

import { EMBED_CACHE_CONTROL } from '@/lib/embed/cacheControl'
import { type FeedbackTypeParam, feedbackTypeParam } from '@/lib/game-portal/feedbackSearchParams'
import { portalPaths, type PortalPaths } from '@/lib/game-portal/paths'
import { updateFeedTitle } from '@/lib/game-portal/patchNotes'
import { shippedUpdate } from '@/lib/game-portal/shipped'
import { publicStage, type PublicStageId } from '@/lib/game-portal/stages'
import { absoluteURL } from '@/utilities/getURL'

/**
 * The public feeds, `feedback.json` (contract v1) and `updates.json`
 * (JSON Feed 1.1), documented in `docs/embed.md`. Contracts: fields may
 * be added, never removed, renamed or retyped; anything incompatible gets
 * a new URL. They show nothing the portal doesn't.
 */

/** One item of `feedback.json`. Every key is always present, null when empty. */
export interface FeedbackFeedItem {
  id: string
  url: string
  title: string
  summary: null | string
  type: FeedbackTypeParam
  stage: PublicStageId
  votes: number
  date_created: string
  shipped_in: null | { version: null | string; title: string; url: string }
}

/** What the board widget sends to the browser: never more than the feed has, and no summary. */
export type EmbedFeedbackRow = Pick<FeedbackFeedItem, 'id' | 'shipped_in' | 'stage' | 'title' | 'type' | 'url' | 'votes'>

type RowIssue = Pick<Issue, 'fixedInPatchNote' | 'id' | 'slug' | 'status' | 'title' | 'type' | 'upvoteCount'>

/**
 * An item as the board widget shows it. Built key by key: a `Pick` type
 * alone would let extra fields through to the browser.
 */
export const feedbackRow = (issue: RowIssue, paths: PortalPaths): EmbedFeedbackRow => {
  const stage = publicStage(issue.status)
  // Public queries exclude archived items, so this is a broken query, not data.
  if (!stage) throw new Error(`Issue ${issue.id} has no public stage (status ${issue.status})`)
  const note = shippedUpdate(issue)
  return {
    id: String(issue.id),
    url: absoluteURL(paths.feedbackItem(issue.slug)),
    title: issue.title,
    type: feedbackTypeParam(issue.type),
    stage: stage.id,
    votes: issue.upvoteCount ?? 0,
    shipped_in: note
      ? { version: note.versionLabel || null, title: note.title, url: absoluteURL(paths.update(note.slug)) }
      : null,
  }
}

/** An item of `feedback.json`: the board's row, plus the summary and the date. */
export const feedbackFeedItem = (
  issue: RowIssue & Pick<Issue, 'createdAt' | 'summary'>,
  paths: PortalPaths,
): FeedbackFeedItem => ({
  ...feedbackRow(issue, paths),
  summary: issue.summary || null,
  date_created: new Date(issue.createdAt).toISOString(),
})

/** `feedback.json`, contract v1. */
export const feedbackFeed = (
  project: Pick<GameProject, 'name' | 'slug'>,
  issues: (RowIssue & Pick<Issue, 'createdAt' | 'summary'>)[],
) => {
  const paths = portalPaths(project.slug)
  return {
    version: 1,
    title: `${project.name} feedback`,
    home_page_url: absoluteURL(paths.feedback),
    feed_url: absoluteURL(paths.feedbackJSON),
    items: issues.map((issue) => feedbackFeedItem(issue, paths)),
  }
}

/** `updates.json`, JSON Feed 1.1: the RSS feed's updates, with the same titles. */
export const updatesFeed = (project: Pick<GameProject, 'name' | 'slug'>, notes: PatchNote[]) => {
  const paths = portalPaths(project.slug)
  return {
    version: 'https://jsonfeed.org/version/1.1',
    title: `${project.name} — Updates`,
    home_page_url: absoluteURL(paths.updates),
    feed_url: absoluteURL(paths.updatesJSON),
    description: `The latest updates for ${project.name}.`,
    language: 'en',
    items: notes.map((note) => ({
      // The database ID, so it survives a slug change.
      id: String(note.id),
      url: absoluteURL(paths.update(note.slug)),
      title: updateFeedTitle(note),
      // Left out when empty, as JSON Feed's optional fields are.
      ...(note.summary ? { summary: note.summary } : {}),
      content_text: note.summary || note.title,
      ...(note.publishedAt ? { date_published: new Date(note.publishedAt).toISOString() } : {}),
    })),
  }
}

export const JSON_TYPE = 'application/json; charset=utf-8'
export const JSON_FEED_TYPE = 'application/feed+json; charset=utf-8'

/** A feed's 404: an unknown, held or suspended game, which it doesn't tell apart. */
export const FEED_NOT_FOUND = { error: 'Not found.' }

/**
 * Every feed answer, 404s included: readable from any site, never with
 * credentials, and cached at most 5 minutes in front (EMBED_CACHE_CONTROL).
 */
export const feedResponse = (body: unknown, { contentType = JSON_TYPE, status = 200 } = {}): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': EMBED_CACHE_CONTROL,
      'Content-Type': contentType,
    },
  })
