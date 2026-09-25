import Link from 'next/link'
import React from 'react'

import type { Issue } from '@/payload-types'

import { issueStatusLabel } from '@/components/game/IssueStatusBadge'

import type { KnownIssuesSlot } from '../../schema/slots'
import type { SiteRenderContext } from '../context'
import { SectionHeader } from '../ui'

const HEADINGS: Record<KnownIssuesSlot['variant'], string> = {
  compact: 'Known Issues',
  pinned: 'Status Board Highlights',
  recentlyFixed: 'Recently Fixed',
}

const statusTone = (status: Issue['status']): string => {
  if (status === 'FIXED') return 'fs-chip fs-chip-success'
  if (status === 'NEEDS_MORE_INFO' || status === 'WORKAROUND_AVAILABLE') {
    return 'fs-chip fs-chip-warning'
  }
  return 'fs-chip'
}

/**
 * Live binding to the public issue board. Issues arrive pre-sorted by
 * explicit criteria (pinned/votes/dates — never the admin kanban
 * `_order`); see queryLandingIssues.
 */
export const KnownIssuesSection: React.FC<{
  ctx: SiteRenderContext
  value: KnownIssuesSlot
}> = ({ ctx, value }) => {
  if (!value.enabled) return null
  if (ctx.knownIssues.length === 0) return null
  const base = `/g/${ctx.project.slug}`

  return (
    <section aria-labelledby="fs-known-issues-heading" className="fs-section">
      <div className="fs-shell">
        <SectionHeader
          eyebrow="Transparency"
          heading={value.heading ?? HEADINGS[value.variant]}
          id="fs-known-issues-heading"
        />
        <ul className="grid gap-3">
          {ctx.knownIssues.map((issue) => (
            <li key={issue.id}>
              <Link
                className="fs-panel fs-panel-link flex flex-wrap items-center justify-between gap-3 px-5 py-4"
                href={`${base}/issues/${issue.slug}`}
              >
                <span className="min-w-0 flex-1 font-semibold">{issue.title}</span>
                <span className="flex items-center gap-3">
                  {typeof issue.upvoteCount === 'number' && issue.upvoteCount > 0 ? (
                    <span className="text-sm text-[var(--fs-muted-fg)]">
                      ▲ {issue.upvoteCount}
                    </span>
                  ) : null}
                  <span className={statusTone(issue.status)}>{issueStatusLabel(issue.status)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <Link className="fs-link text-sm font-semibold" href={`${base}/issues`}>
            Full issue board →
          </Link>
        </div>
      </div>
    </section>
  )
}
