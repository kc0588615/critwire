declare global {
  namespace NodeJS {
    interface ProcessEnv {
      PAYLOAD_SECRET: string
      DATABASE_URL: string
      NEXT_PUBLIC_SERVER_URL: string
      LOG_LEVEL?: string
      RESEND_API_KEY?: string
      RESEND_FROM_EMAIL?: string
      /** Development and E2E only: without Resend, also write each email here as JSON. */
      EMAIL_OUTBOX_DIR?: string
      NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string
      TURNSTILE_SECRET_KEY?: string
      UPSTASH_REDIS_REST_URL?: string
      UPSTASH_REDIS_REST_TOKEN?: string
      /** Hosted instances only: `1` opens signup and onboarding. Unset or empty to self-host; anything else stops boot. */
      CRITWIRE_OPEN_SIGNUP?: string
      /** Self-hosted only: `1` hides "Powered by Critwire". With open signup, or anything else, stops boot. */
      CRITWIRE_HIDE_POWERED_BY?: string
      /** Hosted-plan limits; unset or empty turns each off. Positive whole numbers only, checked at boot. */
      CRITWIRE_LIMIT_GAMES_PER_STUDIO?: string
      CRITWIRE_LIMIT_MEDIA_MB_PER_STUDIO?: string
      CRITWIRE_LIMIT_PUBLIC_FEEDBACK_PER_GAME?: string
      /** E2E only: lets a production build run without Upstash. Never set in production. */
      RATE_LIMIT_OPTIONAL?: string
      /** E2E only: the one non-Discord origin a contact webhook may target. Never set in production. */
      DISCORD_WEBHOOK_TEST_ORIGIN?: string
      /** The Discord app: all three or none; none turns Discord off. Checked at boot. */
      DISCORD_APPLICATION_ID?: string
      DISCORD_PUBLIC_KEY?: string
      DISCORD_CLIENT_SECRET?: string
      /** Development and E2E only: a loopback stand-in for Discord's API. Checked at boot. */
      DISCORD_API_BASE_URL?: string
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}
