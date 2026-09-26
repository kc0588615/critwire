import type { Access, FieldAccess, RelationshipFieldSingleValidation } from 'payload'
import { extractID } from 'payload/shared'

import type { Tenant } from '@/payload-types'

import { isSuperAdmin } from './isSuperAdmin'
import { getTenantIDsByRole } from './tenantRoles'

/**
 * Any authenticated user. The multi-tenant plugin ANDs a
 * member-of-tenant constraint onto every operation for authenticated
 * non-super-admins, so membership itself only needs a boolean here.
 */
export const tenantMemberAccess: Access = ({ req }) => Boolean(req.user)

/**
 * Restricts the operation to tenants where the user holds the `owner`
 * role (the plugin's automatic constraint only checks membership).
 */
export const tenantOwnerAccess: Access = ({ req }) => {
  const user = req.user
  if (!user) return false
  if (isSuperAdmin(user)) return true

  const owned = getTenantIDsByRole(user, 'owner')
  if (!owned.length) return false
  return { tenant: { in: owned } }
}

/**
 * Field-level read gate: only members of the document's tenant (or
 * super admins) may read the field. Used for sensitive fields on
 * otherwise world-readable collections (e.g. Discord webhook URLs).
 */
export const tenantMemberFieldRead: FieldAccess = ({ doc, req }) => {
  const user = req.user
  if (!user) return false
  if (isSuperAdmin(user)) return true

  const tenant = (doc as { tenant?: null | number | string | Tenant } | undefined)?.tenant
  const tenantID = typeof tenant === 'object' && tenant !== null ? tenant.id : tenant
  if (tenantID == null) return false

  return getTenantIDsByRole(user).some((id) => String(id) === String(tenantID))
}

/**
 * Validator for the multi-tenant plugin's `tenant` field: a studio user
 * may only assign documents to studios they belong to. The plugin's
 * `filterOptions` narrows the admin dropdown but isn't enforced on the
 * server, and its tenant-access `Where` doesn't look at incoming data.
 * System writes without a user (votes, seeds) are trusted; the plugin
 * still checks presence after this.
 */
export const validateTenantMembership: RelationshipFieldSingleValidation = (value, { req }) => {
  const user = req.user
  if (value == null || !user || isSuperAdmin(user)) return true

  // Single-collection relationship: an ID or a populated tenant.
  const tenantID = String(extractID(value as number | string | Pick<Tenant, 'id'>))
  if (getTenantIDsByRole(user).some((id) => String(id) === tenantID)) return true
  return 'You can only assign documents to your own studio.'
}
