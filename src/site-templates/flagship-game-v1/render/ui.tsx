import Link from 'next/link'
import React from 'react'

import { Media } from '@/components/Media'

import type { ResolvedSiteAction } from '../actions'
import type { SiteRenderContext } from './context'

/** Renders a media reference from the request-scoped media map; null when unresolved. */
export const SiteMedia: React.FC<{
  alt?: string
  ctx: SiteRenderContext
  fill?: boolean
  id: null | number | undefined
  imgClassName?: string
  priority?: boolean
  size?: string
}> = ({ alt, ctx, fill, id, imgClassName, priority, size }) => {
  const resource = typeof id === 'number' ? ctx.media.get(id) : undefined
  if (!resource) return null
  return (
    <Media
      alt={alt}
      fill={fill}
      imgClassName={imgClassName}
      priority={priority}
      resource={resource}
      size={size}
    />
  )
}

export const SiteActionLink: React.FC<{
  action: null | ResolvedSiteAction
  variant?: 'primary' | 'secondary'
}> = ({ action, variant = 'primary' }) => {
  if (!action) return null
  const className = variant === 'primary' ? 'fs-btn fs-btn-primary' : 'fs-btn fs-btn-secondary'
  if (action.external) {
    return (
      <a className={className} href={action.href} rel="noopener noreferrer" target="_blank">
        {action.label}
      </a>
    )
  }
  return (
    <Link className={className} href={action.href}>
      {action.label}
    </Link>
  )
}

export const SiteActionRow: React.FC<{
  actions: ResolvedSiteAction[]
  /** Index of the action styled as primary; every other one is secondary. */
  primaryIndex?: number
}> = ({ actions, primaryIndex = 0 }) => {
  if (actions.length === 0) return null
  return (
    <div className="fs-action-row">
      {actions.map((action, index) => (
        <SiteActionLink
          action={action}
          key={`${action.ref}-${index}`}
          variant={index === primaryIndex ? 'primary' : 'secondary'}
        />
      ))}
    </div>
  )
}

/**
 * Standard section header. Every slot section is an h2 — the hero owns
 * the page's single h1 and item titles are h3s, keeping the heading
 * hierarchy renderer-controlled. An optional intro line sits under it.
 */
export const SectionHeader: React.FC<{
  heading: string
  id: string
  intro?: null | string
}> = ({ heading, id, intro }) => (
  <div className="fs-section-head">
    <h2 className="fs-h2" id={id}>
      {heading}
    </h2>
    {intro ? <p className="fs-lead mt-4 text-[var(--fs-muted-fg)]">{intro}</p> : null}
  </div>
)

/**
 * Art band for sections that carry a background image: the art at a
 * wide ratio, untouched, with the section's text below it on the page.
 */
export const SiteArtBand: React.FC<{ ctx: SiteRenderContext; id: null | number | undefined }> = ({
  ctx,
  id,
}) => {
  if (typeof id !== 'number' || !ctx.media.has(id)) return null
  return (
    <div className="fs-media-frame fs-art-band">
      <SiteMedia
        ctx={ctx}
        fill
        id={id}
        imgClassName="object-cover"
        size="(min-width: 1180px) 1180px, 100vw"
      />
    </div>
  )
}

/** Splits plain-text bodies into paragraphs on blank lines. */
export const Paragraphs: React.FC<{ className?: string; text: null | string }> = ({
  className,
  text,
}) => {
  if (!text) return null
  return (
    <>
      {text
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean)
        .map((paragraph, index) => (
          <p className={className} key={index}>
            {paragraph}
          </p>
        ))}
    </>
  )
}
