import { notFound } from 'next/navigation'
import React from 'react'

import { PortalFrame } from '@/components/game/PortalFrame'
import { getGameProject } from '@/lib/game-portal/getGameProject'

/**
 * Operational pages (updates, feedback, the form, contact) render inside
 * the portal frame, in the project's theme.
 */
export default async function GameOpsLayout({
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
