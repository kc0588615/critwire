import { createHash, randomBytes } from 'crypto'

import { sign, verifySignature } from '@/lib/security/sign'

/**
 * Anonymous voting identity: a random token issued as a signed,
 * httpOnly cookie. Only the SHA-256 of the token is stored in the
 * database, so a DB leak cannot be replayed as vote cookies.
 */

export const VOTE_TOKEN_COOKIE = 'cw_vote_token'
export const VOTE_TOKEN_MAX_AGE = 60 * 60 * 24 * 365 // 1 year

const PURPOSE = 'vote-token'

export const createVoteToken = (): string => {
  const token = randomBytes(32).toString('hex')
  return `${token}.${sign(PURPOSE, token)}`
}

/**
 * Returns the raw token when the cookie value is well-formed and its
 * signature verifies; null otherwise.
 */
export const verifyVoteToken = (cookieValue: null | string | undefined): null | string => {
  if (!cookieValue) return null
  const [token, signature] = cookieValue.split('.')
  if (!token || !signature || !/^[0-9a-f]{64}$/.test(token)) return null

  return verifySignature(PURPOSE, token, signature) ? token : null
}

export const hashVoteToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex')
