import type { CollectionConfig } from 'payload'

import { slugField } from 'payload'

import { isSuperAdmin } from '../../access/isSuperAdmin'
import {
  tenantMemberAccess,
  tenantMemberFieldRead,
  tenantOwnerAccess,
} from '../../access/tenantAccess'
import { validateOptionalHttpUrl } from '../../lib/validation/url'
import { CONTACT_FORM_TARGET_OPTIONS } from '../options'

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
  timestamps: true,
}
