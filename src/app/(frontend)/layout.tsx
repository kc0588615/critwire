import React from 'react'

import { AdminBar } from '@/components/AdminBar'
import { Footer } from '@/Footer/Component'
import { Header } from '@/Header/Component'
import { siteMetadata, siteViewport } from '@/utilities/siteMetadata'
import { draftMode } from 'next/headers'

import './globals.css'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { isEnabled } = await draftMode()

  return (
    <html lang="en">
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

export const metadata = siteMetadata

// `.cw-root` in site.css sets the same `color-scheme` for its own colours.
export const viewport = siteViewport
