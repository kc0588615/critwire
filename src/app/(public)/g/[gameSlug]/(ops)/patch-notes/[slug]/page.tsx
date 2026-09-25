import type { Metadata } from 'next'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import React from 'react'

import RichText from '@/components/RichText'
import { formatPatchDate } from '@/components/game/PatchNotesFeed'
import { getGameProject } from '@/lib/game-portal/getGameProject'
import { getPublishedPatchNote } from '@/lib/game-portal/patchNotes'

export const revalidate = 3600

type Args = { params: Promise<{ gameSlug: string; slug: string }> }

export default async function PatchNoteDetailPage({ params }: Args) {
  const { gameSlug, slug } = await params
  const project = await getGameProject(gameSlug)
  if (!project) notFound()

  const note = await getPublishedPatchNote({ projectID: project.id, slug })
  if (!note) notFound()

  return (
    <article className="mx-auto max-w-3xl px-6 py-12">
      <Link className="text-sm opacity-70 hover:opacity-100" href={`/g/${gameSlug}/patch-notes`}>
        ← All patch notes
      </Link>
      <div className="mt-6 flex flex-wrap items-center gap-3 text-sm opacity-70">
        {note.versionLabel && (
          <span className="rounded-full border px-2.5 py-0.5 font-mono text-xs">
            {note.versionLabel}
          </span>
        )}
        {note.publishedAt && (
          <time dateTime={note.publishedAt}>{formatPatchDate(note.publishedAt)}</time>
        )}
      </div>
      <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{note.title}</h1>
      {note.summary && <p className="mt-4 text-lg opacity-80">{note.summary}</p>}
      <div className="prose dark:prose-invert mt-8 max-w-none">
        <RichText data={note.content} enableGutter={false} />
      </div>
    </article>
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
