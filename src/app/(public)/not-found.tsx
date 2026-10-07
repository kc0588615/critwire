import Link from 'next/link'
import React from 'react'

import { PortalRoot } from '@/components/game/PortalFrame'
import { DEFAULT_THEME } from '@/lib/game-portal/theme'

/** Same page for every miss, in the default theme: nothing about any game leaks. */
export default function NotFound() {
  return (
    <PortalRoot theme={DEFAULT_THEME}>
      <main className="fs-shell fs-standalone">
        <h1 className="fs-h1">404</h1>
        <p className="fs-lead fs-muted">There’s no page at this address.</p>
        <Link className="fs-link" href="/">
          Go to the home page
        </Link>
      </main>
    </PortalRoot>
  )
}
