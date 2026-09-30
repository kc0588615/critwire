import React from 'react'

import type { GameProject } from '@/payload-types'

import { displayFontVariables } from '@/components/game/theme/fonts'
import { themeStyle } from '@/components/game/theme/themeStyle'
import { resolveProjectTheme } from '@/lib/game-portal/projectTheme'
import type { SiteThemeV1 } from '@/lib/game-portal/theme'

import type { SiteConfigV1 } from '../schema/config'
import { SiteFooter } from './SiteFooter'
import { SiteNav } from './SiteNav'

/**
 * The only element that carries `.fs-root`: the theme's custom
 * properties, the display-font variables and the motion setting live
 * here, so the focus, motion and prose rules have exactly one root to
 * target.
 */
export const SiteRoot: React.FC<{ children: React.ReactNode; theme: SiteThemeV1 }> = ({
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
 * The studio's frame around every portal page: root, skip link, nav,
 * main, footer. The theme is always the project's; the config supplies
 * only the nav and footer.
 */
export const SiteFrame: React.FC<{
  children: React.ReactNode
  config: SiteConfigV1
  project: GameProject
}> = ({ children, config, project }) => (
  <SiteRoot theme={resolveProjectTheme(project)}>
    <a className="fs-skip" href="#fs-main">
      Skip to content
    </a>
    <SiteNav project={project} value={config.nav} />
    <main className="flex-1" id="fs-main">
      {children}
    </main>
    <SiteFooter nav={config.nav} project={project} value={config.footer} />
  </SiteRoot>
)
