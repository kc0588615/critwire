import type { CollectionConfig } from 'payload'

import { tenantMemberAccess, tenantOwnerAccess } from '../../access/tenantAccess'
import { sameGameProjectFilter } from '../../fields/sameGameProjectFilter'
import { ISSUE_CATEGORY_OPTIONS, ISSUE_REPORT_STATUS_OPTIONS } from '../options'
import { createIssueFromPublishedReport } from './hooks/createIssueFromPublishedReport'
import { validateReportStatus } from './hooks/validateReportStatus'

export const IssueReports: CollectionConfig = {
  slug: 'issue-reports',
  access: {
    // Never public: reports may contain emails and unvetted content.
    // The public submission endpoint (Phase 6) creates reports via the
    // Local API with overrideAccess after Turnstile + rate limiting.
    read: tenantMemberAccess,
    create: tenantMemberAccess,
    update: tenantMemberAccess,
    delete: tenantOwnerAccess,
  },
  admin: {
    defaultColumns: ['title', 'gameProject', 'category', 'status', 'createdAt'],
    group: 'Game Portal',
    useAsTitle: 'title',
  },
  fields: [
    {
      name: 'gameProject',
      type: 'relationship',
      relationTo: 'game-projects',
      required: true,
      index: true,
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    {
      name: 'description',
      type: 'textarea',
      required: true,
    },
    {
      name: 'category',
      type: 'select',
      defaultValue: 'OTHER',
      options: [...ISSUE_CATEGORY_OPTIONS],
      required: true,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'NEW',
      options: [...ISSUE_REPORT_STATUS_OPTIONS],
      required: true,
      index: true,
    },
    {
      // Set when the report is linked to (or promoted into) an issue.
      name: 'issue',
      type: 'relationship',
      relationTo: 'issues',
      filterOptions: sameGameProjectFilter,
    },
    {
      name: 'submitterEmail',
      type: 'email',
    },
    {
      name: 'platform',
      type: 'text',
      admin: {
        description: 'e.g. Windows, Steam Deck, PS5',
      },
    },
    {
      name: 'gameVersion',
      type: 'text',
    },
  ],
  hooks: {
    beforeChange: [createIssueFromPublishedReport],
    beforeValidate: [validateReportStatus],
  },
  timestamps: true,
}
