'use client'

import React, { useEffect, useState } from 'react'

/**
 * Overlay-to-solid sticky header: transparent over the hero, gains the
 * theme surface + border once the page scrolls. Pure presentation —
 * links are server-rendered children.
 */
export const NavShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = (): void => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="fs-nav" data-scrolled={scrolled || undefined}>
      {children}
    </header>
  )
}
