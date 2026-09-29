import type { Metadata } from 'next'

import { notFound } from 'next/navigation'
import React from 'react'

import { PatchNotesFeed } from '@/components/game/PatchNotesFeed'
import { getGameProject } from '@/lib/game-portal/getGameProject'
import { queryPublishedPatchNotes } from '@/lib/game-portal/patchNotes'

export const revalidate = 3600

// No paths at build time: each one renders on its first visit, then is
// served from the ISR cache until a hook revalidates it.
export async function generateStaticParams() {
  return []
}

type Args = { params: Promise<{ gameSlug: string }> }

export default async function PatchNotesPage({ params }: Args) {
  const { gameSlug } = await params
  const project = await getGameProject(gameSlug)
  if (!project) notFound()

  const notes = await queryPublishedPatchNotes({ page: 1, projectID: project.id })

  return <PatchNotesFeed notes={notes} project={project} />
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { gameSlug } = await params
  const project = await getGameProject(gameSlug)
  if (!project) return {}

  return {
    alternates: {
      types: {
        'application/rss+xml': `/g/${gameSlug}/patch-notes/feed.xml`,
      },
    },
    description: `Every update to ${project.name}, newest first.`,
    title: `${project.name} patch notes`,
  }
}
