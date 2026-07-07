import type { Metadata } from 'next'
import type { SearchParams } from 'nuqs/server'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createLoader, parseAsInteger, parseAsString, parseAsStringLiteral } from 'nuqs/server'
import React from 'react'

import type { Issue } from '@/payload-types'

import { IssueFilters } from '@/components/game/IssueFilters'
import { IssueStatusBadge, issueStatusLabel } from '@/components/game/IssueStatusBadge'
import { ISSUE_STATUS_OPTIONS } from '@/collections/options'
import { getGameProject } from '@/lib/game-portal/getGameProject'
import {
  type IssueSortKey,
  queryBoardIssues,
  queryPublicIssues,
} from '@/lib/game-portal/issues'

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

const IssueRow: React.FC<{ base: string; issue: Issue }> = ({ base, issue }) => (
  <li className="rounded-lg border p-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {issue.isPinned && <span title="Pinned">📌</span>}
          <Link className="font-semibold hover:underline" href={`${base}/${issue.slug}`}>
            {issue.title}
          </Link>
          <IssueStatusBadge status={issue.status} />
        </div>
        {issue.summary && <p className="mt-1 line-clamp-2 text-sm opacity-80">{issue.summary}</p>}
      </div>
      <div className="shrink-0 rounded-md border px-2.5 py-1 text-center text-sm">
        <span aria-hidden>▲</span> {issue.upvoteCount ?? 0}
      </div>
    </div>
  </li>
)

const IssueBoard: React.FC<{ base: string; issues: Issue[] }> = ({ base, issues }) => (
  <div className="-mx-6 overflow-x-auto px-6">
    <div className="flex min-w-max gap-4">
      {ISSUE_STATUS_OPTIONS.map((status) => {
        const column = issues.filter((issue) => issue.status === status.value)
        return (
          <div className="w-64 shrink-0" key={status.value}>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              {status.label}
              <span className="rounded-full border px-1.5 text-xs opacity-70">
                {column.length}
              </span>
            </div>
            <ul className="space-y-2">
              {column.map((issue) => (
                <li className="rounded-md border p-3 text-sm" key={issue.id}>
                  <Link className="font-medium hover:underline" href={`${base}/${issue.slug}`}>
                    {issue.isPinned ? '📌 ' : ''}
                    {issue.title}
                  </Link>
                  <div className="mt-1 text-xs opacity-70">▲ {issue.upvoteCount ?? 0}</div>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  </div>
)

export default async function IssuesPage({ params, searchParams }: Args) {
  const { gameSlug } = await params
  const { category, page, q, sort, view } = await loadSearchParams(searchParams)

  const project = await getGameProject(gameSlug)
  if (!project) notFound()

  const base = `/g/${gameSlug}/issues`

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">Known Issues</h1>
      </div>
      <div className="mb-8">
        <IssueFilters />
      </div>

      {view === 'board' ? (
        <IssueBoard base={base} issues={await queryBoardIssues(project.id)} />
      ) : (
        <IssueList
          base={base}
          category={category}
          page={page}
          projectID={project.id}
          q={q}
          sort={sort}
        />
      )}
    </div>
  )
}

const IssueList = async ({
  base,
  category,
  page,
  projectID,
  q,
  sort,
}: {
  base: string
  category: string
  page: number
  projectID: number | string
  q: string
  sort: IssueSortKey
}) => {
  const issues = await queryPublicIssues({
    category: category || null,
    page: Math.max(1, page),
    projectID,
    search: q || null,
    sort,
  })

  if (issues.docs.length === 0) {
    return <p className="opacity-70">No issues match. Try clearing the filters.</p>
  }

  return (
    <>
      <ul className="space-y-3">
        {issues.docs.map((issue) => (
          <IssueRow base={base} issue={issue} key={issue.id} />
        ))}
      </ul>
      {issues.totalPages > 1 && (
        <nav aria-label="Pagination" className="mt-8 flex items-center justify-between text-sm">
          {issues.hasPrevPage ? (
            <Link className="underline" href={`${base}?page=${(issues.page ?? 2) - 1}`}>
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="opacity-70">
            Page {issues.page} of {issues.totalPages}
          </span>
          {issues.hasNextPage ? (
            <Link className="underline" href={`${base}?page=${(issues.page ?? 1) + 1}`}>
              Next →
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
    description: `Known issues, statuses (${ISSUE_STATUS_OPTIONS.map((s) => issueStatusLabel(s.value)).slice(0, 3).join(', ')}, …) and player-voted priorities for ${project.name}.`,
    title: `Known Issues — ${project.name}`,
  }
}
