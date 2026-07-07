import type { Access, FieldAccess } from 'payload'

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
