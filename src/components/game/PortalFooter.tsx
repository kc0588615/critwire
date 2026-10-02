import Link from 'next/link'
import React from 'react'

import type { GameProject } from '@/payload-types'

import { resolveProjectLinks } from '@/lib/game-portal/links'
import { portalNavLinks, portalPaths } from '@/lib/game-portal/paths'
import { isOpenSignup, isPoweredByShown, reportAbuseHref } from '@/lib/hosting'

/**
 * The portal's footer. On the hosted instance (open signup) it also offers
 * "Report this page"; a self-hosted one may hide "Powered by".
 */
export const PortalFooter: React.FC<{ project: GameProject }> = ({ project }) => (
  <footer className="fs-footer">
    <div className="fs-shell fs-footer-main">
      <p className="fs-display fs-footer-name">{project.name}</p>
      <nav aria-label="Footer">
        <ul className="fs-footer-links">
          {portalNavLinks(project.slug).map((link) => (
            <li key={link.href}>
              <Link className="fs-nav-link" href={link.href}>
                {link.label}
              </Link>
            </li>
          ))}
          {resolveProjectLinks(project).map((link) => (
            <li key={link.key}>
              <a className="fs-nav-link" href={link.url} rel="noopener noreferrer" target="_blank">
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
      <span className="fs-footer-end">
        {isPoweredByShown() ? (
          <span>
            Powered by{' '}
            <Link className="fs-link" href="/">
              Critwire
            </Link>
          </span>
        ) : null}
        {isOpenSignup() ? (
          <Link
            className="fs-link"
            href={reportAbuseHref(portalPaths(project.slug).hub)}
            prefetch={false}
          >
            Report this page
          </Link>
        ) : null}
      </span>
    </div>
  </footer>
)
