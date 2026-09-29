import type { Metadata } from 'next'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import RichText from '@/components/RichText'
import { formatDate } from '@/components/game/format'
import { getGameProject } from '@/lib/game-portal/getGameProject'
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
  const project = await getGameProject(gameSlug)
  if (!project) notFound()

  const note = await getPublishedPatchNote({ projectID: project.id, slug })
  if (!note) notFound()

  const published = formatDate(note.publishedAt)

  return (
    <div className="fs-shell fs-ops">
      <article className="fs-column">
        <Link className="fs-back" href={`/g/${gameSlug}/patch-notes`}>
          All patch notes
        </Link>
        {note.versionLabel || published ? (
          <p className="fs-meta-line mt-8">
            {note.versionLabel ? <span className="fs-version">{note.versionLabel}</span> : null}
            {published ? (
              <time className="fs-meta" dateTime={note.publishedAt ?? undefined}>
                {published}
              </time>
            ) : null}
          </p>
        ) : null}
        <h1 className="fs-page-title mt-3">{note.title}</h1>
        {note.summary ? <p className="fs-lead mt-5 text-[var(--fs-muted-fg)]">{note.summary}</p> : null}
        <RichText className="mx-0 mt-10" data={note.content} enableGutter={false} />
      </article>
    </div>
  )
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { gameSlug, slug } = await params
  const project = await getGameProject(gameSlug)
  if (!project) return {}

  const note = await getPublishedPatchNote({ projectID: project.id, slug })
  if (!note) return {}

  return {
    description: note.summary ?? undefined,
    title: `${note.title} — ${project.name}`,
  }
}
