import React from 'react'

import type { GameProject } from '@/payload-types'

import { displayFontVariables } from '@/components/game/theme/fonts'
import { themeStyle } from '@/components/game/theme/themeStyle'
import { resolveProjectTheme } from '@/lib/game-portal/projectTheme'
import type { SiteThemeV1 } from '@/lib/game-portal/theme'

import { PortalFooter } from './PortalFooter'
import { PortalNav } from './PortalNav'

/**
 * The only element that carries `.fs-root`: the theme's custom
 * properties, the display-font variables and the motion setting live
 * here, so the focus, motion and prose rules have exactly one root to
 * target.
 */
export const PortalRoot: React.FC<{ children: React.ReactNode; theme: SiteThemeV1 }> = ({
  children,
  theme,
}) => (
  <div
    className={`fs-root flex min-h-screen flex-col ${displayFontVariables}`}
    data-fs-motion={theme.motion}
    style={themeStyle(theme)}
  >
    {children}
  </div>
)

/**
 * The frame around every page of a game's portal, in the project's
 * theme: root, skip link, nav, main, footer. Nothing in it is
 * configurable beyond the project's own facts.
 */
export const PortalFrame: React.FC<{ children: React.ReactNode; project: GameProject }> = ({
  children,
  project,
}) => (
  <PortalRoot theme={resolveProjectTheme(project)}>
    <a className="fs-skip" href="#fs-main">
      Skip to content
    </a>
    <PortalNav project={project} />
    <main className="flex-1" id="fs-main">
      {children}
    </main>
    <PortalFooter project={project} />
  </PortalRoot>
)
