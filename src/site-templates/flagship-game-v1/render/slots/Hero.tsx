import React from 'react'

import { Media } from '@/components/Media'

import { resolveSiteAction } from '../../actions'
import type { HeroSlot } from '../../schema/slots'
import type { SiteRenderContext } from '../context'
import { SiteActionLink, SiteMedia } from '../ui'
import { availabilityFacts } from './Availability'

/**
 * The portal's one loud element. The studio's art runs untouched (no
 * scrim, never under text); the title sits on a plate of page colour
 * cut into it, with the game's build facts beneath. Without art there
 * is no plate: the title runs at full scale on the page.
 *
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
  const art = (size: string) => (
    <SiteMedia
      ctx={ctx}
      fill
      id={value.backgroundMedia}
      imgClassName="object-cover"
      priority
      size={size}
    />
  )
  const hasArt = typeof value.backgroundMedia === 'number' && ctx.media.has(value.backgroundMedia)
  const facts = availabilityFacts(project)

  const title = (
    <>
      {value.showLogo && project.logo && typeof project.logo === 'object' ? (
        <Media imgClassName="fs-hero-logo" resource={project.logo} />
      ) : null}
      {value.eyebrow ? <p className="fs-hero-eyebrow">{value.eyebrow}</p> : null}
      <h1 className="fs-h1">{heading}</h1>
      {tagline ? <p className="fs-lead fs-hero-tagline">{tagline}</p> : null}
      <div className="fs-hero-actions">
        <SiteActionLink action={primary} variant="primary" />
        {value.variant === 'trailerBackground' && ctx.config.trailer.enabled ? (
          <a className="fs-btn fs-btn-secondary" href="#fs-trailer">
            Watch the trailer
          </a>
        ) : null}
        <SiteActionLink action={secondary} variant="secondary" />
      </div>
    </>
  )

  const buildLine =
    facts.length > 0 ? (
      <ul className="fs-build-line">
        {facts.map((fact) => (
          <li key={fact}>{fact}</li>
        ))}
      </ul>
    ) : null

  if (value.variant === 'split' && hasArt) {
    return (
      <section className="fs-hero fs-hero-split">
        <div className="fs-shell fs-hero-split-grid">
          <div className="fs-hero-settle">
            {title}
            {buildLine}
          </div>
          <div className="fs-hero-frame">{art('(min-width: 64rem) 50vw, 100vw')}</div>
        </div>
      </section>
    )
  }

  if (!hasArt) {
    return (
      <section className="fs-hero fs-hero-bare">
        <div className="fs-shell fs-hero-settle">
          {title}
          {buildLine}
        </div>
      </section>
    )
  }

  const centered = value.variant === 'centeredCinematic' || value.variant === 'trailerBackground'
  return (
    <section className="fs-hero fs-hero-plated" data-align={centered ? 'center' : 'start'}>
      <div className="fs-hero-stage">
        <div className="fs-hero-art">{art('100vw')}</div>
        <div className="fs-hero-plate fs-hero-settle">{title}</div>
      </div>
      {buildLine ? <div className="fs-shell">{buildLine}</div> : null}
    </section>
  )
}
