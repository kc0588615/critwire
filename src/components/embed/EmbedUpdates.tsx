import React from 'react'

import type { GameProject, PatchNote } from '@/payload-types'

import { FeedbackTypeTag } from '@/components/game/FeedbackStatus'
import { formatDate } from '@/components/game/format'
import { VoteCount } from '@/components/game/VoteCount'
import { embedHref } from '@/lib/embed/links'
import { queryShippedFeedback, type ShippedFeedbackItem } from '@/lib/game-portal/issues'
import { portalPaths } from '@/lib/game-portal/paths'
import { LATEST_UPDATES_LIMIT, queryPublishedPatchNotes } from '@/lib/game-portal/patchNotes'
import { absoluteURL } from '@/utilities/getURL'

import { EmbedLink } from './EmbedLink'

/** How many shipped items an update lists before "More in this update". */
const EMBED_SHIPPED_LIMIT = 5

/**
 * The updates widget: the hub's newest updates, each with a bounded "From
 * your feedback", so the widget doesn't grow with a game's history.
 */
export const EmbedUpdates: React.FC<{ project: Pick<GameProject, 'id' | 'slug'> }> = async ({ project }) => {
  const paths = portalPaths(project.slug)
  const notes = await queryPublishedPatchNotes({
    limit: LATEST_UPDATES_LIMIT,
    page: 1,
    projectID: project.id,
  })
  const shipped = await Promise.all(
    notes.docs.map((note) =>
      // One more than shown, to know whether there are more.
      queryShippedFeedback({ limit: EMBED_SHIPPED_LIMIT + 1, noteID: note.id, projectID: project.id }),
    ),
  )

  return (
    <section aria-labelledby="cw-embed-heading">
      <h1 className="cw-embed-title" id="cw-embed-heading">
        Updates
      </h1>
      {notes.docs.length === 0 ? (
        <p className="fs-body">No updates yet.</p>
      ) : (
        <ul className="fs-rows fs-feed">
          {notes.docs.map((note, index) => (
            <li key={note.id}>
              <EmbedUpdate href={embedHref(paths.update(note.slug))} items={shipped[index]} note={note} paths={paths} />
            </li>
          ))}
        </ul>
      )}
      <p className="fs-hub-links">
        <EmbedLink className="fs-link font-semibold" href={embedHref(paths.updates)}>
          All updates
        </EmbedLink>
        {/* Untagged, as in the share kit: a tag would only count the subscription. */}
        <EmbedLink className="fs-link font-semibold" href={absoluteURL(paths.rss)}>
          RSS
        </EmbedLink>
      </p>
    </section>
  )
}

const EmbedUpdate: React.FC<{
  href: string
  items: ShippedFeedbackItem[]
  note: PatchNote
  paths: ReturnType<typeof portalPaths>
}> = ({ href, items, note, paths }) => {
  const published = formatDate(note.publishedAt)
  return (
    <article className="fs-entry">
      {note.versionLabel ? <span className="fs-version">{note.versionLabel}</span> : null}
      <div className="fs-entry-main">
        {published ? (
          <time className="fs-meta block" dateTime={note.publishedAt ?? undefined}>
            {published}
          </time>
        ) : null}
        <h2 className="fs-h3 mt-1">
          <EmbedLink className="fs-link" href={href}>
            {note.title}
          </EmbedLink>
        </h2>
        {note.summary ? <p className="fs-body mt-2 text-[var(--fs-muted-fg)]">{note.summary}</p> : null}
        {items.length > 0 ? (
          <div className="cw-embed-shipped">
            <h3 className="fs-meta">From your feedback</h3>
            <ul className="fs-rows">
              {items.slice(0, EMBED_SHIPPED_LIMIT).map((item) => (
                <li key={item.id}>
                  <EmbedLink className="fs-issue-row" href={embedHref(paths.feedbackItem(item.slug))}>
                    <span className="fs-issue-row-title">{item.title}</span>
                    <span className="fs-issue-row-meta">
                      <FeedbackTypeTag type={item.type} />
                      <VoteCount count={item.upvoteCount ?? 0} variant="inline" />
                    </span>
                  </EmbedLink>
                </li>
              ))}
            </ul>
            {items.length > EMBED_SHIPPED_LIMIT ? (
              <EmbedLink className="fs-link fs-meta" href={href}>
                More in this update
              </EmbedLink>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  )
}
