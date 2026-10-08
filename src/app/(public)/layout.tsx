import { NuqsAdapter } from 'nuqs/adapters/next/app'
import React from 'react'

import { siteMetadata, siteViewport } from '@/utilities/siteMetadata'

import '../(frontend)/globals.css'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <NuqsAdapter>{children}</NuqsAdapter>
      </body>
    </html>
  )
}

export const metadata = siteMetadata

export const viewport = siteViewport
