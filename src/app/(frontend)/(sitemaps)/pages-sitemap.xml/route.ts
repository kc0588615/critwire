import { getServerSideSitemap } from 'next-sitemap'
import { getPayload } from 'payload'
import config from '@payload-config'
import { unstable_cache } from 'next/cache'
import { portalPaths } from '@/lib/game-portal/paths'
import { SITE } from '@/lib/site'
import { shouldSkipBuildStaticGeneration } from '@/utilities/staticGeneration'

const getPagesSitemap = unstable_cache(
  async () => {
    const SITE_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'https://example.com'
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

    // `/` redirects to the site's game, so its hub's pages stand in for it;
    // CMS pages all live at `/<slug>`.
    const pages = (results.docs ?? [])
      .filter((page) => Boolean(page?.slug))
      .map((page) => ({
        loc: `${SITE_URL}/${page.slug}`,
        lastmod: page.updatedAt || dateFallback,
      }))

    const { feedback, hub, updates } = portalPaths(SITE.gameSlug)
    const site = [hub, updates, feedback].map((path) => ({ loc: `${SITE_URL}${path}`, lastmod: dateFallback }))

    return [...site, ...pages]
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
