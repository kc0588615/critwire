import { withPayload } from '@payloadcms/next/withPayload'
import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)
import { redirects } from './redirects'

const nextConfig: NextConfig = {
  // Required by the multi-stage Dockerfile (copies .next/standalone).
  output: 'standalone',
  experimental: {
    // On-demand ISR stores every path it renders, 404s for made-up slugs
    // included. Keep that cache in Next's memory LRU (cacheMaxMemorySize,
    // 50 MB), which evicts; on disk, anyone could grow it without bound.
    isrFlushToDisk: false,
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
  // The share images read their font from disk at runtime, so the standalone
  // output must carry it (keys are route globs; `[` would be a glob class).
  outputFileTracingIncludes: {
    '/buttons/*': ['./src/lib/share/fonts/DejaVuSans.ttf'],
    '/g/*/badge.svg': ['./src/lib/share/fonts/DejaVuSans.ttf'],
    '/g/*/badge.png': ['./src/lib/share/fonts/DejaVuSans.ttf'],
  },
  // The app owns its framing policy, on every response (nginx must not set
  // one; tests/int/nginx-headers checks). 'self' keeps admin live preview
  // working. To let a route be framed elsewhere, append a later entry for
  // it with its own `frame-ancestors`: when entries match the same path
  // and key, Next sends the last one.
  headers: async () => [
    { source: '/:path*', headers: [{ key: 'Content-Security-Policy', value: "frame-ancestors 'self'" }] },
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
