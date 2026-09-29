import type { Metadata } from 'next'
import type { SearchParams } from 'nuqs/server'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createLoader, parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server'
import React from 'react'

import type { Issue } from '@/payload-types'

import { IssueFilters } from '@/components/game/IssueFilters'
import {
  IssueMeta,
  issueStatusLabel,
  issueStatusShape,
  PinnedTag,
  StatusMark,
} from '@/components/game/IssueStatus'
import { PageHead } from '@/components/game/PageHead'
import { VoteCount } from '@/components/game/VoteCount'
import { ISSUE_STATUS_OPTIONS } from '@/collections/options'
import { getGameProject } from '@/lib/game-portal/getGameProject'
import { type IssueSortKey, queryBoardIssues, queryPublicIssues } from '@/lib/game-portal/issues'

// Search/filter/sort via URL state — always server-rendered fresh.
export const dynamic = 'force-dynamic'

const loadSearchParams = createLoader({
  category: parseAsString.withDefault(''),
  page: parseAsInteger.withDefault(1),
  q: parseAsString.withDefault(''),
  sort: parseAsStringLiteral(['top', 'latest'] as const).withDefault('top'),
  view: parseAsStringLiteral(['list', 'board'] as const).withDefault('list'),
})

type Args = {
  params: Promise<{ gameSlug: string }>
  searchParams: Promise<SearchParams>
}

type ListFilters = { category: string; q: string; sort: IssueSortKey }

const purpose = (game: string) =>
  `Bugs the ${game} team knows about. Vote on the ones that affect you.`

/** A list page's URL that keeps the current filters. */
const listPageHref = (base: string, { category, q, sort }: ListFilters, page: number): string => {
  const query = new URLSearchParams()
  if (category) query.set('category', category)
  if (q) query.set('q', q)
  if (sort !== 'top') query.set('sort', sort)
  if (page > 1) query.set('page', String(page))
  const search = query.toString()
  return search ? `${base}?${search}` : base
}

const NoIssues: React.FC<{ reportHref: string }> = ({ reportHref }) => (
  <p className="fs-empty">
    No known issues right now. Found a bug?{' '}
    <Link className="fs-link" href={reportHref}>
      Report it
    </Link>
    .
  </p>
)

const IssueRow: React.FC<{ base: string; issue: Issue }> = ({ base, issue }) => (
  <li className="fs-issue-item">
    <VoteCount count={issue.upvoteCount ?? 0} variant="tally" />
    <div className="min-w-0">
      <h2 className="fs-h3">
        <Link className="fs-link" href={`${base}/${issue.slug}`}>
          {issue.title}
        </Link>
      </h2>
      <IssueMeta issue={issue} />
      {issue.summary ? (
        <p className="fs-body mt-2 line-clamp-2 text-[var(--fs-muted-fg)]">{issue.summary}</p>
      ) : null}
    </div>
  </li>
)

/** Read-only: one region per status, named by the status label alone. */
const IssueBoard: React.FC<{ base: string; issues: Issue[] }> = ({ base, issues }) => (
  <div className="fs-board">
    {ISSUE_STATUS_OPTIONS.map((status) => {
      const column = issues.filter((issue) => issue.status === status.value)
      const labelId = `fs-board-${status.value}`
      return (
        <section aria-labelledby={labelId} className="fs-board-column" key={status.value}>
          <h2 className="fs-board-head">
            <StatusMark shape={issueStatusShape(status.value)} />
            <span id={labelId}>{issueStatusLabel(status.value)}</span>
            <span className="fs-count">{column.length}</span>
          </h2>
          {column.length === 0 ? (
            <p className="fs-meta">None</p>
          ) : (
            <ul className="fs-board-cards">
              {column.map((issue) => (
                <li className="fs-board-card" key={issue.id}>
                  <Link className="fs-link font-semibold" href={`${base}/${issue.slug}`}>
                    {issue.title}
                  </Link>
                  <div className="fs-board-card-meta">
                    <VoteCount count={issue.upvoteCount ?? 0} variant="inline" />
                    {issue.isPinned ? <PinnedTag /> : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )
    })}
  </div>
)

export default async function IssuesPage({ params, searchParams }: Args) {
  const { gameSlug } = await params
  const { category, page, q, sort, view } = await loadSearchParams(searchParams)

  const project = await getGameProject(gameSlug)
  if (!project) notFound()

  const base = `/g/${gameSlug}/issues`
  const reportHref = `/g/${gameSlug}/report`
  const boardIssues = view === 'board' ? await queryBoardIssues(project.id) : null

  return (
    <div className="fs-shell fs-ops">
      <div className="fs-column-wide">
        <PageHead
          action={
            <Link className="fs-btn fs-btn-primary" href={reportHref}>
              Report a bug
            </Link>
          }
          purpose={purpose(project.name)}
          title="Known issues"
        />
        <IssueFilters />
      </div>

      {boardIssues ? (
        boardIssues.length === 0 ? (
          <NoIssues reportHref={reportHref} />
        ) : (
          <IssueBoard base={base} issues={boardIssues} />
        )
      ) : (
        <div className="fs-column-wide">
          <IssueList
            base={base}
            filters={{ category, q, sort }}
            page={page}
            projectID={project.id}
            reportHref={reportHref}
          />
        </div>
      )}
    </div>
  )
}

const IssueList = async ({
  base,
  filters,
  page,
  projectID,
  reportHref,
}: {
  base: string
  filters: ListFilters
  page: number
  projectID: number | string
  reportHref: string
}) => {
  const issues = await queryPublicIssues({
    category: filters.category || null,
    page: Math.max(1, page),
    projectID,
    search: filters.q || null,
    sort: filters.sort,
  })

  if (issues.docs.length === 0) {
    const filtered = Boolean(filters.category || filters.q)
    if (!filtered && issues.totalDocs === 0) return <NoIssues reportHref={reportHref} />
    return (
      <p className="fs-empty">
        No issues match these filters.{' '}
        <Link className="fs-link" href={base}>
          Clear filters
        </Link>
      </p>
    )
  }

  return (
    <>
      <ul className="fs-rows fs-issue-list">
        {issues.docs.map((issue) => (
          <IssueRow base={base} issue={issue} key={issue.id} />
        ))}
      </ul>
      {issues.totalPages > 1 && (
        <nav aria-label="Pagination" className="fs-pagination">
          {issues.hasPrevPage ? (
            <Link
              className="fs-link fs-tap font-semibold"
              href={listPageHref(base, filters, (issues.page ?? 2) - 1)}
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
              href={listPageHref(base, filters, (issues.page ?? 1) + 1)}
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
    title: `${project.name} known issues`,
  }
}
