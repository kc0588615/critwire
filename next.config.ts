import { withPayload } from '@payloadcms/next/withPayload'
import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)
import { redirects } from './redirects'
import { EMBED_CACHE_CONTROL, LOADER_CACHE_CONTROL } from './src/lib/embed/cacheControl'

/**
 * The share images' face and its per-character fallback
 * (`src/lib/share/images.ts`), with their licences, which must travel
 * with every copy of the fonts.
 */
const SHARE_IMAGE_FONTS = [
  './src/lib/share/fonts/Nunito-Bold.ttf',
  './src/lib/share/fonts/OFL.txt',
  './src/lib/share/fonts/DejaVuSans.ttf',
  './src/lib/share/fonts/LICENSE',
]

const nextConfig: NextConfig = {
  // Required by the multi-stage Dockerfile (copies .next/standalone).
  output: 'standalone',
  experimental: {
    // On-demand ISR stores every path it renders, 404s for made-up slugs
    // included. Keep that cache in Next's memory LRU (cacheMaxMemorySize,
    // 50 MB), which evicts; on disk, anyone could grow it without bound.
    isrFlushToDisk: false,
    // cw's tokens are light-dark() pairs that each surface's color-scheme
    // resolves where they're used. For the default targets Lightning CSS
    // would rewrite them into variables fixed at :root, and invalid
    // wherever no color-scheme is declared. Tailwind excludes it the same way.
    lightningCssFeatures: { exclude: ['light-dark'] },
  },
  // Temporarily required on Windows until Next.js fixes Turbopack Sass resolution.
  // See: https://github.com/vercel/next.js/issues/86431
  sassOptions: {
    loadPaths: ['./node_modules/@payloadcms/ui/dist/scss/'],
  },
  images: {
    // Media files are only served from /api/media/file/, which checks
    // access on every request. The optimizer would fetch them anonymously
    // and keep copies for hours, past a suspension or a hold.
    unoptimized: true,
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  // The share images read their fonts from disk at runtime, and the legal
  // pages, the boot check and the acceptance check read legal/*.md, so the
  // standalone output must carry them (keys are route globs; `[` would be
  // a glob class). Nunito-ExtraBold.ttf is only for `pnpm generate:brand`
  // and is never traced.
  outputFileTracingIncludes: {
    '/**': ['./legal/*.md'],
    '/buttons/*': SHARE_IMAGE_FONTS,
    '/g/*/badge.svg': SHARE_IMAGE_FONTS,
    '/g/*/badge.png': SHARE_IMAGE_FONTS,
  },
  // The app owns its framing policy and COOP, on every response (nginx must
  // not set either; tests/int/nginx-headers checks). 'self' keeps admin live
  // preview working. When entries match the same path and key, Next sends
  // the last one, so the embeds and the item pages are exempted by later
  // entries.
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
        { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
      ],
    },
    // The two widgets: any site may frame them, and every cache in front
    // keeps them 5 minutes at most in total. Next keeps a Cache-Control set
    // here, on dynamic pages too (E2E asserts the exact value).
    {
      source: '/g/:game/embed/:widget',
      headers: [
        { key: 'Content-Security-Policy', value: 'frame-ancestors *' },
        { key: 'Cache-Control', value: EMBED_CACHE_CONTROL },
      ],
    },
    // Feedback item pages keep their opener, so the embed's vote popup can
    // report back: a popup opened from a cross-site frame that lands on a
    // same-origin-allow-popups page loses `window.opener`...
    { source: '/g/:game/feedback/:slug', headers: [{ key: 'Cross-Origin-Opener-Policy', value: 'unsafe-none' }] },
    // ...but the form, which the entry above also matches, doesn't.
    {
      source: '/g/:game/feedback/new',
      headers: [{ key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' }],
    },
    // The loader is a contract: cached for a day, at the edge and in browsers.
    { source: '/embed/v1.js', headers: [{ key: 'Cache-Control', value: LOADER_CACHE_CONTROL }] },
    // A face's file name carries its family, subset and weight, and a new face is a new name.
    { source: '/fonts/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }] },
  ],
  reactStrictMode: true,
  redirects,
  turbopack: {
    root: path.resolve(dirname),
  },
}

export default withSentryConfig(withPayload(nextConfig, { devBundleServerPackages: false }), {
  // Source-map upload only happens when SENTRY_AUTH_TOKEN is set (CI/deploy).
  disableLogger: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  telemetry: false,
  widenClientFileUpload: true,
})
