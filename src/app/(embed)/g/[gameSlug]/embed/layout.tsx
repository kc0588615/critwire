import React from 'react'

import { EmbedFrame } from '@/components/embed/EmbedFrame'
import { PoweredBy } from '@/components/embed/PoweredBy'
import { embedStyle } from '@/lib/embed/theme'
import { getGameProject } from '@/lib/game-portal/getGameProject'
import { resolveProjectTheme } from '@/lib/game-portal/projectTheme'

// No server cache: every request renders, and EMBED_CACHE_CONTROL
// (next.config.ts) bounds every copy in front (docs/embed.md).
export const dynamic = 'force-dynamic'

/**
 * Every widget, in the game's colours. Never `requirePortalProject`: its
 * redirect would show a browser error inside the studio's site. An
 * unknown, held or suspended game gets an empty, silent embed, which
 * reports a height of 0 so the frame collapses.
 */
export default async function EmbedGameLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ gameSlug: string }>
}) {
  const { gameSlug } = await params
  const project = await getGameProject(gameSlug)

  if (!project) {
    return (
      <EmbedFrame>
        <div className="cw-embed" data-empty="" />
      </EmbedFrame>
    )
  }

  const theme = resolveProjectTheme(project)
  return (
    <EmbedFrame>
      <div className="fs-root cw-embed" data-fs-motion={theme.motion} style={embedStyle(theme)}>
        {children}
        <PoweredBy />
      </div>
    </EmbedFrame>
  )
}
