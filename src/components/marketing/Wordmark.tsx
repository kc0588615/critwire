import Link from 'next/link'
import React from 'react'

/** The text wordmark (Anybody, wide), linking home. Colour comes from the band it sits on. */
export function Wordmark() {
  return (
    <Link className="cw-wordmark" href="/">
      Critwire
    </Link>
  )
}
