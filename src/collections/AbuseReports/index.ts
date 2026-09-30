import type { CollectionConfig } from 'payload'

import type { User } from '@/payload-types'

import { isSuperAdmin, superAdminOnly } from '../../access/isSuperAdmin'
import { ABUSE_REPORT_REASON_OPTIONS, ABUSE_REPORT_STATUS_OPTIONS } from '../options'

/**
 * "Report this page" submissions. Platform-level, so outside the
 * multi-tenant plugin: only super admins see them, and only the report
 * route creates them, through the Local API.
 */
export const AbuseReports: CollectionConfig = {
  slug: 'abuse-reports',
  access: {
    create: superAdminOnly,
    delete: superAdminOnly,
    read: superAdminOnly,
    update: superAdminOnly,
  },
  admin: {
    defaultColumns: ['pageUrl', 'reason', 'status', 'createdAt'],
    hidden: ({ user }) => !isSuperAdmin(user as unknown as User),
    useAsTitle: 'pageUrl',
  },
  fields: [
    {
      name: 'pageUrl',
      type: 'text',
      required: true,
    },
    {
      // Cleared if the game is deleted; `pageUrl` stays the record.
      name: 'gameProject',
      type: 'relationship',
      relationTo: 'game-projects',
    },
    {
      name: 'reason',
      type: 'select',
      required: true,
      options: [...ABUSE_REPORT_REASON_OPTIONS],
    },
    {
      name: 'details',
      type: 'textarea',
    },
    {
      name: 'reporterEmail',
      type: 'email',
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'open',
      index: true,
      options: [...ABUSE_REPORT_STATUS_OPTIONS],
      admin: { position: 'sidebar' },
    },
  ],
  timestamps: true,
}
