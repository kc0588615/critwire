import Link from 'next/link'
import React from 'react'

import type { PatchNote } from '@/payload-types'

import { formatDate } from './format'

/**
 * One update in a feed: its version, date, linked title and summary.
 * `titleAs` keeps the page's heading order: h2 under the updates page's
 * h1, h3 under a hub section's h2.
 */
export const UpdateEntry: React.FC<{
  href: string
  note: Pick<PatchNote, 'publishedAt' | 'summary' | 'title' | 'versionLabel'>
  titleAs: 'h2' | 'h3'
}> = ({ href, note, titleAs: Title }) => {
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
        <Title className="fs-h3 mt-xxs">
          <Link className="fs-link" href={href}>
            {note.title}
          </Link>
        </Title>
        {note.summary ? (
          <p className="fs-body fs-muted mt-s">{note.summary}</p>
        ) : null}
      </div>
    </article>
  )
}
