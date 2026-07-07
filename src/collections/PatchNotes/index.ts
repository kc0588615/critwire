import type { CollectionConfig } from 'payload'

import { slugField } from 'payload'

import { tenantMemberAccess, tenantOwnerAccess } from '../../access/tenantAccess'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'
import { validateUniqueSlugPerProject } from '../../hooks/validateUniqueSlugPerProject'

export const PatchNotes: CollectionConfig = {
  slug: 'patch-notes',
  access: {
    // Anonymous readers only see published notes; studio members see
    // drafts of their own tenant (plugin adds the tenant constraint).
    read: ({ req }) => {
      if (req.user) return true
      return { _status: { equals: 'published' } }
    },
    create: tenantMemberAccess,
    update: tenantMemberAccess,
    delete: tenantOwnerAccess,
  },
  admin: {
    defaultColumns: ['title', 'gameProject', 'versionLabel', '_status', 'publishedAt'],
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
    // Unique per game project via the compound index below.
    slugField({ disableUnique: true }),
    {
      name: 'versionLabel',
      type: 'text',
      admin: {
        description: 'e.g. v1.2.0, Hotfix 3',
        position: 'sidebar',
      },
    },
    {
      name: 'summary',
      type: 'textarea',
      admin: {
        description: 'Short teaser shown in the patch notes feed.',
      },
    },
    {
      name: 'content',
      type: 'richText',
      required: true,
    },
    {
      name: 'publishedAt',
      type: 'date',
      admin: {
        position: 'sidebar',
      },
    },
  ],
  hooks: {
    beforeChange: [populatePublishedAt],
    beforeValidate: [validateUniqueSlugPerProject('patch-notes')],
  },
  indexes: [
    {
      fields: ['gameProject', 'slug'],
      unique: true,
    },
  ],
  timestamps: true,
  versions: {
    drafts: true,
    maxPerDoc: 25,
  },
}
