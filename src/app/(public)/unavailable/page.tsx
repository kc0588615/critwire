import type { Metadata } from 'next'

import Link from 'next/link'
import React from 'react'

import { PortalRoot } from '@/components/game/PortalFrame'
import { DEFAULT_THEME } from '@/lib/game-portal/theme'

/**
 * Where a held game or a suspended studio's portal sends visitors. Held
 * and suspended portals share it, in the default theme, with no name and
 * no reason, so it doesn't say which.
 */
export default function UnavailablePage() {
  return (
    <PortalRoot theme={DEFAULT_THEME}>
      <main className="fs-shell flex flex-1 flex-col items-center justify-center gap-4 py-24 text-center">
        <h1 className="fs-h1">This portal is unavailable.</h1>
        <Link className="fs-link" href="/">
          Go to the home page
        </Link>
      </main>
    </PortalRoot>
  )
}

export const metadata: Metadata = {
  robots: { index: false },
  title: 'Unavailable',
}
