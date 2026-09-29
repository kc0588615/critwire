import Link from 'next/link'
import React from 'react'

import type { GameProject } from '@/payload-types'

import { Media } from '@/components/Media'

import { resolveSiteAction, resolveSiteActions } from '../actions'
import type { NavConfig } from '../schema/slots'
import { SiteNavLinks } from './SiteNavLinks'
import { SiteActionLink } from './ui'

export const SiteNav: React.FC<{ project: GameProject; value: NavConfig }> = ({
  project,
  value,
}) => {
  const links = resolveSiteActions(value.links, project)
  const cta = resolveSiteAction(value.cta, project)

  return (
    <header className="fs-nav">
      <div className="fs-shell flex items-center justify-between gap-4 py-4">
        <Link className="fs-link flex min-w-0 items-center gap-3" href={`/g/${project.slug}`}>
          {project.logo && typeof project.logo === 'object' ? (
            <Media
              imgClassName="h-9 w-9 rounded-[var(--fs-radius)] object-cover"
              resource={project.logo}
            />
          ) : null}
          <span className="truncate fs-display text-base">
            {project.name}
          </span>
        </Link>
        <SiteNavLinks links={links}>
          {cta ? <SiteActionLink action={cta} variant="primary" /> : null}
        </SiteNavLinks>
      </div>
    </header>
  )
}
