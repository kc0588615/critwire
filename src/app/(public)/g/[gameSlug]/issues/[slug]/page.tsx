import type { Metadata } from 'next'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import RichText from '@/components/RichText'
import { IssueStatusBadge } from '@/components/game/IssueStatusBadge'
import { VoteButton } from '@/components/game/VoteButton'
import { ISSUE_CATEGORY_OPTIONS } from '@/collections/options'
import { getGameProject } from '@/lib/game-portal/getGameProject'
import { getHasVoted, getPublicIssue } from '@/lib/game-portal/issues'

// Reads the vote cookie and shows live counts — always dynamic.
export const dynamic = 'force-dynamic'

type Args = { params: Promise<{ gameSlug: string; slug: string }> }

export default async function IssueDetailPage({ params }: Args) {
  const { gameSlug, slug } = await params
  const project = await getGameProject(gameSlug)
  if (!project) notFound()

  const issue = await getPublicIssue({ projectID: project.id, slug })
  if (!issue) notFound()

  const hasVoted = await getHasVoted(issue.id)
  const categoryLabel = ISSUE_CATEGORY_OPTIONS.find((o) => o.value === issue.category)?.label
  const fixedIn =
    issue.fixedInPatchNote && typeof issue.fixedInPatchNote === 'object'
      ? issue.fixedInPatchNote
      : null

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <Link className="text-sm opacity-70 hover:opacity-100" href={`/g/${gameSlug}/issues`}>
        ← All issues
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-2 text-sm">
        {issue.isPinned && <span title="Pinned">📌</span>}
        <IssueStatusBadge status={issue.status} />
        {categoryLabel && (
          <span className="rounded-full border px-2.5 py-0.5 text-xs">{categoryLabel}</span>
        )}
      </div>

      <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{issue.title}</h1>
      {issue.summary && <p className="mt-4 text-lg opacity-80">{issue.summary}</p>}

      <div className="mt-6">
        <VoteButton
          initialCount={issue.upvoteCount ?? 0}
          initialVoted={hasVoted}
          issueId={issue.id}
        />
      </div>

      {issue.status === 'NEEDS_MORE_INFO' && issue.needsMoreInfoText && (
        <aside className="mt-8 rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          <h2 className="font-semibold">The studio needs more information</h2>
          <p className="mt-1 whitespace-pre-line text-sm">{issue.needsMoreInfoText}</p>
        </aside>
      )}

      {issue.status === 'WORKAROUND_AVAILABLE' && issue.workaroundText && (
        <aside className="mt-8 rounded-md border border-purple-300 bg-purple-50 p-4 text-purple-900 dark:border-purple-700 dark:bg-purple-950/40 dark:text-purple-200">
          <h2 className="font-semibold">Workaround</h2>
          <p className="mt-1 whitespace-pre-line text-sm">{issue.workaroundText}</p>
        </aside>
      )}

      {issue.status === 'FIXED' && fixedIn?.slug && (
        <aside className="mt-8 rounded-md border border-green-300 bg-green-50 p-4 text-green-900 dark:border-green-700 dark:bg-green-950/40 dark:text-green-200">
          <h2 className="font-semibold">Fixed</h2>
          <p className="mt-1 text-sm">
            This issue was fixed in{' '}
            <Link
              className="underline"
              href={`/g/${gameSlug}/patch-notes/${fixedIn.slug}`}
            >
              {fixedIn.versionLabel ? `${fixedIn.versionLabel} — ` : ''}
              {fixedIn.title}
            </Link>
            .
          </p>
        </aside>
      )}

      {issue.details && (
        <div className="prose dark:prose-invert mt-8 max-w-none">
          <RichText data={issue.details} enableGutter={false} />
        </div>
      )}
    </article>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { gameSlug, slug } = await params
  const project = await getGameProject(gameSlug)
  if (!project) return {}

  const issue = await getPublicIssue({ projectID: project.id, slug })
  if (!issue) return {}

  return {
    description: issue.summary ?? undefined,
    title: `${issue.title} — ${project.name}`,
  }
}
