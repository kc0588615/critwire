import React from 'react'

import type { GameProject } from '@/payload-types'

import { getPortalSiteConfig } from '@/lib/game-portal/landingPage'
import { SiteFrame } from '@/site-templates/flagship-game-v1/render/SiteFrame'

/**
 * Frames the operational pages (updates, feedback, the form, contact)
 * and legacy block-based landings in the project's theme and the
 * published landing's nav and footer, so every portal page matches the
 * flagship landing.
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
