import React from 'react'

import { PortalFrame } from '@/components/game/PortalFrame'
import { requirePortalProject } from '@/lib/game-portal/getGameProject'

/**
 * Every page of a game's portal (the hub, updates, feedback, the form,
 * contact) renders inside one frame, in the project's theme. Resolves
 * the project once (React cache shares the query with nested pages).
 * Every page runs the same gate, since Next can re-render a page without
 * its layout on client-side navigation.
 */
export default async function GamePortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ gameSlug: string }>
}) {
  const { gameSlug } = await params
  const project = await requirePortalProject(gameSlug)

  return <PortalFrame project={project}>{children}</PortalFrame>
}
