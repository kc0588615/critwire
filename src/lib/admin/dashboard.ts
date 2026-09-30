import type { CollectionSlug, Payload, Where } from 'payload'
import { extractID } from 'payload/shared'
import { stringify } from 'qs-esm'

import { getTenantIDsByRole } from '@/access/tenantRoles'
import type { User } from '@/payload-types'

/** A queue on the super admin's dashboard: how many documents wait, and the filtered list. */
export interface PlatformQueue {
  label: string
  count: number
  href: string
}

const QUEUES: { collection: CollectionSlug; label: string; where?: Where }[] = [
  { collection: 'game-projects', label: 'Held games', where: { flagged: { equals: true } } },
  { collection: 'patch-notes', label: 'Held updates', where: { flagged: { equals: true } } },
  { collection: 'abuse-reports', label: 'Open abuse reports', where: { status: { equals: 'open' } } },
  { collection: 'tenants', label: 'Studios' },
]

const listHref = (collection: CollectionSlug, where?: Where): string =>
  `/admin/collections/${collection}${where ? stringify({ where }, { addQueryPrefix: true }) : ''}`

/** The super admin's queues, counted across every studio. */
export const countPlatformQueues = (payload: Payload): Promise<PlatformQueue[]> =>
  Promise.all(
    QUEUES.map(async ({ collection, label, where }) => {
      const { totalDocs } = await payload.count({ collection, overrideAccess: true, where })
      return { count: totalDocs, href: listHref(collection, where), label }
    }),
  )

/** What a visitor gets at a game's portal. */
export type PortalStatus = 'held' | 'live' | 'suspended'

export interface StudioGame {
  id: number
  name: string
  slug: string
  status: PortalStatus
}

export interface StudioOverview {
  id: number
  name: string
  suspended: boolean
  /** Oldest first, so the first is the game the studio onboarded with. */
  games: StudioGame[]
}

/** The studios `user` belongs to, with their games and each portal's status, read as `user`. */
export async function findStudioOverviews(payload: Payload, user: User): Promise<StudioOverview[]> {
  const tenantIDs = getTenantIDsByRole(user)
  if (tenantIDs.length === 0) return []

  const [{ docs: tenants }, { docs: games }] = await Promise.all([
    payload.find({
      collection: 'tenants',
      depth: 0,
      overrideAccess: false,
      pagination: false,
      select: { name: true, suspended: true },
      sort: 'createdAt',
      user,
      where: { id: { in: tenantIDs } },
    }),
    payload.find({
      collection: 'game-projects',
      depth: 0,
      overrideAccess: false,
      pagination: false,
      select: { flagged: true, name: true, slug: true, tenant: true },
      sort: 'createdAt',
      user,
      where: { tenant: { in: tenantIDs } },
    }),
  ])

  return tenants.map((tenant) => ({
    games: games
      .filter((game) => game.tenant != null && extractID(game.tenant) === tenant.id)
      .map((game) => ({
        id: game.id,
        name: game.name,
        slug: game.slug,
        status: tenant.suspended ? 'suspended' : game.flagged ? 'held' : 'live',
      })),
    id: tenant.id,
    name: tenant.name,
    suspended: Boolean(tenant.suspended),
  }))
}
