import type { CollectionConfig } from 'payload'

import { isSuperAdmin, superAdminFieldAccess, superAdminOnly } from '../../access/isSuperAdmin'
import { getTenantIDsByRole } from '../../access/tenantRoles'
import { deleteStudioContent } from './hooks/deleteStudioContent'
import { refuseSuspendedStudioChange } from './hooks/refuseSuspendedStudioChange'
import { requireLegalAcceptanceForTenant } from './hooks/requireLegalAcceptanceForTenant'
import { revalidateSuspension } from './hooks/revalidateSuspension'

/**
 * One tenant = one Workspace (studio). The multi-tenant plugin keys
 * everything off this collection (slug: 'tenants').
 */
export const Tenants: CollectionConfig = {
  slug: 'tenants',
  access: {
    create: superAdminOnly,
    delete: superAdminOnly,
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
    {
      // Members can read it, so their admin can tell them.
      name: 'suspended',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      access: { create: superAdminFieldAccess, update: superAdminFieldAccess },
      admin: {
        description: "Hides the studio's portals and blocks its members' changes.",
        position: 'sidebar',
      },
    },
    {
      // Set by onboarding; empty for studios a super admin creates. Unique,
      // so a double submit fails its second insert instead of leaving an
      // orphan studio.
      name: 'createdBy',
      type: 'relationship',
      relationTo: 'users',
      unique: true,
      access: {
        create: superAdminFieldAccess,
        read: superAdminFieldAccess,
        update: superAdminFieldAccess,
      },
      admin: { position: 'sidebar' },
    },
  ],
  hooks: {
    afterChange: [revalidateSuspension],
    beforeChange: [requireLegalAcceptanceForTenant, refuseSuspendedStudioChange],
    beforeDelete: [deleteStudioContent],
  },
  timestamps: true,
}
