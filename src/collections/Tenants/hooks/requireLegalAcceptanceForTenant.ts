import type { CollectionBeforeChangeHook } from 'payload'

import { assertLegalAcceptance } from '@/access/legalWrite'
import type { Tenant } from '@/payload-types'

/**
 * The legal gate for `Tenants`, which has no tenant field for
 * `requireLegalAcceptance` to hang on, yet lets owners change their
 * studio's public name and slug.
 */
export const requireLegalAcceptanceForTenant: CollectionBeforeChangeHook<Tenant> = async ({ data, req }) => {
  await assertLegalAcceptance(req)
  return data
}
