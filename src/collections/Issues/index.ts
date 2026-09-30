import type { CollectionConfig } from 'payload'

import { slugField } from 'payload'

import { issuesRead } from '../../access/publicRead'
import { tenantMemberAccess, tenantOwnerAccess } from '../../access/tenantAccess'
import { sameGameProjectFilter } from '../../fields/sameGameProjectFilter'
import { validateUniqueSlugPerProject } from '../../hooks/validateUniqueSlugPerProject'
import { FEEDBACK_TYPE_OPTIONS, ISSUE_CATEGORY_OPTIONS, ISSUE_STATUS_OPTIONS } from '../options'
import { deleteIssueVotes } from './hooks/deleteIssueVotes'
import {
  revalidateIssueLanding,
  revalidateIssueLandingDelete,
} from './hooks/revalidateIssueLanding'
import {
  revalidateLinkedUpdates,
  revalidateLinkedUpdatesDelete,
} from './hooks/revalidateLinkedUpdates'
import { issueSlugify, rejectReservedSlug } from './reservedSlug'

export const Issues: CollectionConfig = {
  slug: 'issues',
  labels: { plural: 'Feedback', singular: 'Feedback item' },
  // Fractional-index `_order` field for admin kanban drag-and-drop
  // (see src/components/admin/issues/* — adapted from
  // https://gist.github.com/Dan6erbond/e0dd89744c21aaa8c25925717d589eeb).
  orderable: true,
  access: {
    // The public board only shows issues the studio marked public.
    read: issuesRead,
    create: tenantMemberAccess,
    update: tenantMemberAccess,
    delete: tenantOwnerAccess,
  },
  admin: {
    components: {
      views: {
        list: {
          Component: '@/components/admin/issues/list',
        },
      },
    },
    defaultColumns: ['title', 'gameProject', 'category', 'status', 'upvoteCount'],
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
    // Unique per game project via the compound index below; `new` is reserved.
    slugField({ disableUnique: true, slugify: issueSlugify }),
    {
      name: 'summary',
      type: 'textarea',
    },
    {
      name: 'details',
      type: 'richText',
    },
    {
      name: 'type',
      type: 'select',
      defaultValue: 'BUG',
      options: [...FEEDBACK_TYPE_OPTIONS],
      required: true,
      index: true,
    },
    {
      name: 'category',
      type: 'select',
      defaultValue: 'OTHER',
      options: [...ISSUE_CATEGORY_OPTIONS],
      required: true,
      index: true,
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'REPORTED',
      options: [...ISSUE_STATUS_OPTIONS],
      required: true,
      index: true,
    },
    {
      name: 'isPublic',
      type: 'checkbox',
      defaultValue: true,
      admin: {
        position: 'sidebar',
      },
      index: true,
    },
    {
      name: 'isPinned',
      type: 'checkbox',
      defaultValue: false,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'needsMoreInfoText',
      type: 'textarea',
      admin: {
        condition: (data) => data?.status === 'NEEDS_MORE_INFO',
        description: 'Shown publicly when status is Needs More Info.',
      },
    },
    {
      name: 'workaroundText',
      type: 'textarea',
      admin: {
        condition: (data) => data?.status === 'WORKAROUND_AVAILABLE',
        description: 'Shown publicly when status is Workaround Available.',
      },
    },
    {
      name: 'fixedInPatchNote',
      type: 'relationship',
      relationTo: 'patch-notes',
      label: 'Shipped in update',
      admin: {
        condition: (data) => data?.status === 'FIXED',
        description: 'The update that shipped it. Its page lists this item under "From your feedback".',
      },
      filterOptions: sameGameProjectFilter,
    },
    {
      // Maintained by the IssueVotes hooks; never edited by hand.
      name: 'upvoteCount',
      type: 'number',
      access: {
        create: () => false,
        update: () => false,
      },
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      defaultValue: 0,
      min: 0,
    },
  ],
  hooks: {
    afterChange: [revalidateIssueLanding, revalidateLinkedUpdates],
    afterDelete: [revalidateIssueLandingDelete, revalidateLinkedUpdatesDelete],
    beforeDelete: [deleteIssueVotes],
    beforeValidate: [rejectReservedSlug, validateUniqueSlugPerProject('issues')],
  },
  indexes: [
    {
      fields: ['gameProject', 'slug'],
      unique: true,
    },
  ],
  timestamps: true,
}
