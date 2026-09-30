import Link from 'next/link'
import React from 'react'

import { formatDate } from '@/components/game/format'
import { portalPaths } from '@/lib/game-portal/paths'

import type { LatestUpdateSlot } from '../../schema/slots'
import type { SiteRenderContext } from '../context'
import { SectionHeader } from '../ui'

/**
 * Live binding to the most recent published patch note — queried at
 * render, never copied into configuration.
 */
export const LatestUpdateSection: React.FC<{
  ctx: SiteRenderContext
  value: LatestUpdateSlot
}> = ({ ctx, value }) => {
  if (!value.enabled) return null
  const note = ctx.latestPatchNote
  if (!note) return null
  const paths = portalPaths(ctx.project.slug)
  const published = formatDate(note.publishedAt)

  return (
    <section aria-labelledby="fs-latest-update-heading" className="fs-section">
      <div className="fs-shell">
        <SectionHeader heading={value.heading ?? 'Latest update'} id="fs-latest-update-heading" />
        <article className="fs-entry fs-column-wide">
          <div className="fs-entry-aside">
            {note.versionLabel ? <span className="fs-version">{note.versionLabel}</span> : null}
            {published ? (
              <time className="fs-meta" dateTime={note.publishedAt ?? undefined}>
                {published}
              </time>
            ) : null}
          </div>
          <div className="fs-entry-main">
            <h3 className="fs-h3">
              <Link className="fs-link" href={paths.update(note.slug)}>
                {note.title}
              </Link>
            </h3>
            {note.summary ? <p className="fs-body mt-2 text-[var(--fs-muted-fg)]">{note.summary}</p> : null}
            <p className="mt-5">
              <Link className="fs-link font-semibold" href={paths.updates}>
                All patch notes
              </Link>
            </p>
          </div>
        </article>
      </div>
    </section>
  )
}
