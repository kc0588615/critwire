import type { CollectionConfig } from 'payload'

import type { User } from '@/payload-types'

import { adminPanelAccess } from '../../access/adminPanelAccess'
import { isSuperAdmin, superAdminFieldAccess, superAdminOnly } from '../../access/isSuperAdmin'
import { accountCreatedEmail, passwordResetEmail, verificationEmail } from '../../lib/email/authEmails'
import { anonymizeDeletedUser } from './hooks/anonymizeDeletedUser'
import { guardAccountDeletion } from './hooks/guardAccountDeletion'
import { refuseDeletedLogin } from './hooks/refuseDeletedLogin'
import { restrictPasswordRecovery } from './hooks/restrictPasswordRecovery'
import { verifyUsersSuperAdminsCreate } from './hooks/verifyUsersSuperAdminsCreate'

// Payload sends this on every create. A user a super admin created is
// already verified, so they get a sign-in link instead of a token.
const creationEmail = ({ token, user }: { token: string; user: User }) =>
  user._verified ? accountCreatedEmail() : verificationEmail(token)

const resetEmail = (args?: { token?: string }) => {
  if (!args?.token) throw new Error('Password reset email: Payload passed no token.')
  return passwordResetEmail(args.token)
}

export const Users: CollectionConfig = {
  slug: 'users',
  access: {
    admin: adminPanelAccess,
    create: superAdminOnly,
    // No hard deletes: a super admin ticks `deleted`, which anonymizes the
    // account and keeps what points to it.
    delete: () => false,
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
    forgotPassword: {
      generateEmailHTML: async (args) => (await resetEmail(args)).html,
      generateEmailSubject: async (args) => (await resetEmail(args)).subject,
    },
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
    {
      // Data, like a studio's `suspended`. Ticking it scrubs the account
      // (`anonymizeDeletedUser`), and nothing unticks it (`guardAccountDeletion`).
      name: 'deleted',
      type: 'checkbox',
      label: 'Delete this account',
      defaultValue: false,
      access: { create: superAdminFieldAccess, update: superAdminFieldAccess },
      admin: {
        description:
          "Removes the email, name, password and sign-ins; shows as 'Deleted user'. Studios and their content stay. Can't be undone.",
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    afterChange: [anonymizeDeletedUser],
    beforeChange: [verifyUsersSuperAdminsCreate, guardAccountDeletion],
    beforeLogin: [refuseDeletedLogin],
    beforeOperation: [restrictPasswordRecovery],
  },
  timestamps: true,
}
