import React from 'react'

import type { GallerySlot } from '../../schema/slots'
import type { SiteRenderContext } from '../context'
import { SectionHeader, SiteMedia } from '../ui'

type GalleryItem = GallerySlot['items'][number]

/** Screenshots, untouched; each caption sits below its image, never over it. */
export const GallerySection: React.FC<{ ctx: SiteRenderContext; value: GallerySlot }> = ({
  ctx,
  value,
}) => {
  if (value.items.length === 0) return null
  const heading = value.heading ?? 'Screenshots'

  const figure = (
    item: GalleryItem,
    index: number,
    size: string,
    className = '',
  ): React.ReactNode => (
    <figure className={`fs-figure ${className}`} key={index}>
      <div className="fs-media-frame fs-figure-frame">
        <SiteMedia
          alt={item.alt}
          ctx={ctx}
          fill
          id={item.media}
          imgClassName="object-cover"
          size={size}
        />
      </div>
      {item.caption ? <figcaption className="fs-meta mt-2">{item.caption}</figcaption> : null}
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
        <div aria-label={heading} className="fs-scroll-row" role="region" tabIndex={0}>
          {value.items.map((item, index) => figure(item, index, '85vw', `shrink-0 ${slide}`))}
        </div>
      )
      break
    }
    case 'twoColumn':
      body = (
        <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2">
          {value.items.map((item, index) => figure(item, index, '(min-width: 640px) 50vw, 100vw'))}
        </div>
      )
      break
    case 'editorialMosaic':
    default:
      // Every fifth image leads at two columns wide; the rest fill in beside it.
      body = (
        <div className="fs-mosaic">
          {value.items.map((item, index) =>
            index % 5 === 0
              ? figure(item, index, '(min-width: 1024px) 66vw, 100vw', 'fs-mosaic-lead')
              : figure(item, index, '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'),
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
