'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

import type { PortalNavLink } from '@/lib/game-portal/paths'

/** `page` on the link's own page, `true` on pages below it (an update under Updates). */
const currentState = (pathname: string, href: string): 'page' | 'true' | undefined => {
  if (pathname === href) return 'page'
  if (pathname.startsWith(`${href}/`)) return 'true'
  return undefined
}

/** The portal's navigation; a client component only to mark the current page. */
export const PortalNavLinks: React.FC<{ links: PortalNavLink[] }> = ({ links }) => {
  const pathname = usePathname()

  return (
    <nav aria-label="Site" className="fs-nav-links">
      {links.map((link) => (
        <Link
          aria-current={currentState(pathname, link.href)}
          className="fs-nav-link"
          href={link.href}
          key={link.href}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
