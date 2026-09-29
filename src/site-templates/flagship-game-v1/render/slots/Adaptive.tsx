import React from 'react'

import type { AdaptiveSlot } from '../../schema/slots'
import type { SiteRenderContext } from '../context'
import { Paragraphs, SectionHeader, SiteMedia } from '../ui'

/** Plain kind names, used when the studio gives no heading. */
const KIND_HEADINGS: Record<AdaptiveSlot['kind'], string> = {
  characters: 'Characters',
  modes: 'Game modes',
  philosophy: 'Design philosophy',
  roadmap: 'Roadmap',
  story: 'Story',
  systems: 'Systems',
  world: 'World',
}

/**
 * Editorial section whose framing adapts to the game (story, roadmap,
 * systems, …). Renders nothing without meaningful content.
 */
export const AdaptiveSection: React.FC<{ ctx: SiteRenderContext; value: AdaptiveSlot }> = ({
  ctx,
  value,
}) => {
  if (!value.body && value.items.length === 0) return null
  const hasMedia = typeof value.media === 'number' && ctx.media.has(value.media)

  return (
    <section aria-labelledby="fs-adaptive-heading" className="fs-section">
      <div className={`fs-shell ${hasMedia ? 'fs-adaptive-grid' : ''}`}>
        <div className="fs-column">
          <SectionHeader
            heading={value.heading ?? KIND_HEADINGS[value.kind]}
            id="fs-adaptive-heading"
          />
          <div className="space-y-4">
            <Paragraphs className="fs-lead text-[var(--fs-muted-fg)]" text={value.body} />
          </div>
          {value.items.length > 0 ? (
            <ul className="fs-rows mt-8">
              {value.items.map((item, index) => (
                <li className="py-4" key={index}>
                  <h3 className="fs-h3">{item.title}</h3>
                  <p className="fs-body mt-1 text-[var(--fs-muted-fg)]">{item.body}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {hasMedia ? (
          <div className="fs-media-frame">
            <SiteMedia
              ctx={ctx}
              id={value.media}
              imgClassName="w-full object-cover"
              size="(min-width: 1024px) 45vw, 100vw"
            />
          </div>
        ) : null}
      </div>
    </section>
  )
}
