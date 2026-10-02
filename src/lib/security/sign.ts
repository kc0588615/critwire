import { createHmac, timingSafeEqual } from 'crypto'

/**
 * HMAC-SHA256 signatures keyed by PAYLOAD_SECRET. The purpose prefixes the
 * signed value, so a signature made for one use never verifies for another.
 */

const getSecret = (): string => {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) throw new Error('PAYLOAD_SECRET is required for signing')
  return secret
}

export const sign = (purpose: string, value: string): string =>
  createHmac('sha256', getSecret()).update(`${purpose}:${value}`).digest('hex')

/** Timing-safe check of a hex signature made by `sign` with the same purpose. */
export const verifySignature = (purpose: string, value: string, signature: string): boolean => {
  const expected = Buffer.from(sign(purpose, value), 'hex')
  const provided = Buffer.from(signature, 'hex')
  return provided.length === expected.length && timingSafeEqual(expected, provided)
}
