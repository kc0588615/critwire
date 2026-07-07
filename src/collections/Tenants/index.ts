import type { CollectionConfig } from 'payload'

import { isSuperAdmin } from '../../access/isSuperAdmin'
import { getTenantIDsByRole } from '../../access/tenantRoles'

/**
 * One tenant = one Workspace (studio). The multi-tenant plugin keys
 * everything off this collection (slug: 'tenants').
 */
export const Tenants: CollectionConfig = {
  slug: 'tenants',
  access: {
    create: ({ req }) => isSuperAdmin(req.user),
    delete: ({ req }) => isSuperAdmin(req.user),
    read: ({ req }) => {
      if (!req.user) return false
      if (isSuperAdmin(req.user)) return true
      return { id: { in: getTenantIDsByRole(req.user) } }
    },
    update: ({ req }) => {
      if (!req.user) return false
      if (isSuperAdmin(req.user)) return true
      return { id: { in: getTenantIDsByRole(req.user, 'owner') } }
    },
  },
  admin: {
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      index: true,
      admin: {
        description: 'Used in URLs. Lowercase letters, numbers, and hyphens only.',
      },
      validate: (value: null | string | string[] | undefined) => {
        if (typeof value !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
          return 'Slug must contain only lowercase letters, numbers, and hyphens.'
        }
        return true
      },
    },
  ],
  timestamps: true,
}
