import React from 'react'

import type { FeaturesSlot } from '../../schema/slots'
import type { SiteRenderContext } from '../context'
import { SectionHeader, SiteMedia } from '../ui'

export const FeaturesSection: React.FC<{ ctx: SiteRenderContext; value: FeaturesSlot }> = ({
  ctx,
  value,
}) => {
  if (value.items.length === 0) return null
  const heading = value.heading ?? 'Core Features'

  const media = (id: null | number, alt: string): React.ReactNode =>
    typeof id === 'number' ? (
      <div className="fs-media-frame">
        <SiteMedia
          alt={alt}
          ctx={ctx}
          id={id}
          imgClassName="w-full object-cover"
          size="(min-width: 1024px) 33vw, 100vw"
        />
      </div>
    ) : null

  let body: React.ReactNode

  switch (value.variant) {
    case 'editorialThree':
      body = (
        <div className="grid gap-10 md:grid-cols-3">
          {value.items.map((item, index) => (
            <div className="border-t border-[var(--fs-border)] pt-6" key={index}>
              <h3 className="fs-h3">{item.title}</h3>
              <p className="mt-3 leading-7 text-[var(--fs-muted-fg)]">{item.body}</p>
            </div>
          ))}
        </div>
      )
      break
    case 'alternating':
      body = (
        <div className="space-y-14">
          {value.items.map((item, index) => (
            <div
              className={`grid items-center gap-8 lg:grid-cols-2 ${
                index % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''
              }`}
              key={index}
            >
              <div>
                <h3 className="fs-h3">{item.title}</h3>
                <p className="mt-4 text-lg leading-8 text-[var(--fs-muted-fg)]">{item.body}</p>
              </div>
              {media(item.media, item.title)}
            </div>
          ))}
        </div>
      )
      break
    case 'featurePlusTwo': {
      const [first, ...rest] = value.items
      body = (
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="fs-panel p-7 sm:p-9">
            <h3 className="fs-h3">{first.title}</h3>
            <p className="mt-4 text-lg leading-8 text-[var(--fs-muted-fg)]">{first.body}</p>
            {media(first.media, first.title)}
          </div>
          <div className="grid gap-5">
            {rest.slice(0, 2).map((item, index) => (
              <div className="fs-panel p-6" key={index}>
                <h3 className="fs-h3">{item.title}</h3>
                <p className="mt-3 leading-7 text-[var(--fs-muted-fg)]">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      )
      break
    }
    case 'cardGrid':
    default:
      body = (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {value.items.map((item, index) => (
            <div className="fs-panel overflow-hidden" key={index}>
              {media(item.media, item.title)}
              <div className="p-6">
                <h3 className="fs-h3">{item.title}</h3>
                <p className="mt-3 leading-7 text-[var(--fs-muted-fg)]">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      )
  }

  return (
    <section aria-labelledby="fs-features-heading" className="fs-section">
      <div className="fs-shell">
        <SectionHeader heading={heading} id="fs-features-heading" />
        {value.intro ? (
          <p className="-mt-6 mb-10 max-w-2xl text-lg leading-8 text-[var(--fs-muted-fg)]">
            {value.intro}
          </p>
        ) : null}
        {body}
      </div>
    </section>
  )
}
