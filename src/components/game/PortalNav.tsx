import Link from 'next/link'
import React from 'react'

import type { GameProject } from '@/payload-types'

import { Media } from '@/components/Media'
import { PROJECT_LINK_LABELS } from '@/lib/game-portal/links'
import { portalNavLinks, portalPaths } from '@/lib/game-portal/paths'

import { PortalNavLinks } from './PortalNavLinks'

export const PortalNav: React.FC<{ project: GameProject }> = ({ project }) => {
  const website = project.links?.website

  return (
    <header className="fs-nav">
      <div className="fs-shell fs-nav-bar">
        <Link className="fs-nav-home" href={portalPaths(project.slug).hub}>
          {project.logo && typeof project.logo === 'object' ? (
            <Media
              imgClassName="fs-nav-logo"
              resource={project.logo}
              size="36px"
            />
          ) : null}
          <span className="fs-display fs-nav-name">{project.name}</span>
        </Link>
        <PortalNavLinks links={portalNavLinks(project.slug)} />
        {website ? (
          <a
            className="fs-btn fs-btn-secondary fs-nav-site"
            href={website}
            rel="noopener noreferrer"
            target="_blank"
          >
            {PROJECT_LINK_LABELS.website}
          </a>
        ) : null}
      </div>
    </header>
  )
}
