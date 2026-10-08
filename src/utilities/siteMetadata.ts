import type { Metadata, Viewport } from 'next'

import { SITE } from '@/lib/site'
import { TOKENS } from '@/lib/theme/tokens'

import { getServerSideURL } from './getURL'
import { mergeOpenGraph } from './mergeOpenGraph'

/**
 * The head every page shares, critwire's own pages and the portals alike
 * (D25): the site's name in titles, its icons, its share defaults. A page
 * that already names its game sets `title: { absolute }`.
 */
export const siteMetadata: Metadata = {
  description: SITE.description,
  icons: {
    apple: '/apple-touch-icon.png',
    icon: [
      { type: 'image/svg+xml', url: '/favicon.svg' },
      { sizes: '16x16 32x32 48x48', url: '/favicon.ico' },
    ],
  },
  metadataBase: new URL(getServerSideURL()),
  openGraph: mergeOpenGraph(),
  title: {
    default: SITE.name,
    template: `%s | ${SITE.name}`,
  },
  twitter: {
    card: 'summary_large_image',
  },
}

/**
 * Pages follow the visitor's system setting, with no toggle, and the
 * browser's own chrome takes n1 in each mode, as play.critterconnect.org
 * sets it.
 */
export const siteViewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { color: TOKENS.light.neutral[1], media: '(prefers-color-scheme: light)' },
    { color: TOKENS.dark.neutral[1], media: '(prefers-color-scheme: dark)' },
  ],
}
