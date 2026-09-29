import Link from 'next/link'
import React from 'react'

import { siteThemeSchema } from '@/site-templates/flagship-game-v1/schema/theme'
import { SiteRoot } from '@/site-templates/flagship-game-v1/render/SiteFrame'

/** Same page for every miss, in the default theme: nothing about any game leaks. */
const NOT_FOUND_THEME = siteThemeSchema.parse({})

export default function NotFound() {
  return (
    <SiteRoot theme={NOT_FOUND_THEME}>
      <main className="fs-shell flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <h1 className="fs-h1">404</h1>
        <p className="fs-lead text-[var(--fs-muted-fg)]">There’s no page at this address.</p>
        <Link className="fs-link" href="/">
          Go to the home page
        </Link>
      </main>
    </SiteRoot>
  )
}
