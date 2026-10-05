import type { CollectionBeforeDeleteHook } from 'payload'
import { extractID } from 'payload/shared'

import { deleteWhereOrThrow } from '@/lib/payload/deleteWhereOrThrow'
import { TENANT_SCOPED_COLLECTIONS } from '@/plugins'

const FIRST = 'game-projects'
const LAST = 'media'

/**
 * Replaces the multi-tenant plugin's cleanup, which runs after the delete,
 * outside its transaction, and drops failures. In the studio delete's
 * transaction, one step after another, it deletes:
 * 1. the studio's games, each taking its content (`deleteGameContent`);
 * 2. whatever is left in the other tenant-scoped collections, media last,
 *    because its files can't roll back;
 * 3. the studio from every user's memberships, deleted accounts included,
 *    whose NOT NULL key would otherwise refuse the tenant's delete.
 * Any failure throws, and the whole delete rolls back.
 */
export const deleteStudioContent: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const ofStudio = { tenant: { equals: id } }
  const middle = TENANT_SCOPED_COLLECTIONS.filter((slug) => slug !== FIRST && slug !== LAST)
  for (const collection of [FIRST, ...middle, LAST] as const) {
    await deleteWhereOrThrow({ collection, req, where: ofStudio })
  }

  const { docs: members } = await req.payload.find({
    collection: 'users',
    depth: 0,
    overrideAccess: true,
    pagination: false,
    req,
    where: { 'tenants.tenant': { equals: id } },
  })
  for (const member of members) {
    await req.payload.update({
      collection: 'users',
      data: { tenants: (member.tenants ?? []).filter(({ tenant }) => String(extractID(tenant)) !== String(id)) },
      depth: 0,
      id: member.id,
      overrideAccess: true,
      req,
    })
  }
}
