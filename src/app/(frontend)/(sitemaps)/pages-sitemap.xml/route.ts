import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { shouldSkipBuildStaticGeneration } from '@/utilities/staticGeneration'

const getPagesSitemap = unstable_cache(
  async () => {
    const SITE_URL =
      process.env.NEXT_PUBLIC_SERVER_URL ||
      process.env.VERCEL_PROJECT_PRODUCTION_URL ||
      'https://example.com'
    const dateFallback = new Date().toISOString()

    if (shouldSkipBuildStaticGeneration) return []

    const payload = await getPayload({ config })

    const results = await payload.find({
      collection: 'pages',
      overrideAccess: false,
      draft: false,
      depth: 0,
      limit: 1000,
      pagination: false,
      where: {
        _status: {
          equals: 'published',
        },
      },
      select: {
        slug: true,
        updatedAt: true,
      },
    })

    // `/` is the fixed marketing home; CMS pages all live at `/<slug>`.
    const pages = (results.docs ?? [])
      .filter((page) => Boolean(page?.slug))
      .map((page) => ({
        loc: `${SITE_URL}/${page.slug}`,
        lastmod: page.updatedAt || dateFallback,
      }))

    return [{ loc: `${SITE_URL}/`, lastmod: dateFallback }, ...pages]
  },
  ['pages-sitemap'],
  {
    tags: ['pages-sitemap'],
  },
)

export async function GET() {
  const sitemap = await getPagesSitemap()

  return getServerSideSitemap(sitemap)
}
