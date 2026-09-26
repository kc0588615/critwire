import type { Access } from 'payload'

import type { User } from '@/payload-types'

export const isSuperAdmin = (user: null | undefined | User): boolean => {
  return Boolean(user?.roles?.includes('admin'))
}

/** Platform-level operations: super admins only. */
export const superAdminOnly: Access = ({ req }) => isSuperAdmin(req.user)
