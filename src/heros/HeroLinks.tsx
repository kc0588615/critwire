import React from 'react'

import type { Page } from '@/payload-types'

import { CMSLink } from '@/components/Link'

/** A hero's call-to-action row, shared by the high and medium heroes. */
export const HeroLinks: React.FC<Pick<Page['hero'], 'links'>> = ({ links }) => {
  if (!Array.isArray(links) || links.length === 0) return null

  return (
    <ul className="cw-actions">
      {links.map(({ link }, i) => (
        <li key={i}>
          <CMSLink {...link} />
        </li>
      ))}
    </ul>
  )
}
