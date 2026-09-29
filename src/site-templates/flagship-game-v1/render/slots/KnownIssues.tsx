import Link from 'next/link'
import React from 'react'

import { issueStatusLabel, issueStatusShape, StatusMark } from '@/components/game/IssueStatus'
import { VoteCount } from '@/components/game/VoteCount'

import type { KnownIssuesSlot } from '../../schema/slots'
import type { SiteRenderContext } from '../context'
import { SectionHeader } from '../ui'

const HEADINGS: Record<KnownIssuesSlot['variant'], string> = {
  compact: 'Known issues',
  pinned: 'Pinned issues',
  recentlyFixed: 'Recently fixed',
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
          heading={value.heading ?? HEADINGS[value.variant]}
          id="fs-known-issues-heading"
        />
        <ul className="fs-rows fs-column-wide">
          {ctx.knownIssues.map((issue) => (
            <li key={issue.id}>
              {/* The row's text starts with the title: the status marker is an empty CSS shape. */}
              <Link className="fs-issue-row" href={`${base}/issues/${issue.slug}`}>
                <StatusMark shape={issueStatusShape(issue.status)} />
                <span className="fs-issue-row-title">{issue.title}</span>
                <span className="fs-issue-row-meta">
                  {typeof issue.upvoteCount === 'number' && issue.upvoteCount > 0 ? (
                    <VoteCount count={issue.upvoteCount} variant="inline" />
                  ) : null}
                  <span>{issueStatusLabel(issue.status)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-6">
          <Link className="fs-link font-semibold" href={`${base}/issues`}>
            See all known issues
          </Link>
        </p>
      </div>
    </section>
  )
}
