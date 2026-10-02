import { isRefSource, type RefSource } from '@/lib/share/platforms'
import { getRedis } from '@/lib/upstash/redis'

/**
 * "Where players come from": arrivals at kit links tagged `?ref=`,
 * counted per game, per UTC day and per source. Upstash only, never
 * Postgres, so a page view never writes to the database. Only counts are
 * stored: one hash per game and day, `referrals:<gameID>:<YYYY-MM-DD>`,
 * with a field per source. Keys use the game's ID, so a renamed game keeps
 * its history and a reused slug starts from zero.
 */

/** 30 full days plus today stay readable; each hit resets the TTL. */
const KEY_TTL_SECONDS = 35 * 24 * 60 * 60
const DAY_MS = 24 * 60 * 60 * 1000

const utcDay = (date: Date): string => date.toISOString().slice(0, 10)
const dayKey = (gameID: number, day: string): string => `referrals:${gameID}:${day}`

export type ReferralDay = {
  /** `YYYY-MM-DD`, UTC. */
  day: string
  counts: Partial<Record<RefSource, number>>
}

/** Off without Upstash, as on a self-hosted instance that hasn't set it up. */
export const isReferralCounterOn = (): boolean => getRedis() !== null

const requireRedis = () => {
  const redis = getRedis()
  if (!redis) throw new Error('The referral counter needs Upstash Redis, which is not configured.')
  return redis
}

/** Counts one arrival from `source` at `gameID` today (UTC). */
export const recordReferral = async (gameID: number, source: RefSource): Promise<void> => {
  const key = dayKey(gameID, utcDay(new Date()))
  await requireRedis().multi().hincrby(key, source, 1).expire(key, KEY_TTL_SECONDS).exec()
}

/** The last `days` UTC days, today included, newest first; a day with no arrivals has empty counts. */
export const readReferrals = async (gameID: number, days = 30): Promise<ReferralDay[]> => {
  const now = Date.now()
  const dayList = Array.from({ length: days }, (_, i) => utcDay(new Date(now - i * DAY_MS)))

  const pipeline = requireRedis().pipeline()
  for (const day of dayList) pipeline.hgetall(dayKey(gameID, day))
  const hashes = await pipeline.exec<(null | Record<string, unknown>)[]>()

  return dayList.map((day, i) => {
    const counts: ReferralDay['counts'] = {}
    for (const [source, value] of Object.entries(hashes[i] ?? {})) {
      const count = Number(value)
      if (isRefSource(source) && Number.isSafeInteger(count) && count > 0) counts[source] = count
    }
    return { day, counts }
  })
}
