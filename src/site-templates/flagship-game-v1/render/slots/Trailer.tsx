import React from 'react'

import { getEmbedUrl } from '@/lib/validation/video'

import type { TrailerSlot } from '../../schema/slots'
import type { SiteRenderContext } from '../context'
import { TrailerLite } from '../TrailerLite'
import { SectionHeader, SiteMedia } from '../ui'

/**
 * The trailer URL is a project fact (links.trailer). No YouTube/Vimeo
 * iframe loads until the visitor clicks play (see TrailerLite).
 */
export const TrailerSection: React.FC<{ ctx: SiteRenderContext; value: TrailerSlot }> = ({
  ctx,
  value,
}) => {
  if (!value.enabled) return null
  const trailerUrl = ctx.project.links?.trailer
  const embedUrl = trailerUrl ? getEmbedUrl(trailerUrl) : null
  if (!embedUrl) return null

  const title = value.heading ?? `${ctx.project.name} trailer`

  return (
    <section aria-labelledby="fs-trailer-heading" className="fs-section" id="fs-trailer">
      <div className="fs-shell max-w-5xl">
        <SectionHeader
          align="center"
          heading={value.heading ?? 'Watch the Trailer'}
          id="fs-trailer-heading"
        />
        <TrailerLite embedUrl={embedUrl} title={title}>
          {typeof value.poster === 'number' ? (
            <SiteMedia
              ctx={ctx}
              fill
              id={value.poster}
              imgClassName="object-cover"
              size="(min-width: 1024px) 60rem, 100vw"
            />
          ) : (
            <span aria-hidden="true" className="fs-trailer-fallback" />
          )}
        </TrailerLite>
      </div>
    </section>
  )
}
