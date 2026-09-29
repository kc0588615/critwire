import React from 'react'

import type { TrailerEmbedBlock } from '@/payload-types'

import { getEmbedUrl } from '@/lib/validation/video'

export const TrailerEmbedComponent: React.FC<TrailerEmbedBlock> = ({ heading, url }) => {
  const embedUrl = getEmbedUrl(url)
  if (!embedUrl) return null

  return (
    <section className="fs-section">
      <div className="fs-shell">
        {heading && (
          <div className="fs-section-head">
            <h2 className="fs-h2">{heading}</h2>
          </div>
        )}
        <div className="fs-column-wide fs-trailer-frame">
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
      </div>
    </section>
  )
}
