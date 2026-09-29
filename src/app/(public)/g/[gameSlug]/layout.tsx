import { notFound } from 'next/navigation'
import React from 'react'

import { getGameProject } from '@/lib/game-portal/getGameProject'

/**
 * Shared shell for a game portal: resolves the project once (React
 * cache shares the query with nested pages) and 404s unknown slugs.
 * The frame is owned further down: the flagship landing renders
 * SiteFrame itself, while operational pages get the same frame through
 * PortalChrome in the (ops) route group layout.
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

  return <>{children}</>
}
