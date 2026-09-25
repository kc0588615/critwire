'use client'

import React, { useState } from 'react'

/**
 * Click-to-load video facade: no third-party iframe (YouTube/Vimeo)
 * touches the page until the visitor activates playback. The poster is
 * server-rendered and passed as children.
 */
export const TrailerLite: React.FC<{
  children?: React.ReactNode
  embedUrl: string
  title: string
}> = ({ children, embedUrl, title }) => {
  const [active, setActive] = useState(false)

  if (active) {
    const separator = embedUrl.includes('?') ? '&' : '?'
    return (
      <div className="fs-trailer-frame">
        <iframe
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="h-full w-full"
          referrerPolicy="strict-origin-when-cross-origin"
          src={`${embedUrl}${separator}autoplay=1`}
          title={title}
        />
      </div>
    )
  }

  return (
    <button
      aria-label={`Play video: ${title}`}
      className="fs-trailer-frame fs-trailer-poster group"
      onClick={() => setActive(true)}
      type="button"
    >
      {children}
      <span aria-hidden="true" className="fs-trailer-play">
        <svg fill="currentColor" height="28" viewBox="0 0 24 24" width="28">
          <path d="M8 5.14v13.72L19 12 8 5.14Z" />
        </svg>
      </span>
    </button>
  )
}
