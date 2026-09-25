import type { CollectionConfig } from 'payload'

import { slugField } from 'payload'

import { isSuperAdmin } from '../../access/isSuperAdmin'
import {
  tenantMemberAccess,
  tenantMemberFieldRead,
  tenantOwnerAccess,
} from '../../access/tenantAccess'
import { validateOptionalTallyUrl } from '../../lib/tally/parseTallyForm'
import { validateOptionalHttpUrl } from '../../lib/validation/url'
import { validateOptionalVideoUrl } from '../../lib/validation/video'
import {
  CONTACT_FORM_TARGET_OPTIONS,
  PLATFORM_OPTIONS,
  RELEASE_STATE_OPTIONS,
  REPORT_FORM_PROVIDER_OPTIONS,
  TALLY_DISPLAY_OPTIONS,
} from '../options'
import {
  revalidateGameProject,
  revalidateGameProjectDelete,
} from './hooks/revalidateGameProject'

const externalLinkField = (name: string, label: string) => ({
  name,
  type: 'text' as const,
  label,
  validate: validateOptionalHttpUrl,
})

export const GameProjects: CollectionConfig = {
  slug: 'game-projects',
  access: {
    // Project config powers the public portal; sensitive fields are
    // gated at field level below.
    read: () => true,
    create: tenantMemberAccess,
    update: tenantMemberAccess,
    delete: tenantOwnerAccess,
  },
  admin: {
    defaultColumns: ['name', 'slug', 'updatedAt'],
    group: 'Game Portal',
    useAsTitle: 'name',
  },
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    // Globally unique — it is the public URL namespace (/g/[gameSlug]).
    slugField({ useAsSlug: 'name' }),
    {
      name: 'description',
      type: 'textarea',
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'banner',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'accentColor',
      type: 'text',
      admin: {
        description: 'Hex color, e.g. #7c3aed',
      },
      validate: (value: null | string | string[] | undefined) => {
        if (value == null || value === '') return true
        if (typeof value !== 'string' || !/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) {
          return 'Must be a hex color like #7c3aed.'
        }
        return true
      },
    },
    {
      // Approved fact URLs. The flagship template's action registry and
      // AI generation may SELECT these by ref, never rewrite them.
      name: 'links',
      type: 'group',
      admin: {
        description: 'External links shown on the public portal.',
      },
      fields: [
        externalLinkField('website', 'Website'),
        externalLinkField('steam', 'Steam'),
        externalLinkField('epic', 'Epic Games Store'),
        externalLinkField('itch', 'itch.io'),
        externalLinkField('discord', 'Discord'),
        externalLinkField('support', 'Support'),
        externalLinkField('docs', 'Documentation'),
        externalLinkField('merch', 'Merch Store'),
        externalLinkField('playstation', 'PlayStation Store'),
        externalLinkField('xbox', 'Xbox Store'),
        externalLinkField('nintendo', 'Nintendo eShop'),
        externalLinkField('gog', 'GOG'),
        externalLinkField('youtube', 'YouTube Channel'),
        externalLinkField('pressKit', 'Press Kit'),
        externalLinkField('privacy', 'Privacy Policy'),
        externalLinkField('terms', 'Terms of Service'),
        {
          name: 'trailer',
          type: 'text',
          label: 'Trailer Video',
          admin: {
            description: 'YouTube or Vimeo video URL used by the landing page trailer section.',
          },
          validate: validateOptionalVideoUrl,
        },
      ],
    },
    {
      name: 'availability',
      type: 'group',
      admin: {
        description:
          'Release and platform facts shown on the public portal (and used by AI site generation).',
      },
      fields: [
        {
          name: 'releaseState',
          type: 'select',
          defaultValue: 'comingSoon',
          options: [...RELEASE_STATE_OPTIONS],
        },
        {
          name: 'releaseDate',
          type: 'date',
        },
        {
          name: 'currentVersion',
          type: 'text',
          admin: {
            description: 'e.g. v1.2.0',
          },
          maxLength: 40,
        },
        {
          name: 'demoUrl',
          type: 'text',
          validate: validateOptionalHttpUrl,
        },
        {
          // Array order is the priority order: the first platform with
          // a store URL is the "primary store" action target.
          name: 'platforms',
          type: 'array',
          fields: [
            {
              name: 'platform',
              type: 'select',
              options: [...PLATFORM_OPTIONS],
              required: true,
            },
            {
              name: 'storeUrl',
              type: 'text',
              validate: validateOptionalHttpUrl,
            },
            {
              name: 'label',
              type: 'text',
              admin: {
                description: 'Optional availability note, e.g. "Demo available".',
              },
              maxLength: 40,
            },
          ],
          maxRows: 12,
        },
      ],
    },
    {
      name: 'meta',
      type: 'group',
      admin: {
        description: 'Optional credits shown on the public portal.',
      },
      fields: [
        { name: 'developer', type: 'text', maxLength: 80 },
        { name: 'publisher', type: 'text', maxLength: 80 },
        { name: 'engine', type: 'text', maxLength: 80 },
        { name: 'rating', type: 'text', maxLength: 80 },
      ],
    },
    {
      name: 'contact',
      type: 'group',
      admin: {
        description: 'Where public contact form submissions are routed.',
      },
      fields: [
        {
          name: 'target',
          type: 'select',
          defaultValue: 'EMAIL',
          options: [...CONTACT_FORM_TARGET_OPTIONS],
        },
        {
          name: 'email',
          type: 'email',
          access: {
            read: tenantMemberFieldRead,
          },
          admin: {
            condition: (_, siblingData) => siblingData?.target === 'EMAIL',
          },
        },
        {
          // Anyone holding this URL can post to the studio's Discord —
          // never expose it publicly.
          name: 'discordWebhookUrl',
          type: 'text',
          access: {
            read: tenantMemberFieldRead,
          },
          admin: {
            condition: (_, siblingData) => siblingData?.target === 'DISCORD_WEBHOOK',
          },
          validate: validateOptionalHttpUrl,
        },
        {
          name: 'externalUrl',
          type: 'text',
          admin: {
            condition: (_, siblingData) => siblingData?.target === 'EXTERNAL_URL',
          },
          validate: validateOptionalHttpUrl,
        },
        {
          name: 'tallyUrl',
          type: 'text',
          admin: {
            condition: (_, siblingData) => siblingData?.target === 'TALLY',
            description:
              'Tally share URL (https://tally.so/r/…) or form ID. Submissions stay in Tally.',
          },
          validate: validateOptionalTallyUrl,
        },
        {
          name: 'tallyDisplay',
          type: 'select',
          defaultValue: 'embed',
          options: [...TALLY_DISPLAY_OPTIONS],
          admin: {
            condition: (_, siblingData) => siblingData?.target === 'TALLY',
          },
        },
      ],
    },
    {
      name: 'reportForm',
      type: 'group',
      admin: {
        description:
          'Player bug/report intake. Prefer Tally so submissions and spam handling stay on their free tier.',
      },
      fields: [
        {
          name: 'provider',
          type: 'select',
          defaultValue: 'native',
          options: [...REPORT_FORM_PROVIDER_OPTIONS],
        },
        {
          name: 'tallyUrl',
          type: 'text',
          admin: {
            condition: (_, siblingData) => siblingData?.provider === 'tally',
            description: 'Tally share URL or form ID. Submissions are managed in Tally, not Critwire.',
          },
          validate: validateOptionalTallyUrl,
        },
        {
          name: 'tallyDisplay',
          type: 'select',
          defaultValue: 'embed',
          options: [...TALLY_DISPLAY_OPTIONS],
          admin: {
            condition: (_, siblingData) => siblingData?.provider === 'tally',
          },
        },
        {
          name: 'externalUrl',
          type: 'text',
          admin: {
            condition: (_, siblingData) => siblingData?.provider === 'external',
            description: 'GitHub issue template, Linear form, Discord channel invite, etc.',
          },
          validate: validateOptionalHttpUrl,
        },
      ],
    },
    {
      name: 'customDomain',
      type: 'text',
      admin: {
        description: 'Custom domain (Phase 8). Verification required before it serves traffic.',
        position: 'sidebar',
      },
      hooks: {
        beforeValidate: [
          ({ value }) => {
            if (typeof value !== 'string') return value
            const normalized = value
              .trim()
              .toLowerCase()
              .replace(/^https?:\/\//, '')
              .replace(/\/.*$/, '')
            return normalized || null
          },
        ],
      },
      index: true,
      unique: true,
    },
    {
      name: 'customDomainVerified',
      type: 'checkbox',
      access: {
        // Set by the Phase 8 verification flow (or a super admin) only.
        update: ({ req }) => isSuperAdmin(req.user),
      },
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      defaultValue: false,
    },
  ],
  hooks: {
    afterChange: [revalidateGameProject],
    afterDelete: [revalidateGameProjectDelete],
  },
  timestamps: true,
}
