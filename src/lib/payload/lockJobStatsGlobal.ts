import type { SanitizedConfig } from 'payload'

import { superAdminOnly } from '@/access/isSuperAdmin'

/** Payload's slug for its job scheduler's state; the package doesn't export it. */
const JOB_STATS_GLOBAL = 'payload-jobs-stats'

/**
 * Payload adds the `payload-jobs-stats` global once a task is scheduled,
 * with default access: any signed-in account could read it and move a
 * task's `lastScheduledRun`, postponing `purge-contact-jobs` indefinitely.
 * Payload has no override for it, so this takes the built config and limits
 * reading and updating it to super admins. The scheduler writes through
 * `payload.db`, which skips access. Throws if the global is missing, so a
 * Payload change can't silently drop the lock.
 */
export async function lockJobStatsGlobal(config: Promise<SanitizedConfig>): Promise<SanitizedConfig> {
  const built = await config
  if (!built.globals.some((global) => global.slug === JOB_STATS_GLOBAL)) {
    throw new Error(`lockJobStatsGlobal: the ${JOB_STATS_GLOBAL} global is missing; no task is scheduled.`)
  }
  return {
    ...built,
    globals: built.globals.map((global) =>
      global.slug === JOB_STATS_GLOBAL
        ? { ...global, access: { ...global.access, read: superAdminOnly, update: superAdminOnly } }
        : global,
    ),
  }
}
