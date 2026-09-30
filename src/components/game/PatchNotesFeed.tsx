import type { PaginatedDocs } from 'payload'

import Link from 'next/link'
import React from 'react'

import type { GameProject, PatchNote } from '@/payload-types'

import { portalPaths } from '@/lib/game-portal/paths'

import { formatDate } from './format'
import { PageHead } from './PageHead'

export const PatchNotesFeed: React.FC<{
  notes: PaginatedDocs<PatchNote>
  project: Pick<GameProject, 'name' | 'slug'>
}> = ({ notes, project }) => {
  const paths = portalPaths(project.slug)
  const { rss } = paths

  return (
    <div className="fs-shell fs-ops">
      <div className="fs-column-wide">
        <PageHead
          action={
            <a className="fs-link fs-tap font-semibold" href={rss}>
              RSS
            </a>
          }
          purpose={`Every update to ${project.name}, newest first.`}
          title="Patch notes"
        />

        {notes.docs.length === 0 ? (
          <p className="fs-empty">
            {project.name} hasn’t published any patch notes yet. Follow the{' '}
            <a className="fs-link" href={rss}>
              RSS feed
            </a>{' '}
            to hear about the first one.
          </p>
        ) : (
          <ul className="fs-rows fs-feed">
            {notes.docs.map((note) => {
              const published = formatDate(note.publishedAt)
              return (
                <li key={note.id}>
                  <article className="fs-entry">
                    {note.versionLabel ? (
                      <span className="fs-version">{note.versionLabel}</span>
                    ) : null}
                    <div className="fs-entry-main">
                      {published ? (
                        <time className="fs-meta block" dateTime={note.publishedAt ?? undefined}>
                          {published}
                        </time>
                      ) : null}
                      <h2 className="fs-h3 mt-1">
                        <Link className="fs-link" href={paths.update(note.slug)}>
                          {note.title}
                        </Link>
                      </h2>
                      {note.summary ? (
                        <p className="fs-body mt-2 text-[var(--fs-muted-fg)]">{note.summary}</p>
                      ) : null}
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        )}

        {notes.totalPages > 1 && (
          <nav aria-label="Pagination" className="fs-pagination">
            {notes.hasPrevPage ? (
              <Link
                className="fs-link fs-tap font-semibold"
                href={paths.updatesPage((notes.page ?? 2) - 1)}
              >
                Newer updates
              </Link>
            ) : (
              <span />
            )}
            <span className="fs-meta">
              Page {notes.page} of {notes.totalPages}
            </span>
            {notes.hasNextPage ? (
              <Link
                className="fs-link fs-tap font-semibold"
                href={paths.updatesPage((notes.page ?? 1) + 1)}
              >
                Older updates
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </div>
  )
}
