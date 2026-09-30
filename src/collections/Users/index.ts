import type { CollectionConfig } from 'payload'

import type { User } from '@/payload-types'

import { authenticated } from '../../access/authenticated'
import { isSuperAdmin, superAdminFieldAccess, superAdminOnly } from '../../access/isSuperAdmin'
import { accountCreatedEmail, verificationEmail } from '../../lib/email/authEmails'
import { verifyUsersSuperAdminsCreate } from './hooks/verifyUsersSuperAdminsCreate'

// Payload sends this on every create. A user a super admin created is
// already verified, so they get a sign-in link instead of a token.
const creationEmail = ({ token, user }: { token: string; user: User }) =>
  user._verified ? accountCreatedEmail() : verificationEmail(token)

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
  auth: {
    verify: {
      generateEmailHTML: async (args) => (await creationEmail(args)).html,
      generateEmailSubject: async (args) => (await creationEmail(args)).subject,
    },
  },
  fields: [
    // Merged by name over Payload's base auth fields. A user can't verify
    // themselves, and can't swap the address they verified.
    {
      name: '_verified',
      type: 'checkbox',
      access: { create: superAdminFieldAccess, update: superAdminFieldAccess },
    },
    {
      name: 'email',
      type: 'email',
      access: { update: superAdminFieldAccess },
    },
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
  hooks: {
    beforeChange: [verifyUsersSuperAdminsCreate],
  },
  timestamps: true,
}
