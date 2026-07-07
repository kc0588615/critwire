import { Redis } from '@upstash/redis'

let redis: null | Redis = null

/**
 * Shared Upstash Redis client. Returns null when Upstash is not
 * configured (local dev) — callers must degrade gracefully.
 */
export const getRedis = (): null | Redis => {
  if (redis) return redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  redis = new Redis({ token, url })
  return redis
}
