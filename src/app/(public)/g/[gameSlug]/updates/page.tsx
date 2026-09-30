import type { Metadata } from 'next'

import React from 'react'

import { PatchNotesFeed } from '@/components/game/PatchNotesFeed'
import { getGameProject, requirePortalProject } from '@/lib/game-portal/getGameProject'
import { portalPaths } from '@/lib/game-portal/paths'
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
  const project = await requirePortalProject(gameSlug)

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
        'application/rss+xml': portalPaths(gameSlug).rss,
      },
    },
    description: `Every update to ${project.name}, newest first.`,
    title: `${project.name} updates`,
  }
}
