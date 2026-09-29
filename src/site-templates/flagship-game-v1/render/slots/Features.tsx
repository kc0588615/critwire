import React from 'react'

import type { FeaturesSlot } from '../../schema/slots'
import type { SiteRenderContext } from '../context'
import { SectionHeader, SiteMedia } from '../ui'

type FeatureItem = FeaturesSlot['items'][number]

/**
 * Flat features: no panels or shadows. An item becomes a card (framed
 * media above its text) only when it carries media.
 */
export const FeaturesSection: React.FC<{ ctx: SiteRenderContext; value: FeaturesSlot }> = ({
  ctx,
  value,
}) => {
  if (value.items.length === 0) return null

  const media = (item: FeatureItem, size: string): React.ReactNode =>
    typeof item.media === 'number' && ctx.media.has(item.media) ? (
      <div className="fs-media-frame fs-feature-media">
        <SiteMedia
          alt={item.title}
          ctx={ctx}
          fill
          id={item.media}
          imgClassName="object-cover"
          size={size}
        />
      </div>
    ) : null

  const text = (item: FeatureItem, lead = false): React.ReactNode => (
    <>
      <h3 className="fs-h3">{item.title}</h3>
      <p className={`${lead ? 'fs-lead' : 'fs-body'} mt-2 text-[var(--fs-muted-fg)]`}>
        {item.body}
      </p>
    </>
  )

  let body: React.ReactNode

  switch (value.variant) {
    case 'editorialThree':
      body = (
        <ul className="fs-feature-columns">
          {value.items.map((item, index) => (
            <li key={index}>{text(item)}</li>
          ))}
        </ul>
      )
      break
    case 'alternating':
      body = (
        <ul className="fs-feature-alternating">
          {value.items.map((item, index) => (
            <li className="fs-feature-row" key={index}>
              <div>{text(item, true)}</div>
              {media(item, '(min-width: 1024px) 50vw, 100vw')}
            </li>
          ))}
        </ul>
      )
      break
    case 'featurePlusTwo': {
      const [first, ...rest] = value.items
      body = (
        <div className="fs-feature-lead-grid">
          <div className="fs-feature-card">
            {media(first, '(min-width: 1024px) 60vw, 100vw')}
            {text(first, true)}
          </div>
          {rest.length > 0 ? (
            <ul className="fs-rows">
              {rest.slice(0, 2).map((item, index) => (
                <li className="py-5 first:pt-0" key={index}>
                  {text(item)}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )
      break
    }
    case 'cardGrid':
    default:
      body = (
        <ul className="fs-feature-grid">
          {value.items.map((item, index) => (
            <li className="fs-feature-card" key={index}>
              {media(item, '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw')}
              {text(item)}
            </li>
          ))}
        </ul>
      )
  }

  return (
    <section aria-labelledby="fs-features-heading" className="fs-section">
      <div className="fs-shell">
        <SectionHeader
          heading={value.heading ?? 'Features'}
          id="fs-features-heading"
          intro={value.intro}
        />
        {body}
      </div>
    </section>
  )
}
