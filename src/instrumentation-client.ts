import * as Sentry from '@sentry/nextjs'

/**
 * An embed loads on every view of a studio's page, so there it reports
 * errors only: no traces and no session per load, which would spend
 * Sentry's quota on the studio's traffic.
 */
const isEmbed = /^\/g\/[^/]+\/embed\//.test(window.location.pathname)

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN),
  integrations: isEmbed
    ? (integrations) => integrations.filter((integration) => integration.name !== 'BrowserSession')
    : undefined,
  tracesSampleRate: isEmbed ? 0 : Number(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
