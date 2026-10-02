import type { SerializedEditorState } from '@payloadcms/richtext-lexical/lexical'
import type { CollectionConfig } from 'payload'

import { convertLexicalToPlaintext } from '@payloadcms/richtext-lexical/plaintext'
import { slugField } from 'payload'

import { patchNotesRead } from '../../access/publicRead'
import { tenantMemberAccess, tenantOwnerAccess } from '../../access/tenantAccess'
import { moderationFields } from '../../fields/moderation'
import { populatePublishedAt } from '../../hooks/populatePublishedAt'
import { screenTextHook } from '../../hooks/screenText'
import { validateUniqueSlugPerProject } from '../../hooks/validateUniqueSlugPerProject'
import type { PatchNote } from '../../payload-types'
import { queueDiscordUpdatePost } from './hooks/queueDiscordUpdatePost'
import { revalidatePatchNotes, revalidatePatchNotesDelete } from './hooks/revalidatePatchNotes'

// The content filter holds an update whose text it flags. Link targets
// inside the content aren't screened, only what readers see.
const screenUpdateText = screenTextHook<PatchNote>(({ title, versionLabel, summary, content }) =>
  [
    title,
    versionLabel,
    summary,
    content ? convertLexicalToPlaintext({ data: content as SerializedEditorState }) : '',
  ]
    .map((part) => part ?? '')
    .join('\n\n'),
)

export const PatchNotes: CollectionConfig = {
  slug: 'patch-notes',
  labels: { plural: 'Updates', singular: 'Update' },
  access: {
    // Anonymous readers only see published notes that aren't held; studio
    // members see drafts of their own tenant (plugin adds the tenant constraint).
    read: patchNotesRead,
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
        description: 'Short teaser shown in the updates feed.',
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
    ...moderationFields(),
  ],
  hooks: {
    afterChange: [revalidatePatchNotes, queueDiscordUpdatePost],
    afterDelete: [revalidatePatchNotesDelete],
    beforeChange: [populatePublishedAt, screenUpdateText],
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
