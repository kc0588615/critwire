import React from 'react'

import { Media } from '@/components/Media'

import { resolveSiteAction } from '../../actions'
import type { HeroSlot } from '../../schema/slots'
import type { SiteRenderContext } from '../context'
import { SiteActionLink, SiteMedia } from '../ui'

/**
 * The hero owns the page's only h1 and the only `priority` (LCP) image.
 */
export const HeroSection: React.FC<{ ctx: SiteRenderContext; value: HeroSlot }> = ({
  ctx,
  value,
}) => {
  const { project } = ctx
  const heading = value.heading ?? project.name
  const tagline = value.tagline ?? project.description ?? null
  const primary = resolveSiteAction(value.primaryAction, project)
  const secondary = resolveSiteAction(value.secondaryAction, project)
  const hasBackground = typeof value.backgroundMedia === 'number'
  const centered = value.variant === 'centeredCinematic' || value.variant === 'trailerBackground'

  const logo =
    value.showLogo && project.logo && typeof project.logo === 'object' ? (
      <Media
        imgClassName={`mb-7 max-h-20 w-auto ${centered ? 'mx-auto' : ''}`}
        resource={project.logo}
      />
    ) : null

  const textBlock = (
    <div className={centered ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl'}>
      {logo}
      {value.eyebrow ? <p className="fs-eyebrow">{value.eyebrow}</p> : null}
      <h1 className="fs-h1">{heading}</h1>
      {tagline ? (
        <p
          className={`mt-6 text-lg leading-8 text-[var(--fs-muted-fg)] sm:text-xl ${
            centered ? 'mx-auto max-w-2xl' : 'max-w-xl'
          }`}
        >
          {tagline}
        </p>
      ) : null}
      <div className={`mt-9 flex flex-wrap gap-3 ${centered ? 'justify-center' : ''}`}>
        <SiteActionLink action={primary} variant="primary" />
        {value.variant === 'trailerBackground' && ctx.config.trailer.enabled ? (
          <a className="fs-btn fs-btn-secondary" href="#fs-trailer">
            <span aria-hidden="true" className="mr-2">
              ▶
            </span>
            Watch the Trailer
          </a>
        ) : null}
        <SiteActionLink action={secondary} variant="secondary" />
      </div>
    </div>
  )

  if (value.variant === 'split') {
    return (
      <section className="fs-hero">
        <div className="fs-shell grid items-center gap-10 py-20 lg:grid-cols-2 lg:py-28">
          {textBlock}
          {hasBackground ? (
            <div className="fs-panel overflow-hidden p-2">
              <SiteMedia
                ctx={ctx}
                id={value.backgroundMedia}
                imgClassName="w-full rounded-[calc(var(--fs-radius)-4px)] object-cover"
                priority
                size="(min-width: 1024px) 50vw, 100vw"
              />
            </div>
          ) : null}
        </div>
      </section>
    )
  }

  return (
    <section className="fs-hero relative isolate overflow-hidden">
      {hasBackground ? (
        <div className="absolute inset-0 -z-10">
          <SiteMedia
            ctx={ctx}
            fill
            id={value.backgroundMedia}
            imgClassName="object-cover"
            priority
            size="100vw"
          />
          <div aria-hidden="true" className="fs-hero-scrim absolute inset-0" />
        </div>
      ) : null}
      <div
        className={`fs-shell flex min-h-[min(85vh,52rem)] items-center py-24 ${
          centered ? 'justify-center' : ''
        }`}
      >
        {textBlock}
      </div>
    </section>
  )
}
