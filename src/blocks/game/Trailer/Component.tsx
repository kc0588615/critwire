import React from 'react'

import type { TrailerEmbedBlock } from '@/payload-types'

import { getEmbedUrl } from '@/lib/validation/video'

export const TrailerEmbedComponent: React.FC<TrailerEmbedBlock> = ({ heading, url }) => {
  const embedUrl = getEmbedUrl(url)
  if (!embedUrl) return null

  return (
    <section className="mx-auto max-w-4xl px-6">
      {heading && <h2 className="mb-10 text-center text-3xl font-bold">{heading}</h2>}
      <div className="aspect-video overflow-hidden rounded-lg">
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="h-full w-full"
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          src={embedUrl}
          title={heading || 'Trailer'}
        />
      </div>
    </section>
  )
}
