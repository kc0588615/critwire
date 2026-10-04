import type { CollectionConfig } from 'payload'

import type { User } from '@/payload-types'

import { isSuperAdmin, superAdminOnly } from '../access/isSuperAdmin'

/**
 * Each time an account accepted the Terms of Service and Privacy Policy:
 * who, which versions, each document's SHA-256 digest, and when
 * (`createdAt`). No IP address. Platform-level, so outside the
 * multi-tenant plugin. Only `/legal/accept/submit` writes one, through
 * `recordLegalAcceptance` and the Local API, so nobody can forge or edit
 * a record; super admins read them.
 */
export const LegalAcceptances: CollectionConfig = {
  slug: 'legal-acceptances',
  labels: { plural: 'Legal acceptances', singular: 'Legal acceptance' },
  access: {
    create: () => false,
    delete: () => false,
    read: superAdminOnly,
    update: () => false,
  },
  admin: {
    defaultColumns: ['user', 'termsVersion', 'privacyVersion', 'createdAt'],
    hidden: ({ user }) => !isSuperAdmin(user as unknown as User),
  },
  fields: [
    {
      name: 'user',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      index: true,
    },
    {
      name: 'termsVersion',
      type: 'text',
      required: true,
    },
    {
      name: 'privacyVersion',
      type: 'text',
      required: true,
    },
    {
      name: 'termsDigest',
      type: 'text',
      required: true,
    },
    {
      name: 'privacyDigest',
      type: 'text',
      required: true,
    },
  ],
  timestamps: true,
}
