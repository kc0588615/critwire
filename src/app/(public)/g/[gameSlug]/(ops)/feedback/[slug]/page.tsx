import type { Metadata } from 'next'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import type { Issue } from '@/payload-types'

import RichText from '@/components/RichText'
import { IssueMeta, issueStatusShape, StatusMark } from '@/components/game/IssueStatus'
import { VoteButton } from '@/components/game/VoteButton'
import { getGameProject } from '@/lib/game-portal/getGameProject'
import { getHasVoted, getPublicIssue } from '@/lib/game-portal/issues'
import { portalPaths } from '@/lib/game-portal/paths'

// Reads the vote cookie and shows live counts — always dynamic.
export const dynamic = 'force-dynamic'

type Args = { params: Promise<{ gameSlug: string; slug: string }> }

/** The studio's note on the issue: one surface panel, headed by the status's own marker. */
const IssueNote: React.FC<{
  children: React.ReactNode
  heading: string
  status: Issue['status']
}> = ({ children, heading, status }) => (
  <aside className="fs-note mt-10">
    <h2 className="fs-note-head">
      <StatusMark shape={issueStatusShape(status)} />
      {heading}
    </h2>
    {children}
  </aside>
)

export default async function IssueDetailPage({ params }: Args) {
  const { gameSlug, slug } = await params
  const project = await getGameProject(gameSlug)
  if (!project) notFound()

  const issue = await getPublicIssue({ projectID: project.id, slug })
  if (!issue) notFound()

  const hasVoted = await getHasVoted(issue.id)
  const fixedIn =
    issue.fixedInPatchNote && typeof issue.fixedInPatchNote === 'object'
      ? issue.fixedInPatchNote
      : null

  const paths = portalPaths(gameSlug)

  return (
    <div className="fs-shell fs-ops">
      <article className="fs-column">
        <Link className="fs-back" href={paths.feedback}>
          All feedback
        </Link>
        <IssueMeta className="mt-8" issue={issue} />
        <h1 className="fs-page-title mt-3">{issue.title}</h1>
        {issue.summary ? (
          <p className="fs-lead mt-5 text-[var(--fs-muted-fg)]">{issue.summary}</p>
        ) : null}

        <div className="mt-8">
          <VoteButton
            initialCount={issue.upvoteCount ?? 0}
            initialVoted={hasVoted}
            issueId={issue.id}
          />
        </div>

        {issue.status === 'NEEDS_MORE_INFO' && issue.needsMoreInfoText ? (
          <IssueNote heading="The studio needs more information" status={issue.status}>
            <p className="whitespace-pre-line">{issue.needsMoreInfoText}</p>
          </IssueNote>
        ) : null}

        {issue.status === 'WORKAROUND_AVAILABLE' && issue.workaroundText ? (
          <IssueNote heading="Workaround" status={issue.status}>
            <p className="whitespace-pre-line">{issue.workaroundText}</p>
          </IssueNote>
        ) : null}

        {issue.status === 'FIXED' && fixedIn?.slug ? (
          <IssueNote heading="Fixed" status={issue.status}>
            <p>
              The fix shipped in{' '}
              <Link className="fs-link" href={paths.update(fixedIn.slug)}>
                {fixedIn.versionLabel ? `${fixedIn.versionLabel} — ` : ''}
                {fixedIn.title}
              </Link>
              .
            </p>
          </IssueNote>
        ) : null}

        {issue.details ? (
          <RichText className="mx-0 mt-10" data={issue.details} enableGutter={false} />
        ) : null}
      </article>
    </div>
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
