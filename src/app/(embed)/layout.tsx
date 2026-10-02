import type { Metadata } from 'next'

import React from 'react'

import { EMBED_BOOT_SCRIPT } from '@/lib/embed/boot'

import '../(frontend)/globals.css'
import './embed.css'

/**
 * The root of every embed document: no portal chrome and no web font, so
 * a widget on a studio's site downloads no font file and sizes to its
 * content. The boot script runs before first paint (it sets the mode and
 * the host's font), so it's a plain inline script in `<head>`.
 */
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: EMBED_BOOT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  )
}

export const metadata: Metadata = {
  robots: { index: false },
  title: 'Critwire',
}
