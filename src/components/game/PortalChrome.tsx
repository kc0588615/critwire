import React from 'react'

import type { GameProject } from '@/payload-types'

import { getPortalSiteConfig } from '@/lib/game-portal/landingPage'
import { SiteFrame } from '@/site-templates/flagship-game-v1/render/SiteFrame'

/**
 * Frames the operational pages (patch notes, issues, report, contact)
 * and legacy block-based landings in the studio's published theme, nav
 * and footer, so every portal page matches the flagship landing.
 */
export const PortalChrome = async ({
  children,
  project,
}: {
  children: React.ReactNode
  project: GameProject
}) => (
  <SiteFrame config={await getPortalSiteConfig(project)} project={project}>
    {children}
  </SiteFrame>
)
