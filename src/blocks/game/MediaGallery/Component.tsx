import React from 'react'

import type { MediaGalleryBlock } from '@/payload-types'

import { Media } from '@/components/Media'

export const MediaGalleryComponent: React.FC<MediaGalleryBlock> = ({ heading, items }) => {
  if (!items?.length) return null

  return (
    <section className="mx-auto max-w-6xl px-6">
      {heading && <h2 className="mb-10 text-center text-3xl font-bold">{heading}</h2>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <figure key={item.id ?? i}>
            {typeof item.image === 'object' && (
              <Media
                imgClassName="aspect-video w-full rounded-md object-cover"
                resource={item.image}
              />
            )}
            {item.caption && (
              <figcaption className="mt-2 text-sm opacity-70">{item.caption}</figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  )
}
