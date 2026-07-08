import type { Metadata } from 'next'

import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import React from 'react'

import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { getServerSideURL } from '@/utilities/getURL'

import '../(frontend)/globals.css'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      className={[GeistSans.variable, GeistMono.variable].join(' ')}
      lang="en"
      suppressHydrationWarning
    >
      <body className="flex min-h-screen flex-col">
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  description:
    'Hosted public portals for indie games: official pages, patch notes, known issues, player reports, and contact routing.',
  metadataBase: new URL(getServerSideURL()),
  openGraph: mergeOpenGraph(),
  title: {
    default: 'Critwire',
    template: '%s | Critwire',
  },
  twitter: {
    card: 'summary_large_image',
  },
}
