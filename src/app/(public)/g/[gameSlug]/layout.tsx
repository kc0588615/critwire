import { notFound } from 'next/navigation'
import React from 'react'

import { PortalFrame } from '@/components/game/PortalFrame'
import { getGameProject } from '@/lib/game-portal/getGameProject'

/**
 * Every page of a game's portal (the hub, updates, feedback, the form,
 * contact) renders inside one frame, in the project's theme. Resolves
 * the project once (React cache shares the query with nested pages) and
 * 404s unknown slugs.
 */
export default async function GamePortalLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ gameSlug: string }>
}) {
  const { gameSlug } = await params
  const project = await getGameProject(gameSlug)
  if (!project) notFound()

  return <PortalFrame project={project}>{children}</PortalFrame>
}
