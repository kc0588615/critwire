import React from 'react'

import type { MediaGalleryBlock } from '@/payload-types'

import { Media } from '@/components/Media'

export const MediaGalleryComponent: React.FC<MediaGalleryBlock> = ({ heading, items }) => {
  if (!items?.length) return null

  return (
    <section className="fs-section">
      <div className="fs-shell">
        {heading && (
          <div className="fs-section-head">
            <h2 className="fs-h2">{heading}</h2>
          </div>
        )}
        <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <figure className="fs-figure" key={item.id ?? i}>
              {typeof item.image === 'object' && (
                <div className="fs-media-frame fs-figure-frame">
                  <Media
                    fill
                    imgClassName="object-cover"
                    resource={item.image}
                    size="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  />
                </div>
              )}
              {item.caption && <figcaption className="fs-meta mt-2">{item.caption}</figcaption>}
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
