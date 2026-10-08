import Link from 'next/link'
import React from 'react'

import { BrandLogo } from '@/components/site/BrandLogo'
import { portalNavLinks } from '@/lib/game-portal/paths'
import { SITE } from '@/lib/site'

/** Critwire's own pages: the game's lockup, linking home, and the hub's pages (D28). */
export function Header() {
  return (
    <header className="cw-header">
      <div className="cw-shell cw-header-bar">
        <BrandLogo className="cw-header-logo" />
        <nav aria-label="Main" className="cw-header-nav">
          <ul className="cw-header-links">
            {portalNavLinks(SITE.gameSlug).map(({ href, label }) => (
              <li key={href}>
                <Link className="fs-tap fs-link cw-nav-link" href={href}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  )
}
