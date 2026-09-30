import { APIError, type FieldHook, ValidationError } from 'payload'
import { extractID } from 'payload/shared'

import type { Tenant } from '@/payload-types'

import { isSuperAdmin } from './isSuperAdmin'
import { getTenantIDsByRole } from './tenantRoles'

/**
 * `beforeChange` hook on the multi-tenant plugin's `tenant` field: a
 * studio user may only write into a studio they belong to, and not while
 * it's suspended. A hook rather than a `validate`, because Payload skips
 * field validation on draft saves and runs field hooks on every save. The
 * plugin's `filterOptions` only narrows the admin dropdown, and its
 * tenant-access `Where` doesn't look at incoming data.
 *
 * System writes without a user (votes, public submissions, seeds) and
 * super admins pass; the plugin still checks the tenant is present.
 */
export const enforceTenantWrite: FieldHook = async ({ collection, previousValue, req, value }) => {
  const user = req.user
  const tenant = (value ?? previousValue) as null | number | string | Tenant | undefined
  if (tenant == null || !user || isSuperAdmin(user)) return value

  const tenantID = extractID(tenant)
  if (!getTenantIDsByRole(user).some((id) => String(id) === String(tenantID))) {
    throw new ValidationError({
      collection: collection?.slug,
      errors: [{ message: 'You can only assign documents to your own studio.', path: 'tenant' }],
    })
  }

  const { suspended } = await req.payload.findByID({
    collection: 'tenants',
    id: tenantID,
    depth: 0,
    overrideAccess: true,
    req,
    select: { suspended: true },
  })
  if (suspended) throw new APIError('This studio is suspended, so changes can’t be saved.', 403)

  return value
}
