import type { CollectionConfig } from 'payload'

import type { User } from '@/payload-types'

import { isSuperAdmin, superAdminOnly } from '../access/isSuperAdmin'
import { PUBLIC_STAGES } from '../lib/game-portal/stages'

/** The public stages critwire announces in Discord. */
export const DISCORD_POSTED_STAGES = PUBLIC_STAGES.filter((stage) => stage.id !== 'under-review')

/**
 * What critwire has posted to Discord: one row per update, and one per
 * public stage an item reached. The post jobs read it so each is posted
 * once, and only they write it. Platform-level, so outside the
 * multi-tenant plugin, like AbuseReports.
 */
export const DiscordPosts: CollectionConfig = {
  slug: 'discord-posts',
  labels: { plural: 'Discord posts', singular: 'Discord post' },
  access: {
    create: superAdminOnly,
    delete: superAdminOnly,
    read: superAdminOnly,
    update: superAdminOnly,
  },
  admin: {
    defaultColumns: ['gameProject', 'patchNote', 'issue', 'stage', 'createdAt'],
    hidden: ({ user }) => !isSuperAdmin(user as unknown as User),
  },
  fields: [
    {
      name: 'gameProject',
      type: 'relationship',
      relationTo: 'game-projects',
      required: true,
    },
    {
      name: 'patchNote',
      type: 'relationship',
      label: 'Update',
      relationTo: 'patch-notes',
      unique: true,
    },
    {
      name: 'issue',
      type: 'relationship',
      label: 'Feedback item',
      relationTo: 'issues',
      index: true,
    },
    {
      name: 'stage',
      type: 'select',
      options: DISCORD_POSTED_STAGES.map(({ id, label }) => ({ label, value: id })),
    },
  ],
  timestamps: true,
}
