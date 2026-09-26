import React from 'react'

/**
 * Cloudflare Turnstile widget for native public forms. It adds a
 * `cf-turnstile-response` field to the form; without a site key
 * (local development) an empty token is sent instead.
 */
export const TurnstileField: React.FC = () => {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  if (!siteKey) return <input name="turnstileToken" type="hidden" value="" />

  return (
    <>
      <script async defer src="https://challenges.cloudflare.com/turnstile/v0/api.js" />
      <div className="cf-turnstile" data-sitekey={siteKey} />
    </>
  )
}
