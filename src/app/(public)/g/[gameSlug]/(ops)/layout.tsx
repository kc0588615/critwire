import { notFound } from 'next/navigation'
import React from 'react'

import { PortalChrome } from '@/components/game/PortalChrome'
import { getGameProject } from '@/lib/game-portal/getGameProject'

/**
 * Operational pages (patch notes, issues, report, contact) render inside
 * the studio's frame: the published landing's theme, nav and footer.
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

  return <PortalChrome project={project}>{children}</PortalChrome>
}
