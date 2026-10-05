import Link from 'next/link'
import React from 'react'

import { LegalLinks } from '@/components/legal/LegalLinks'
import { MARKETING_NAV } from '@/components/marketing/links'
import { Wordmark } from '@/components/marketing/Wordmark'

export function Footer() {
  return (
    <footer className="cw-footer">
      <div className="cw-shell cw-footer-bar">
        <Wordmark />
        <nav aria-label="Footer">
          <ul className="cw-footer-links">
            {MARKETING_NAV.map(({ href, label }) => (
              <li key={href}>
                <Link className="cw-tap" href={href}>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <LegalLinks className="cw-footer-links" label="Legal" linkClassName="cw-tap" />
        <p className="cw-footer-copy">© {new Date().getFullYear()} Critwire</p>
      </div>
    </footer>
  )
}
