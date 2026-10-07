import type { PaginatedDocs } from 'payload'

import Link from 'next/link'
import React from 'react'

import type { GameProject, PatchNote } from '@/payload-types'

import { portalPaths } from '@/lib/game-portal/paths'

import { PageHead } from './PageHead'
import { UpdateEntry } from './UpdateEntry'

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
            <a className="fs-link fs-tap" href={rss}>
              RSS
            </a>
          }
          purpose={`Every update to ${project.name}, newest first.`}
          title="Updates"
        />

        {notes.docs.length === 0 ? (
          <p className="fs-empty">
            {project.name} hasn’t published any updates yet. Follow the{' '}
            <a className="fs-link" href={rss}>
              RSS feed
            </a>{' '}
            to hear about the first one.
          </p>
        ) : (
          <ul className="fs-rows fs-feed">
            {notes.docs.map((note) => (
              <li key={note.id}>
                <UpdateEntry href={paths.update(note.slug)} note={note} titleAs="h2" />
              </li>
            ))}
          </ul>
        )}

        {notes.totalPages > 1 && (
          <nav aria-label="Pagination" className="fs-pagination">
            {notes.hasPrevPage ? (
              <Link
                className="fs-link fs-tap"
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
                className="fs-link fs-tap"
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
