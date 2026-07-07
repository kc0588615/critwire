type TurnstileResult = {
  success: boolean
  skipped: boolean
}

type TurnstileResponse = {
  success?: boolean
  'error-codes'?: string[]
}

/**
 * Cloudflare Turnstile verification for public forms. Local development
 * skips verification when TURNSTILE_SECRET_KEY is not configured.
 */
export const verifyTurnstile = async ({
  ip,
  token,
}: {
  ip?: null | string
  token?: null | string
}): Promise<TurnstileResult> => {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return { skipped: true, success: true }
  if (!token) return { skipped: false, success: false }

  const body = new FormData()
  body.set('secret', secret)
  body.set('response', token)
  if (ip && ip !== 'unknown') body.set('remoteip', ip)

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    body,
    method: 'POST',
  })

  if (!response.ok) return { skipped: false, success: false }

  const json = (await response.json().catch(() => null)) as TurnstileResponse | null
  return { skipped: false, success: json?.success === true }
}
