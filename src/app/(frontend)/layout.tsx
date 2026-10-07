import type { Metadata } from 'next'

import { bodyFont, critwireFont, cwFontVariables } from '@/fonts'
import { cn } from '@/utilities/ui'
import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { mergeOpenGraph } from '@/utilities/mergeOpenGraph'
import { draftMode } from 'next/headers'

import './globals.css'
import { getServerSideURL } from '@/utilities/getURL'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()

  return (
    <html className={cn(cwFontVariables, bodyFont.variable, critwireFont.variable)} lang="en">
      <head>
        <link href="/favicon.ico" rel="icon" sizes="32x32" />
        <link href="/favicon.svg" rel="icon" type="image/svg+xml" />
      </head>
      <body className="cw-root">
        <AdminBar
          adminBarProps={{
            preview: isEnabled,
          }}
        />

        <Header />
        <main className="cw-main">{children}</main>
        <Footer />
      </body>
    </html>
  )
}

export const metadata: Metadata = {
  description:
    'Critwire adds a player feedback board and updates with RSS to the website your indie game already has.',
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
