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
    <footer className="fs-footer">
      <div className="fs-shell fs-footer-main">
        <div>
          <p className="fs-display fs-footer-name">{project.name}</p>
          {value.tagline ? <p className="fs-meta mt-2">{value.tagline}</p> : null}
        </div>
        <nav aria-label="Footer">
          <ul className="fs-footer-links">
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
      <div className="fs-shell fs-footer-base fs-meta">
        <span>
          © {new Date().getFullYear()} {project.name}
        </span>
        <span>
          Powered by{' '}
          <Link className="fs-link" href="/">
            Critwire
          </Link>
        </span>
      </div>
    </footer>
  )
}
