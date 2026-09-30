import Link from 'next/link'
import React from 'react'

import type { GameProject } from '@/payload-types'

import { portalPaths } from '@/lib/game-portal/paths'
import { queryPublishedPatchNotes } from '@/lib/game-portal/patchNotes'

import { HubSection } from './HubSection'
import { UpdateEntry } from './UpdateEntry'

const LATEST_UPDATES_LIMIT = 3

/** The hub's three newest published updates, then the full feed and its RSS. */
export const LatestUpdates: React.FC<{ project: Pick<GameProject, 'id' | 'name' | 'slug'> }> = async ({
  project,
}) => {
  const paths = portalPaths(project.slug)
  const notes = await queryPublishedPatchNotes({
    limit: LATEST_UPDATES_LIMIT,
    page: 1,
    projectID: project.id,
  })

  return (
    <HubSection heading="Latest updates" id="fs-latest-updates-heading">
      {notes.docs.length === 0 ? (
        <p className="fs-empty">
          No updates yet. Follow the{' '}
          <a className="fs-link" href={paths.rss}>
            RSS feed
          </a>{' '}
          to hear about the first one from {project.name}.
        </p>
      ) : (
        <>
          <ul className="fs-rows fs-feed">
            {notes.docs.map((note) => (
              <li key={note.id}>
                <UpdateEntry href={paths.update(note.slug)} note={note} titleAs="h3" />
              </li>
            ))}
          </ul>
          <p className="fs-hub-links">
            <Link className="fs-link font-semibold" href={paths.updates}>
              All updates
            </Link>
            <a className="fs-link font-semibold" href={paths.rss}>
              RSS
            </a>
          </p>
        </>
      )}
    </HubSection>
  )
}
