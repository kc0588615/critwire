import Link from 'next/link'
import React from 'react'

import { MARKETING_NAV } from '@/components/marketing/links'
import { Wordmark } from '@/components/marketing/Wordmark'

export function Header() {
  return (
    <header className="cw-header">
      <div className="cw-shell cw-header-bar">
        <Wordmark />
        <nav aria-label="Main">
          <ul className="cw-header-links">
            {MARKETING_NAV.map(({ href, label, wideOnly }) => (
              <li className={wideOnly ? 'cw-header-wide' : undefined} key={href}>
                <Link className="cw-tap" href={href}>
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
