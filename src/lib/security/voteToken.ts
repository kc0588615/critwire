import { createHash, createHmac, randomBytes, timingSafeEqual } from 'crypto'

/**
 * Anonymous voting identity: a random token issued as a signed,
 * httpOnly cookie. Only the SHA-256 of the token is stored in the
 * database, so a DB leak cannot be replayed as vote cookies.
 */

export const VOTE_TOKEN_COOKIE = 'cw_vote_token'
export const VOTE_TOKEN_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

const getSecret = (): string => {
  const secret = process.env.PAYLOAD_SECRET
  if (!secret) throw new Error('PAYLOAD_SECRET is required for vote token signing')
  return secret
}

const sign = (token: string): string =>
  createHmac('sha256', getSecret()).update(`vote-token:${token}`).digest('hex')

export const createVoteToken = (): string => {
  const token = randomBytes(32).toString('hex')
  return `${token}.${sign(token)}`
}

/**
 * Returns the raw token when the cookie value is well-formed and its
 * signature verifies; null otherwise.
 */
export const verifyVoteToken = (cookieValue: null | string | undefined): null | string => {
  if (!cookieValue) return null
  const [token, signature] = cookieValue.split('.')
  if (!token || !signature || !/^[0-9a-f]{64}$/.test(token)) return null

  const expected = Buffer.from(sign(token), 'hex')
  const provided = Buffer.from(signature, 'hex')
  if (provided.length !== expected.length || !timingSafeEqual(expected, provided)) {
    return null
  }
  return token
}

export const hashVoteToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex')
