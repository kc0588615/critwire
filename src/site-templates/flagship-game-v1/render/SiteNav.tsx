import Link from 'next/link'
import React from 'react'

import { Media } from '@/components/Media'

import { resolveSiteAction, resolveSiteActions } from '../actions'
import type { NavConfig } from '../schema/slots'
import type { SiteRenderContext } from './context'
import { NavShell } from './NavShell'
import { SiteActionLink } from './ui'

export const SiteNav: React.FC<{ ctx: SiteRenderContext; value: NavConfig }> = ({
  ctx,
  value,
}) => {
  const { project } = ctx
  const links = resolveSiteActions(value.links, project)
  const cta = resolveSiteAction(value.cta, project)

  return (
    <NavShell>
      <div className="fs-shell flex items-center justify-between gap-4 py-4">
        <Link className="fs-link flex min-w-0 items-center gap-3" href={`/g/${project.slug}`}>
          {project.logo && typeof project.logo === 'object' ? (
            <Media imgClassName="h-9 w-9 rounded-[var(--fs-radius)] object-cover" resource={project.logo} />
          ) : null}
          <span className="truncate font-[family-name:var(--fs-font-heading)] text-base font-bold tracking-tight">
            {project.name}
          </span>
        </Link>
        <nav aria-label="Site" className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
          {links.map((link, index) =>
            link.external ? (
              <a
                className="fs-nav-link"
                href={link.href}
                key={`${link.ref}-${index}`}
                rel="noopener noreferrer"
                target="_blank"
              >
                {link.label}
              </a>
            ) : (
              <Link className="fs-nav-link" href={link.href} key={`${link.ref}-${index}`}>
                {link.label}
              </Link>
            ),
          )}
          {cta ? <SiteActionLink action={cta} variant="primary" /> : null}
        </nav>
      </div>
    </NavShell>
  )
}
