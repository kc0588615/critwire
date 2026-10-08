import type { Metadata } from 'next'

import { SITE } from '@/lib/site'

import { getServerSideURL } from './getURL'

/** The site's default share image, drawn by `pnpm generate:brand`, for any page without its own. */
export const DEFAULT_OG_IMAGE = {
  alt: SITE.name,
  height: 630,
  url: `${getServerSideURL()}/og.png`,
  width: 1200,
} as const

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description: SITE.description,
  images: [DEFAULT_OG_IMAGE],
  siteName: SITE.name,
  title: SITE.name,
}

export const mergeOpenGraph = (og?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
