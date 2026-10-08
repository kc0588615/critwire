import type { Metadata } from 'next'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import RichText from '@/components/RichText'
import { formatDate } from '@/components/game/format'
import { FromYourFeedback } from '@/components/game/FromYourFeedback'
import { requirePortalProject } from '@/lib/game-portal/getGameProject'
import { portalPaths } from '@/lib/game-portal/paths'
import { getPublishedPatchNote } from '@/lib/game-portal/patchNotes'

export const revalidate = 3600

// No paths at build time: each one renders on its first visit, then is
// served from the ISR cache until a hook revalidates it.
export async function generateStaticParams() {
  return []
}

type Args = { params: Promise<{ gameSlug: string; slug: string }> }

export default async function PatchNoteDetailPage({ params }: Args) {
  const { gameSlug, slug } = await params
  const project = await requirePortalProject(gameSlug)

  const note = await getPublishedPatchNote({ projectID: project.id, slug })
  if (!note) notFound()

  const published = formatDate(note.publishedAt)
  const paths = portalPaths(gameSlug)

  return (
    <div className="fs-shell fs-ops">
      <article className="fs-column">
        <Link className="fs-back" href={paths.updates}>
          All updates
        </Link>
        {note.versionLabel || published ? (
          <p className="fs-meta-line mt-xxl">
            {note.versionLabel ? <span className="fs-version">{note.versionLabel}</span> : null}
            {published ? (
              <time className="fs-meta" dateTime={note.publishedAt ?? undefined}>
                {published}
              </time>
            ) : null}
          </p>
        ) : null}
        <h1 className="fs-page-title mt-m">{note.title}</h1>
        {note.summary ? <p className="fs-lead fs-muted mt-l">{note.summary}</p> : null}
        <RichText className="mx-zero mt-xxl" data={note.content} enableGutter={false} />
        <FromYourFeedback noteID={note.id} paths={paths} projectID={project.id} />
      </article>
    </div>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { gameSlug, slug } = await params
  const project = await requirePortalProject(gameSlug)

  const note = await getPublishedPatchNote({ projectID: project.id, slug })
  if (!note) notFound()

  return {
    description: note.summary ?? undefined,
    title: { absolute: `${note.title} — ${project.name}` },
  }
}
