import Link from 'next/link'
import React from 'react'

import { cn } from '@/utilities/ui'

import './wordmark.css'

type WordmarkSize = 'm' | 'l' | 'xl'

/**
 * The text wordmark, linking home unless `linked` is false, as it must be
 * inside another link. Sizes follow cw's text steps: l in the header and
 * footer, xl on the admin sign-in, m as the admin icon. Its style is in
 * wordmark.css.
 */
export function Wordmark({ linked = true, size = 'l' }: { linked?: boolean; size?: WordmarkSize }) {
  const className = cn('cw-wordmark', size !== 'l' && `cw-wordmark--${size}`)

  if (!linked) return <span className={className}>Critwire</span>

  return (
    <Link className={className} href="/">
      Critwire
    </Link>
  )
}
