import type { Metadata } from 'next'

import { notFound } from 'next/navigation'
import React from 'react'

import { PatchNotesFeed } from '@/components/game/PatchNotesFeed'
import { getGameProject } from '@/lib/game-portal/getGameProject'
import { queryPublishedPatchNotes } from '@/lib/game-portal/patchNotes'

export const revalidate = 3600

type Args = { params: Promise<{ gameSlug: string; pageNumber: string }> }

export default async function PatchNotesPaginatedPage({ params }: Args) {
  const { gameSlug, pageNumber } = await params
  const page = Number(pageNumber)
  if (!Number.isInteger(page) || page < 2) notFound()

  const project = await getGameProject(gameSlug)
  if (!project) notFound()

  const notes = await queryPublishedPatchNotes({ page, projectID: project.id })
  if (page > (notes.totalPages || 1)) notFound()

  return <PatchNotesFeed gameSlug={gameSlug} notes={notes} />
}

export async function generateMetadata({ params }: Args): Promise<Metadata> {
  const { gameSlug, pageNumber } = await params
  const project = await getGameProject(gameSlug)
  if (!project) return {}

  return {
    title: `Patch Notes (page ${pageNumber}) — ${project.name}`,
  }
}
