'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

import type { ResolvedSiteAction } from '../actions'

/** `page` on the link's own page, `true` on pages below it (a patch note under Patch notes). */
const currentState = (pathname: string, href: string): 'page' | 'true' | undefined => {
  if (pathname === href) return 'page'
  if (pathname.startsWith(`${href}/`)) return 'true'
  return undefined
}

/** The site navigation; a client component only to mark the current page. */
export const SiteNavLinks: React.FC<{
  children?: React.ReactNode
  links: ResolvedSiteAction[]
}> = ({ children, links }) => {
  const pathname = usePathname()

  return (
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
          <Link
            aria-current={currentState(pathname, link.href)}
            className="fs-nav-link"
            href={link.href}
            key={`${link.ref}-${index}`}
          >
            {link.label}
          </Link>
        ),
      )}
      {children}
    </nav>
  )
}
