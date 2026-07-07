import type { Metadata } from 'next'

import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import React from 'react'

import '../(frontend)/globals.css'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      className={[GeistSans.variable, GeistMono.variable].join(' ')}
      lang="en"
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col">{children}</body>
    </html>
  )
}

export const metadata: Metadata = {
  title: 'Critwire',
}
