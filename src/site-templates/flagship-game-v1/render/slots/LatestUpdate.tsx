import Link from 'next/link'
import React from 'react'

import type { LatestUpdateSlot } from '../../schema/slots'
import type { SiteRenderContext } from '../context'
import { formatSiteDate, SectionHeader } from '../ui'

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
  const base = `/g/${ctx.project.slug}`
  const published = formatSiteDate(note.publishedAt)

  return (
    <section aria-labelledby="fs-latest-update-heading" className="fs-section">
      <div className="fs-shell">
        <SectionHeader
          eyebrow="Latest Update"
          heading={value.heading ?? 'Fresh from the dev team'}
          id="fs-latest-update-heading"
        />
        <div className="fs-panel p-7 sm:p-9">
          <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--fs-muted-fg)]">
            {note.versionLabel ? <span className="fs-chip">{note.versionLabel}</span> : null}
            {published ? <time dateTime={note.publishedAt ?? undefined}>{published}</time> : null}
          </div>
          <h3 className="fs-h3 mt-4 text-2xl">
            <Link className="fs-link" href={`${base}/patch-notes/${note.slug}`}>
              {note.title}
            </Link>
          </h3>
          {note.summary ? (
            <p className="mt-3 max-w-2xl leading-7 text-[var(--fs-muted-fg)]">{note.summary}</p>
          ) : null}
          <div className="mt-6">
            <Link className="fs-link text-sm font-semibold" href={`${base}/patch-notes`}>
              All patch notes →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
