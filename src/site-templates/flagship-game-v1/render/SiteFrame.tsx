import React from 'react'

import type { GameProject } from '@/payload-types'

import type { SiteConfigV1 } from '../schema/config'
import type { SiteThemeV1 } from '../schema/theme'
import { SiteFooter } from './SiteFooter'
import { SiteNav } from './SiteNav'
import { themeStyle } from './themeStyle'

/**
 * The only element that carries `.fs-root`: the theme's custom
 * properties and motion setting live here, so the focus, motion and
 * prose rules have exactly one root to target.
 */
export const SiteRoot: React.FC<{ children: React.ReactNode; theme: SiteThemeV1 }> = ({
  children,
  theme,
}) => (
  <div
    className="fs-root flex min-h-screen flex-col"
    data-fs-motion={theme.motion}
    style={themeStyle(theme)}
  >
    {children}
  </div>
)

/** The studio's frame around every portal page: root, skip link, nav, main, footer. */
export const SiteFrame: React.FC<{
  children: React.ReactNode
  config: SiteConfigV1
  project: GameProject
}> = ({ children, config, project }) => (
  <SiteRoot theme={config.theme}>
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
