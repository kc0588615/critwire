declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PAYLOAD_SECRET: string
      DATABASE_URL: string
      NEXT_PUBLIC_SERVER_URL: string
      VERCEL_PROJECT_PRODUCTION_URL: string
      LOG_LEVEL?: string
      RESEND_API_KEY?: string
      RESEND_FROM_EMAIL?: string
      /** Development and E2E only: without Resend, also write each email here as JSON. */
      EMAIL_OUTBOX_DIR?: string
      NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string
      TURNSTILE_SECRET_KEY?: string
      UPSTASH_REDIS_REST_URL?: string
      UPSTASH_REDIS_REST_TOKEN?: string
      /** The home page's Contact link, a mailto: or https: URL; unset hides it. Checked at boot. */
      CRITWIRE_CONTACT_URL?: string
      /** Hosted instances only: `1` opens signup and onboarding. Unset or empty to self-host; anything else stops boot. */
      CRITWIRE_OPEN_SIGNUP?: string
      /** Hosted-plan limits; unset or empty turns each off. Positive whole numbers only, checked at boot. */
      CRITWIRE_LIMIT_GAMES_PER_STUDIO?: string
      CRITWIRE_LIMIT_MEDIA_MB_PER_STUDIO?: string
      CRITWIRE_LIMIT_PUBLIC_FEEDBACK_PER_GAME?: string
      /** E2E only: lets a production build run without Upstash. Never set in production. */
      RATE_LIMIT_OPTIONAL?: string
      /** E2E only: the one non-Discord origin a contact webhook may target. Never set in production. */
      DISCORD_WEBHOOK_TEST_ORIGIN?: string
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}
