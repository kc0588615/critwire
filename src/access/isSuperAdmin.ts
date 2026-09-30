import type { Access, FieldAccess } from 'payload'

import type { User } from '@/payload-types'

export const isSuperAdmin = (user: null | undefined | User): boolean => {
  return Boolean(user?.roles?.includes('admin'))
}

/** Platform-level operations: super admins only. */
export const superAdminOnly: Access = ({ req }) => isSuperAdmin(req.user)

/**
 * Platform-level fields: only a super admin writes them. A denied field is
 * dropped from the write, and the admin shows it read-only.
 */
export const superAdminFieldAccess: FieldAccess = ({ req }) => isSuperAdmin(req.user)
