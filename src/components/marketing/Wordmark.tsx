import Link from 'next/link'
import React from 'react'

/**
 * The text wordmark (Anybody, wide), linking home unless `linked` is false,
 * as it must be inside another link. Colour comes from the band it sits on;
 * its style is in brand.css.
 */
export function Wordmark({ linked = true }: { linked?: boolean }) {
  if (!linked) return <span className="cw-wordmark">Critwire</span>

  return (
    <Link className="cw-wordmark" href="/">
      Critwire
    </Link>
  )
}
