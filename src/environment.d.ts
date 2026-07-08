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
      NEXT_PUBLIC_TURNSTILE_SITE_KEY?: string
      TURNSTILE_SECRET_KEY?: string
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {}
