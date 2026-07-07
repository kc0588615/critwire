import React from 'react'

import type { TrailerEmbedBlock } from '@/payload-types'

/**
 * Maps a YouTube/Vimeo watch URL to its privacy-friendly embed URL.
 * Returns null for anything unrecognized (the block validates on save,
 * but stored data is still treated defensively).
 */
export const getEmbedUrl = (raw: string): null | string => {
  try {
    const url = new URL(raw)
    const host = url.hostname.replace(/^www\./, '')

    if (host === 'youtu.be') {
      const id = url.pathname.slice(1).split('/')[0]
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (url.pathname === '/watch') {
        const id = url.searchParams.get('v')
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
      }
      const parts = url.pathname.split('/')
      if (parts[1] === 'embed' || parts[1] === 'shorts') {
        return parts[2] ? `https://www.youtube-nocookie.com/embed/${parts[2]}` : null
      }
      return null
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const id = url.pathname.split('/').find((part) => /^\d+$/.test(part))
      return id ? `https://player.vimeo.com/video/${id}` : null
    }
    return null
  } catch {
    return null
  }
}

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
