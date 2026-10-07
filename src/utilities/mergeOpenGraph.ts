import type { Metadata } from 'next'

import { HOME_TITLE } from '@/components/marketing/copy'

import { getServerSideURL } from './getURL'

/** Critwire's default share image, drawn by `pnpm generate:brand`, for any page without its own. */
export const DEFAULT_OG_IMAGE = {
  alt: `critwire: ${HOME_TITLE}`,
  height: 630,
  url: `${getServerSideURL()}/og.png`,
  width: 1200,
} as const

const defaultOpenGraph: Metadata['openGraph'] = {
  type: 'website',
  description:
    'Critwire adds a player feedback board and updates with RSS to the website your indie game already has.',
  images: [DEFAULT_OG_IMAGE],
  siteName: 'Critwire',
  title: 'Critwire',
}

export const mergeOpenGraph = (og?: Metadata['openGraph']): Metadata['openGraph'] => {
  return {
    ...defaultOpenGraph,
    ...og,
    images: og?.images ? og.images : defaultOpenGraph.images,
  }
}
