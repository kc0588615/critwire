'use client'

import React, { useEffect, useRef } from 'react'

import { EMBED_PROTOCOL, postToHost } from '@/lib/embed/protocol'

/**
 * Wraps a widget and talks to the loader: it reports the content's height
 * on every change, so the frame grows and shrinks with it, and passes
 * Escape on, so the floating button's dialog closes from inside the frame.
 */
export const EmbedFrame: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(() => {
      postToHost({ critwire: EMBED_PROTOCOL, type: 'resize', height: element.getBoundingClientRect().height })
    })
    observer.observe(element)
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') postToHost({ critwire: EMBED_PROTOCOL, type: 'close' })
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      observer.disconnect()
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  return (
    <div className="cw-embed-frame" ref={ref}>
      {children}
    </div>
  )
}
