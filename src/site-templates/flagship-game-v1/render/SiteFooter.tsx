import Link from 'next/link'
import React from 'react'

import type { GameProject } from '@/payload-types'

import {
  EXTERNAL_LINK_LABELS,
  LEGAL_LINK_LABELS,
  resolveProjectLinks,
  resolveSiteActions,
} from '../actions'
import type { SiteActionRef } from '../schema/refs'
import type { FooterConfig, NavConfig } from '../schema/slots'

const PORTAL_REFS = ['updates', 'issues', 'report', 'contact'] as const satisfies SiteActionRef[]

/** The studio's own nav label for a ref, so the footer names pages the way the nav does. */
const studioLabel = (nav: NavConfig, ref: SiteActionRef): null | string =>
  [...nav.links, nav.cta].find((action) => action?.ref === ref && action.label)?.label ?? null

export const SiteFooter: React.FC<{
  nav: NavConfig
  project: GameProject
  value: FooterConfig
}> = ({ nav, project, value }) => {
  const portal = resolveSiteActions(
    PORTAL_REFS.map((ref) => ({ label: studioLabel(nav, ref), ref })),
    project,
  )
  const outbound = [
    ...resolveProjectLinks(project, EXTERNAL_LINK_LABELS),
    ...(value.showLegalLinks ? resolveProjectLinks(project, LEGAL_LINK_LABELS) : []),
  ]

  return (
    <footer className="border-t border-[var(--fs-border)]">
      <div className="fs-shell py-10">
        <div className="flex flex-wrap items-start justify-between gap-8">
          <div className="max-w-sm">
            <p className="fs-display text-lg">
              {project.name}
            </p>
            {value.tagline ? (
              <p className="mt-2 text-sm leading-6 text-[var(--fs-muted-fg)]">{value.tagline}</p>
            ) : null}
          </div>
          <nav aria-label="Footer" className="text-sm">
            <ul className="flex flex-wrap gap-x-6 gap-y-2">
              {portal.map((link) => (
                <li key={link.ref}>
                  <Link className="fs-nav-link" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ))}
              {outbound.map((link) => (
                <li key={link.key}>
                  <a
                    className="fs-nav-link"
                    href={link.url}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--fs-border)] pt-6 text-sm text-[var(--fs-muted-fg)]">
          <span>
            © {new Date().getFullYear()} {project.name}
          </span>
          <span>
            Powered by{' '}
            <Link className="fs-link underline" href="/">
              Critwire
            </Link>
          </span>
        </div>
      </div>
    </footer>
  )
}
