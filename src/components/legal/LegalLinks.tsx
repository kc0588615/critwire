import Link from 'next/link'
import React from 'react'

import { LEGAL_LINKS, LEGAL_SLUGS } from '@/lib/legal/paths'

/**
 * critwire.com's three documents as a footer nav: Terms · Privacy ·
 * Copyright. `label` names the nav for screen readers; each surface styles
 * the list and its links with its own classes.
 */
export const LegalLinks: React.FC<{ className?: string; label: string; linkClassName?: string }> = ({
  className,
  label,
  linkClassName,
}) => (
  <nav aria-label={label}>
    <ul className={className}>
      {LEGAL_SLUGS.map((slug) => (
        <li key={slug}>
          <Link className={linkClassName} href={LEGAL_LINKS[slug].href}>
            {LEGAL_LINKS[slug].label}
          </Link>
        </li>
      ))}
    </ul>
  </nav>
)
