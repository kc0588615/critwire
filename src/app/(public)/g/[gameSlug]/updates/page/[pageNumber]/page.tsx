import type { Metadata } from 'next'

import { notFound } from 'next/navigation'
import React from 'react'

import { PatchNotesFeed } from '@/components/game/PatchNotesFeed'
import { requirePortalProject } from '@/lib/game-portal/getGameProject'
import { queryPublishedPatchNotes } from '@/lib/game-portal/patchNotes'

export const revalidate = 3600

// No paths at build time: each one renders on its first visit, then is
// served from the ISR cache until a hook revalidates it.
export async function generateStaticParams() {
  return []
}

type Args = { params: Promise<{ gameSlug: string; pageNumber: string }> }

export default async function PatchNotesPaginatedPage({ params }: Args) {
  const { gameSlug, pageNumber } = await params
  const page = Number(pageNumber)
  if (!Number.isInteger(page) || page < 2) notFound()

  const project = await requirePortalProject(gameSlug)

  const notes = await queryPublishedPatchNotes({ page, projectID: project.id })
  if (page > (notes.totalPages || 1)) notFound()

  return <PatchNotesFeed notes={notes} project={project} />
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { gameSlug, pageNumber } = await params
  const project = await requirePortalProject(gameSlug)

  return {
    title: { absolute: `${project.name} updates, page ${pageNumber}` },
  }
}
