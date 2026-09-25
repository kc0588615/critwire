import { notFound } from 'next/navigation'
import React from 'react'

import { getGameProject } from '@/lib/game-portal/getGameProject'

/**
 * Shared shell for a game portal: resolves the project once (React
 * cache shares the query with nested pages) and 404s unknown slugs.
 * Chrome is owned further down — the flagship template renders its own
 * navigation/footer, while operational pages use PortalChrome via the
 * (ops) route group layout.
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
