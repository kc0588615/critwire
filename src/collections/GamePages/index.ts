import type { CollectionConfig } from 'payload'

import { ValidationError } from 'payload'

import { tenantMemberAccess, tenantOwnerAccess } from '../../access/tenantAccess'
import { GameCTA } from '../../blocks/game/CTA/config'
import { GameFeatures } from '../../blocks/game/Features/config'
import { GameHero } from '../../blocks/game/Hero/config'
import { MediaGallery } from '../../blocks/game/MediaGallery/config'
import { TrailerEmbed } from '../../blocks/game/Trailer/config'
import { signSitePreviewToken } from '../../lib/security/sitePreviewToken'
import { revalidateGamePage, revalidateGamePageDelete } from './hooks/revalidateGamePage'
import { validatePublishedSiteConfig } from './hooks/validatePublishedSiteConfig'
import { generationField, schemaVersionField, siteField, templateField } from './siteFields'

const sitePreviewUrl = (data: Record<string, unknown> | undefined): string =>
  typeof data?.id === 'number' ? `/next/site-preview?token=${signSitePreviewToken(data.id)}` : ''

/**
 * The v7 "Page" collection: structured landing page content for a game
 * project, rendered at /g/[gameSlug]. (The `pages` slug is occupied by
 * the platform marketing pages, hence `game-pages`.)
 */
export const GamePages: CollectionConfig = {
  slug: 'game-pages',
  access: {
    read: ({ req }) => {
      if (req.user) return true
      return { _status: { equals: 'published' } }
    },
    create: tenantMemberAccess,
    update: tenantMemberAccess,
    delete: tenantOwnerAccess,
  },
  admin: {
    components: {
      edit: {
        beforeDocumentControls: ['@/components/admin/game-pages/GenerateSiteControl'],
      },
    },
    defaultColumns: ['title', 'gameProject', 'kind', '_status', 'updatedAt'],
    group: 'Game Portal',
    livePreview: {
      url: ({ data }) => sitePreviewUrl(data),
    },
    preview: (data) => sitePreviewUrl(data as Record<string, unknown>),
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
      name: 'kind',
      type: 'select',
      defaultValue: 'landing',
      options: [{ label: 'Landing Page', value: 'landing' }],
      required: true,
      admin: {
        position: 'sidebar',
      },
    },
    {
      name: 'title',
      type: 'text',
      required: true,
    },
    templateField,
    schemaVersionField,
    siteField,
    generationField,
    {
      // Legacy v7 block composition, hidden since the flagship template
      // shipped. Existing published block pages keep rendering from it
      // until a flagship configuration is published; the columns are
      // dropped in a later cleanup migration.
      name: 'content',
      type: 'blocks',
      admin: {
        hidden: true,
      },
      blocks: [GameHero, GameFeatures, MediaGallery, GameCTA, TrailerEmbed],
    },
  ],
  hooks: {
    afterChange: [revalidateGamePage],
    afterDelete: [revalidateGamePageDelete],
    beforeChange: [validatePublishedSiteConfig],
    beforeValidate: [
      // One page per kind per project (compound index is the hard
      // guarantee; this produces a friendly error).
      async ({ data, originalDoc, req }) => {
        const project = data?.gameProject ?? originalDoc?.gameProject
        const kind = data?.kind ?? originalDoc?.kind ?? 'landing'
        if (!project) return data

        const projectID = typeof project === 'object' ? project.id : project
        const existing = await req.payload.find({
          collection: 'game-pages',
          depth: 0,
          limit: 1,
          overrideAccess: true,
          where: {
            and: [
              { gameProject: { equals: projectID } },
              { kind: { equals: kind } },
              ...(originalDoc?.id ? [{ id: { not_equals: originalDoc.id } }] : []),
            ],
          },
        })
        if (existing.totalDocs > 0) {
          throw new ValidationError({
            collection: 'game-pages',
            errors: [
              {
                message: 'This game project already has a page of this kind.',
                path: 'kind',
              },
            ],
          })
        }
        return data
      },
    ],
  },
  indexes: [
    {
      fields: ['gameProject', 'kind'],
      unique: true,
    },
  ],
  timestamps: true,
  versions: {
    drafts: true,
    maxPerDoc: 25,
  },
}
