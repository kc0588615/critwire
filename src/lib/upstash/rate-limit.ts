import { Ratelimit } from '@upstash/ratelimit'

import { getRedis } from './redis'

const limiters = new Map<string, Ratelimit>()

type RateLimitArgs = {
  /** Usually the client IP. */
  identifier: string
  /** Namespace, e.g. 'contact-form', 'issue-vote'. */
  key: string
  /** Max requests per window. */
  limit: number
  /** Window length in seconds. */
  windowSeconds: number
}

/**
 * Sliding-window rate limit backed by Upstash. Fails open when Upstash
 * is not configured so local dev works without credentials. Production
 * throws instead, unless RATE_LIMIT_OPTIONAL=1 (E2E builds only: there
 * is no local Upstash to run them against).
 */
export const checkRateLimit = async ({
  identifier,
  key,
  limit,
  windowSeconds,
}: RateLimitArgs): Promise<{ success: boolean }> => {
  const redis = getRedis()
  if (!redis) {
    if (process.env.NODE_ENV === 'production' && process.env.RATE_LIMIT_OPTIONAL !== '1') {
      throw new Error('Upstash is not configured; refusing rate-limited requests')
    }
    return { success: true }
  }

  const cacheKey = `${key}:${limit}:${windowSeconds}`
  let limiter = limiters.get(cacheKey)
  if (!limiter) {
    limiter = new Ratelimit({
      limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
      prefix: `ratelimit:${key}`,
      redis,
    })
    limiters.set(cacheKey, limiter)
  }

  const { success } = await limiter.limit(identifier)
  return { success }
}
