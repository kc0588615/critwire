import * as Sentry from '@sentry/nextjs'
import { PHASE_PRODUCTION_BUILD } from 'next/constants'

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Imported here so the Edge bundle never sees `process.exit`.
    const { checkEnvironment } = await import('./instrumentation-node')
    checkEnvironment()
  }
  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      enabled: Boolean(process.env.SENTRY_DSN),
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    })
  }
  // After Sentry, so a failed registration reaches it; never while `next build` collects page data.
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) {
    const { syncDiscordCommands } = await import('./lib/discord/commands')
    syncDiscordCommands()
  }
}

export const onRequestError = Sentry.captureRequestError
