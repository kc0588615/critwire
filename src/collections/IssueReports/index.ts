import type { CollectionConfig, Condition } from 'payload'

import { tenantMemberAccess, tenantOwnerAccess } from '../../access/tenantAccess'
import { sameGameProjectFilter } from '../../fields/sameGameProjectFilter'
import {
  FEEDBACK_TYPE_OPTIONS,
  ISSUE_CATEGORY_OPTIONS,
  ISSUE_REPORT_STATUS_OPTIONS,
} from '../options'
import { autoPublishReport } from './hooks/autoPublishReport'
import { createIssueFromPublishedReport } from './hooks/createIssueFromPublishedReport'
import { screenReportText } from './hooks/screenReportText'
import { validateReportStatus } from './hooks/validateReportStatus'

// Platform and version only describe bugs.
const isBug: Condition = (data) => data?.type === 'BUG'

export const IssueReports: CollectionConfig = {
  slug: 'issue-reports',
  labels: { plural: 'Submissions', singular: 'Submission' },
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
    defaultColumns: ['title', 'type', 'gameProject', 'status', 'flagged', 'createdAt'],
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
      name: 'type',
      type: 'select',
      defaultValue: 'BUG',
      options: [...FEEDBACK_TYPE_OPTIONS],
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
      admin: {
        description: 'Flagged submissions wait here even when review is off.',
      },
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
        condition: isBug,
        description: 'e.g. Windows, Steam Deck, PS5',
      },
    },
    {
      name: 'gameVersion',
      type: 'text',
      admin: {
        condition: isBug,
      },
    },
    {
      // Set by the content filter (`screenReportText`) whenever the text is written.
      name: 'flagged',
      type: 'checkbox',
      defaultValue: false,
      index: true,
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
    },
    {
      name: 'flagReasons',
      type: 'textarea',
      admin: {
        condition: (data) => Boolean(data?.flagged),
        description: 'Why the content filter held this submission, one reason per line.',
        position: 'sidebar',
        readOnly: true,
      },
    },
  ],
  hooks: {
    // In order: screen, then auto-publish, then promote to an issue.
    beforeChange: [screenReportText, autoPublishReport, createIssueFromPublishedReport],
    beforeValidate: [validateReportStatus],
  },
  timestamps: true,
}
