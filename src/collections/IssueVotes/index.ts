import type { CollectionConfig } from 'payload'

import type { User } from '@/payload-types'

import { isSuperAdmin } from '../../access/isSuperAdmin'
import { tenantMemberAccess } from '../../access/tenantAccess'

export const IssueVotes: CollectionConfig = {
  slug: 'issue-votes',
  access: {
    // Votes are only written by the public voting endpoint (Phase 5)
    // via the Local API with overrideAccess — never through REST/admin.
    read: tenantMemberAccess,
    create: () => false,
    update: () => false,
    delete: ({ req }) => isSuperAdmin(req.user),
  },
  admin: {
    defaultColumns: ['issue', 'createdAt'],
    group: 'Game Portal',
    hidden: ({ user }) => !isSuperAdmin(user as unknown as User),
  },
  fields: [
    {
      name: 'issue',
      type: 'relationship',
      relationTo: 'issues',
      required: true,
      index: true,
    },
    {
      // SHA-256 of the signed browser vote token — raw tokens are never stored.
      name: 'browserTokenHash',
      type: 'text',
      required: true,
      index: true,
    },
  ],
  indexes: [
    {
      // One vote per browser token per issue.
      fields: ['issue', 'browserTokenHash'],
      unique: true,
    },
  ],
  timestamps: true,
}
