import React from 'react'

import { EmbedUpdates } from '@/components/embed/EmbedUpdates'
import { getGameProject } from '@/lib/game-portal/getGameProject'

export const dynamic = 'force-dynamic'

/** The updates widget. The layout renders the empty embed for a missing game. */
export default async function EmbedUpdatesPage({ params }: { params: Promise<{ gameSlug: string }> }) {
  const { gameSlug } = await params
  const project = await getGameProject(gameSlug)
  if (!project) return null

  return <EmbedUpdates project={project} />
}
