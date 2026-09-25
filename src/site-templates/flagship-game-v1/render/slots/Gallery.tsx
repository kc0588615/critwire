import React from 'react'

import type { GallerySlot } from '../../schema/slots'
import type { SiteRenderContext } from '../context'
import { SectionHeader, SiteMedia } from '../ui'

export const GallerySection: React.FC<{ ctx: SiteRenderContext; value: GallerySlot }> = ({
  ctx,
  value,
}) => {
  if (value.items.length === 0) return null
  const heading = value.heading ?? 'Screenshots'

  const figure = (
    item: GallerySlot['items'][number],
    index: number,
    className = '',
    size = '(min-width: 1024px) 50vw, 100vw',
  ): React.ReactNode => (
    <figure className={`fs-media-frame relative m-0 ${className}`} key={index}>
      <SiteMedia
        alt={item.alt}
        ctx={ctx}
        fill
        id={item.media}
        imgClassName="object-cover"
        size={size}
      />
      {item.caption ? <figcaption className="fs-caption">{item.caption}</figcaption> : null}
    </figure>
  )

  let body: React.ReactNode

  switch (value.variant) {
    case 'horizontalStrip':
    case 'carousel': {
      const slide =
        value.variant === 'carousel'
          ? 'w-[min(85%,52rem)] snap-center'
          : 'w-[min(70%,26rem)] snap-start'
      body = (
        <div
          aria-label={heading}
          className="fs-scroll-row -mx-4 flex gap-4 overflow-x-auto px-4 pb-4"
          role="region"
          tabIndex={0}
        >
          {value.items.map((item, index) =>
            figure(item, index, `aspect-video shrink-0 ${slide}`, '85vw'),
          )}
        </div>
      )
      break
    }
    case 'twoColumn':
      body = (
        <div className="grid gap-5 sm:grid-cols-2">
          {value.items.map((item, index) => figure(item, index, 'aspect-video'))}
        </div>
      )
      break
    case 'editorialMosaic':
    default:
      body = (
        <div className="grid auto-rows-[10rem] gap-4 sm:auto-rows-[12rem] sm:grid-cols-4">
          {value.items.map((item, index) =>
            figure(
              item,
              index,
              index % 5 === 0 ? 'sm:col-span-2 sm:row-span-2' : 'sm:col-span-2 lg:col-span-1',
              '(min-width: 1024px) 25vw, 50vw',
            ),
          )}
        </div>
      )
  }

  return (
    <section aria-labelledby="fs-gallery-heading" className="fs-section">
      <div className="fs-shell">
        <SectionHeader heading={heading} id="fs-gallery-heading" />
        {body}
      </div>
    </section>
  )
}
