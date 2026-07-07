import type { Tenant, User } from '@/payload-types'

export type TenantRole = 'member' | 'owner'

/**
 * IDs of tenants the user belongs to, optionally narrowed to a role.
 * Mirrors the plugin's `getUserTenantIDs` but adds role filtering,
 * which the plugin utility does not support.
 */
export const getTenantIDsByRole = (
  user: null | undefined | User,
  role?: TenantRole,
): (number | string)[] => {
  if (!user?.tenants) return []

  return user.tenants.reduce<(number | string)[]>((ids, row) => {
    if (role && !row.roles?.includes(role)) return ids
    const tenant = row.tenant as number | string | Tenant
    ids.push(typeof tenant === 'object' ? tenant.id : tenant)
    return ids
  }, [])
}
