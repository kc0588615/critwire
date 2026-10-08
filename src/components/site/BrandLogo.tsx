import Link from 'next/link'
import React from 'react'

import { SITE } from '@/lib/site'
import { cn } from '@/utilities/ui'

import './brand-logo.css'

/** The lockup's own proportions (its viewBox), so the page reserves its box before it loads. */
const LOCKUP = { height: 129, width: 1169 } as const

/**
 * The game's lockup, one image per colour scheme; brand-logo.css shows the
 * one that matches the system setting, or the admin's `html[data-theme]`.
 * Only one is ever displayed, so both carry the name and the link reads it
 * once. Links home unless `linked` is false, as it must be inside another
 * link. `className` may set its height, `--brand-logo-h`.
 */
export function BrandLogo({ className, linked = true }: { className?: string; linked?: boolean }) {
  const images = (['light', 'dark'] as const).map((scheme) => (
    // The brand's own SVG files, as staged: nothing for next/image to optimise.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={SITE.name}
      className={`brand-logo-img brand-logo-${scheme}`}
      height={LOCKUP.height}
      key={scheme}
      src={SITE.logo[scheme]}
      width={LOCKUP.width}
    />
  ))

  if (!linked) return <span className={cn('brand-logo', className)}>{images}</span>

  return (
    <Link className={cn('brand-logo', className)} href="/">
      {images}
    </Link>
  )
}
