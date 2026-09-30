import type { Metadata } from 'next'
import type { SearchParams } from 'nuqs/server'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createLoader } from 'nuqs/server'
import React from 'react'

import type { Issue } from '@/payload-types'

import { FeedbackBoard } from '@/components/game/FeedbackBoard'
import { FeedbackFilters } from '@/components/game/FeedbackFilters'
import { FeedbackMeta } from '@/components/game/FeedbackStatus'
import { PageHead } from '@/components/game/PageHead'
import { VoteCount } from '@/components/game/VoteCount'
import {
  feedbackHref,
  feedbackSearchParams,
  feedbackTypeOf,
} from '@/lib/game-portal/feedbackSearchParams'
import { getGameProject } from '@/lib/game-portal/getGameProject'
import { queryPublicIssues } from '@/lib/game-portal/issues'
import { type PortalPaths, portalPaths } from '@/lib/game-portal/paths'

// Search/filter/sort via URL state — always server-rendered fresh.
export const dynamic = 'force-dynamic'

const loadSearchParams = createLoader(feedbackSearchParams)

type Args = {
  params: Promise<{ gameSlug: string }>
  searchParams: Promise<SearchParams>
}

type ListFilters = Omit<Awaited<ReturnType<typeof loadSearchParams>>, 'page' | 'view'>

const purpose = (game: string) =>
  `Bugs and ideas from ${game} players. Vote on the ones you care about.`

const NoFeedback: React.FC<{ reportHref: string }> = ({ reportHref }) => (
  <p className="fs-empty">
    No feedback yet. Found a bug or have an idea?{' '}
    <Link className="fs-link" href={reportHref}>
      Send it
    </Link>
    .
  </p>
)

const NoMatch: React.FC<{ clearHref: string }> = ({ clearHref }) => (
  <p className="fs-empty">
    No feedback matches these filters.{' '}
    <Link className="fs-link" href={clearHref}>
      Clear filters
    </Link>
  </p>
)

const IssueRow: React.FC<{ issue: Issue; paths: PortalPaths }> = ({ issue, paths }) => (
  <li className="fs-issue-item">
    <VoteCount count={issue.upvoteCount ?? 0} variant="tally" />
    <div className="min-w-0">
      <h2 className="fs-h3">
        <Link className="fs-link" href={paths.feedbackItem(issue.slug)}>
          {issue.title}
        </Link>
      </h2>
      <FeedbackMeta issue={issue} />
      {issue.summary ? (
        <p className="fs-body mt-2 line-clamp-2 text-[var(--fs-muted-fg)]">{issue.summary}</p>
      ) : null}
    </div>
  </li>
)

export default async function FeedbackPage({ params, searchParams }: Args) {
  const { gameSlug } = await params
  const { page, view, ...filters } = await loadSearchParams(searchParams)

  const project = await getGameProject(gameSlug)
  if (!project) notFound()

  const paths = portalPaths(gameSlug)
  const reportHref = paths.newFeedback()
  const acceptIdeas = project.reportForm?.acceptIdeas !== false

  return (
    <div className="fs-shell fs-ops">
      <div className="fs-column-wide">
        <PageHead
          action={
            <>
              <Link className="fs-btn fs-btn-primary" href={paths.newFeedback('bug')}>
                Report a bug
              </Link>
              {acceptIdeas ? (
                <Link className="fs-btn fs-btn-secondary" href={paths.newFeedback('idea')}>
                  Suggest an idea
                </Link>
              ) : null}
            </>
          }
          purpose={purpose(project.name)}
          title="Feedback"
        />
        <FeedbackFilters />
      </div>

      {view === 'board' ? (
        <FeedbackBoard
          empty={
            filters.type ? (
              <NoMatch clearHref={feedbackHref(paths.feedback, { view })} />
            ) : (
              <NoFeedback reportHref={reportHref} />
            )
          }
          paths={paths}
          projectID={project.id}
          type={filters.type}
        />
      ) : (
        <div className="fs-column-wide">
          <IssueList
            filters={filters}
            page={page}
            paths={paths}
            projectID={project.id}
            reportHref={reportHref}
          />
        </div>
      )}
    </div>
  )
}

const IssueList = async ({
  filters,
  page,
  paths,
  projectID,
  reportHref,
}: {
  filters: ListFilters
  page: number
  paths: PortalPaths
  projectID: number | string
  reportHref: string
}) => {
  const issues = await queryPublicIssues({
    category: filters.category,
    page: Math.max(1, page),
    projectID,
    search: filters.q || null,
    sort: filters.sort,
    stage: filters.stage,
    type: filters.type ? feedbackTypeOf(filters.type) : null,
  })

  if (issues.docs.length === 0) {
    const filtered = Boolean(filters.category || filters.q || filters.stage || filters.type)
    if (!filtered && issues.totalDocs === 0) return <NoFeedback reportHref={reportHref} />
    return <NoMatch clearHref={paths.feedback} />
  }

  const pageHref = (target: number) => feedbackHref(paths.feedback, { ...filters, page: target })

  return (
    <>
      <ul className="fs-rows fs-issue-list">
        {issues.docs.map((issue) => (
          <IssueRow issue={issue} key={issue.id} paths={paths} />
        ))}
      </ul>
      {issues.totalPages > 1 && (
        <nav aria-label="Pagination" className="fs-pagination">
          {issues.hasPrevPage ? (
            <Link
              className="fs-link fs-tap font-semibold"
              href={pageHref((issues.page ?? 2) - 1)}
            >
              Previous page
            </Link>
          ) : (
            <span />
          )}
          <span className="fs-meta">
            Page {issues.page} of {issues.totalPages}
          </span>
          {issues.hasNextPage ? (
            <Link
              className="fs-link fs-tap font-semibold"
              href={pageHref((issues.page ?? 1) + 1)}
            >
              Next page
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { gameSlug } = await params
  const project = await getGameProject(gameSlug)
  if (!project) return {}

  return {
    description: purpose(project.name),
    title: `${project.name} feedback`,
  }
}
