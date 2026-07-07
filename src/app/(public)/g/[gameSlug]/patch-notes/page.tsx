import type { Metadata } from 'next'

import { notFound } from 'next/navigation'
import React from 'react'

import { PatchNotesFeed } from '@/components/game/PatchNotesFeed'
import { getGameProject } from '@/lib/game-portal/getGameProject'
import { queryPublishedPatchNotes } from '@/lib/game-portal/patchNotes'

export const revalidate = 3600

type Args = { params: Promise<{ gameSlug: string }> }

export default async function PatchNotesPage({ params }: Args) {
  const { gameSlug } = await params
  const project = await getGameProject(gameSlug)
  if (!project) notFound()

  const notes = await queryPublishedPatchNotes({ page: 1, projectID: project.id })

  return <PatchNotesFeed gameSlug={gameSlug} notes={notes} />
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
    description: `Latest updates and patch notes for ${project.name}.`,
    title: `Patch Notes — ${project.name}`,
  }
}
