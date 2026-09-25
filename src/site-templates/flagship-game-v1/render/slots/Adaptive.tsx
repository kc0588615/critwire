import React from 'react'

import type { AdaptiveSlot } from '../../schema/slots'
import type { SiteRenderContext } from '../context'
import { Paragraphs, SectionHeader, SiteMedia } from '../ui'

const KIND_LABELS: Record<AdaptiveSlot['kind'], { eyebrow: string; heading: string }> = {
  characters: { eyebrow: 'Meet the Cast', heading: 'Characters' },
  modes: { eyebrow: 'Ways to Play', heading: 'Game Modes' },
  philosophy: { eyebrow: 'Why We Build', heading: 'Design Philosophy' },
  roadmap: { eyebrow: 'What Is Next', heading: 'Roadmap' },
  story: { eyebrow: 'The Story', heading: 'A World Worth Saving' },
  systems: { eyebrow: 'Under the Hood', heading: 'Systems' },
  world: { eyebrow: 'The World', heading: 'Explore the World' },
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
  const labels = KIND_LABELS[value.kind]
  const hasMedia = typeof value.media === 'number'

  return (
    <section aria-labelledby="fs-adaptive-heading" className="fs-section">
      <div className="fs-shell">
        <div className={hasMedia ? 'grid items-start gap-10 lg:grid-cols-[1.1fr_0.9fr]' : ''}>
          <div>
            <SectionHeader
              eyebrow={labels.eyebrow}
              heading={value.heading ?? labels.heading}
              id="fs-adaptive-heading"
            />
            <div className="max-w-2xl space-y-5">
              <Paragraphs className="text-lg leading-8 text-[var(--fs-muted-fg)]" text={value.body} />
            </div>
            {value.items.length > 0 ? (
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {value.items.map((item, index) => (
                  <div className="fs-panel p-5" key={index}>
                    <h3 className="fs-h3 text-base">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[var(--fs-muted-fg)]">{item.body}</p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          {hasMedia ? (
            <div className="fs-panel overflow-hidden p-2">
              <SiteMedia
                ctx={ctx}
                id={value.media}
                imgClassName="w-full rounded-[calc(var(--fs-radius)-4px)] object-cover"
                size="(min-width: 1024px) 45vw, 100vw"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
