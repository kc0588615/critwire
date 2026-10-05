import { APIError, type CollectionBeforeChangeHook } from 'payload'

import { isSuperAdmin } from '@/access/isSuperAdmin'
import { SUSPENDED_STUDIO_MESSAGE } from '@/access/tenantWrite'
import type { Tenant } from '@/payload-types'

/**
 * A suspended studio's owners can't rename it or change its slug, as
 * `enforceTenantWrite` stops their changes to its content; `Tenants` has
 * no tenant field for that hook. Super admins pass, to lift a suspension.
 */
export const refuseSuspendedStudioChange: CollectionBeforeChangeHook<Tenant> = ({ data, originalDoc, req }) => {
  if (originalDoc?.suspended && req.user && !isSuperAdmin(req.user)) {
    throw new APIError(SUSPENDED_STUDIO_MESSAGE, 403)
  }
  return data
}
