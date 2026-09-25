/**
 * Maps a YouTube/Vimeo watch URL to its privacy-friendly embed URL.
 * Returns null for anything unrecognized — stored data is treated
 * defensively even though fields validate on save.
 */
export const getEmbedUrl = (raw: string): null | string => {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
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

/**
 * Payload text-field validator for optional YouTube/Vimeo video URLs.
 */
export const validateOptionalVideoUrl = (
  value: null | string | string[] | undefined,
): string | true => {
  if (value == null || value === '') return true
  if (typeof value !== 'string') return 'Must be a single URL.'
  return getEmbedUrl(value)
    ? true
    : 'Must be a YouTube or Vimeo video URL, e.g. https://youtu.be/abc123'
}
