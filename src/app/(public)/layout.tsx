import type { Metadata } from 'next'

import { NuqsAdapter } from 'nuqs/adapters/next/app'
import React from 'react'

import { cwFontVariables } from '@/fonts'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { getServerSideURL } from '@/utilities/getURL'

import '../(frontend)/globals.css'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html className={cwFontVariables} lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  description:
    'Player feedback and updates for indie games: bug reports and ideas with voting, and updates with RSS.',
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
