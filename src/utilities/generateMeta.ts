import type { Metadata } from 'next'

import type { Media, Page, Config } from '../payload-types'

import { mergeOpenGraph } from './mergeOpenGraph'
import { getServerSideURL } from './getURL'

/** The page's own share image, or undefined, so `mergeOpenGraph` applies the default. */
const getImageURL = (image?: Media | Config['db']['defaultIDType'] | null): string | undefined => {
  if (!image || typeof image !== 'object' || !image.url) return undefined
  return getServerSideURL() + (image.sizes?.og?.url || image.url)
}

export const generateMeta = async (args: {
  doc: Partial<Page> | null
}): Promise<Metadata> => {
  const { doc } = args

  const ogImage = getImageURL(doc?.meta?.image)

  const title = doc?.meta?.title
    ? doc?.meta?.title + ' | Critwire'
    : 'Critwire'

  return {
    description: doc?.meta?.description,
    openGraph: mergeOpenGraph({
      description: doc?.meta?.description || '',
      images: ogImage
        ? [
            {
              url: ogImage,
            },
          ]
        : undefined,
      title,
      url: Array.isArray(doc?.slug) ? doc?.slug.join('/') : '/',
    }),
    title,
  }
}
