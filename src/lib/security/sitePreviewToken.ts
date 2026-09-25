import crypto from 'crypto'

/**
 * Short-lived HMAC-signed tokens for the game-page draft preview route.
 * Signed with PAYLOAD_SECRET — no extra env var — and single-purpose:
 * they name one document and expire. The route re-checks the user's
 * access to that document before enabling Draft Mode, so the token
 * alone grants nothing.
 */

export type SitePreviewClaims = {
  exp: number
  gamePageId: number
}

const TOKEN_TTL_MS = 60 * 60 * 1000

const secret = (): string => {
  const value = process.env.PAYLOAD_SECRET
  if (!value) throw new Error('PAYLOAD_SECRET is required to sign preview tokens')
  return value
}

const signature = (payload: string): string =>
  crypto.createHmac('sha256', secret()).update(payload).digest('base64url')

export const signSitePreviewToken = (gamePageId: number): string => {
  const claims: SitePreviewClaims = { exp: Date.now() + TOKEN_TTL_MS, gamePageId }
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `${payload}.${signature(payload)}`
}

export const verifySitePreviewToken = (token: null | string | undefined): null | SitePreviewClaims => {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null

  const expected = signature(payload)
  const given = Buffer.from(sig)
  const wanted = Buffer.from(expected)
  if (given.length !== wanted.length || !crypto.timingSafeEqual(given, wanted)) return null

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as unknown
    if (
      typeof claims !== 'object' ||
      claims === null ||
      typeof (claims as SitePreviewClaims).exp !== 'number' ||
      typeof (claims as SitePreviewClaims).gamePageId !== 'number'
    ) {
      return null
    }
    if ((claims as SitePreviewClaims).exp < Date.now()) return null
    return claims as SitePreviewClaims
  } catch {
    return null
  }
}
