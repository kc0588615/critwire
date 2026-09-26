import type { CollectionConfig } from 'payload'

import { authenticated } from '../../access/authenticated'
import { isSuperAdmin, superAdminOnly } from '../../access/isSuperAdmin'

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: authenticated,
    create: superAdminOnly,
    delete: superAdminOnly,
    read: ({ req }) => {
      if (!req.user) return false
      if (isSuperAdmin(req.user)) return true
      return { id: { equals: req.user.id } }
    },
    update: ({ req }) => {
      if (!req.user) return false
      if (isSuperAdmin(req.user)) return true
      return { id: { equals: req.user.id } }
    },
  },
  admin: {
    defaultColumns: ['name', 'email'],
    useAsTitle: 'name',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
    },
    {
      // Global roles. Tenant-level roles (owner/member) live on the
      // `tenants` array field injected by the multi-tenant plugin.
      name: 'roles',
      type: 'select',
      hasMany: true,
      required: true,
      defaultValue: ['user'],
      options: [
        { label: 'Super Admin', value: 'admin' },
        { label: 'User', value: 'user' },
      ],
      access: {
        // `!req.user` covers first-user registration, which runs unauthenticated.
        create: ({ req }) => !req.user || isSuperAdmin(req.user),
        update: ({ req }) => isSuperAdmin(req.user),
      },
      saveToJWT: true,
    },
  ],
  timestamps: true,
}
