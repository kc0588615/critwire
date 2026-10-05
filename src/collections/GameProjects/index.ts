import type { CollectionConfig, Condition } from 'payload'

import { slugField } from 'payload'

import { discordLinkFieldAccess } from '../../access/discordLink'
import { superAdminFieldAccess } from '../../access/isSuperAdmin'
import { gameProjectsRead } from '../../access/publicRead'
import {
  tenantMemberAccess,
  tenantMemberFieldRead,
  tenantOwnerAccess,
} from '../../access/tenantAccess'
import { GAME_SHARE_VIEW_PATH } from '../../lib/admin/paths'
import { moderationFields } from '../../fields/moderation'
import { screenTextHook } from '../../hooks/screenText'
import { checkGamesLimit } from '../../lib/limits/hooks'
import { validateOptionalTallyUrl } from '../../lib/tally/parseTallyForm'
import {
  validateContactDiscordWebhookUrl,
  validateDiscordWebhookUrl,
} from '../../lib/validation/discordWebhook'
import { validateOptionalHttpUrl } from '../../lib/validation/url'
import {
  CONTACT_FORM_TARGET_OPTIONS,
  PLATFORM_OPTIONS,
  RELEASE_STATE_OPTIONS,
  REPORT_FORM_PROVIDER_OPTIONS,
  TALLY_DISPLAY_OPTIONS,
} from '../options'
import { deleteGameContent } from './hooks/deleteGameContent'
import {
  revalidateGameProject,
  revalidateGameProjectDelete,
} from './hooks/revalidateGameProject'
import { gameSlugify, rejectReservedGameSlug } from './reservedSlug'
import { themeField, validateProjectTheme } from './theme'
import type { GameProject } from '../../payload-types'

const externalLinkField = (name: string, label: string) => ({
  name,
  type: 'text' as const,
  label,
  validate: validateOptionalHttpUrl,
})

// The content filter holds a game whose name or pitch it flags.
const screenGameText = screenTextHook<GameProject>(
  ({ name, description }) => `${name ?? ''}\n\n${description ?? ''}`,
)

// The ideas and review settings apply only to Critwire's own form.
const isNativeReportForm: Condition = (_, siblingData) => siblingData?.provider === 'native'

export const GameProjects: CollectionConfig = {
  slug: 'game-projects',
  access: {
    // Project config powers the public portal; sensitive fields are
    // gated at field level below.
    read: gameProjectsRead,
    create: tenantMemberAccess,
    update: tenantMemberAccess,
    delete: tenantOwnerAccess,
  },
  admin: {
    components: {
      views: {
        edit: {
          // "Put critwire on your site": the game's links, buttons and badge.
          share: {
            Component: '@/components/admin/share/ShareView',
            path: GAME_SHARE_VIEW_PATH,
            tab: { href: GAME_SHARE_VIEW_PATH, label: 'Share', order: 100 },
          },
        },
      },
    },
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
    slugField({ slugify: gameSlugify, useAsSlug: 'name' }),
    {
      name: 'description',
      type: 'textarea',
      label: 'Pitch',
      maxLength: 240,
      admin: {
        description: 'One line under the name on your portal and in link previews.',
      },
    },
    {
      name: 'logo',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'banner',
      type: 'upload',
      label: 'Key art',
      relationTo: 'media',
    },
    themeField,
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
        externalLinkField('playstation', 'PlayStation Store'),
        externalLinkField('xbox', 'Xbox Store'),
        externalLinkField('nintendo', 'Nintendo eShop'),
        externalLinkField('gog', 'GOG'),
        externalLinkField('youtube', 'YouTube Channel'),
        externalLinkField('pressKit', 'Press Kit'),
        externalLinkField('privacy', 'Privacy Policy'),
        externalLinkField('terms', 'Terms of Service'),
      ],
    },
    {
      name: 'availability',
      type: 'group',
      admin: {
        description:
          'Release and platform facts shown on the public portal.',
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
          validate: validateContactDiscordWebhookUrl,
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
      label: 'Player feedback',
      admin: {
        description:
          'How players send bug reports and ideas. Prefer Tally so submissions and spam handling stay on their free tier.',
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
        {
          name: 'acceptIdeas',
          type: 'checkbox',
          defaultValue: true,
          label: 'Accept ideas',
          admin: {
            condition: isNativeReportForm,
            description: 'Players can suggest ideas as well as report bugs.',
          },
        },
        {
          name: 'reviewSubmissions',
          type: 'checkbox',
          defaultValue: true,
          label: "Review submissions before they're public",
          admin: {
            condition: isNativeReportForm,
            description:
              'When off, clean submissions publish at once. Submissions the content filter flags always wait for review, and turning this off does not publish submissions already waiting.',
          },
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
        create: superAdminFieldAccess,
        update: superAdminFieldAccess,
      },
      admin: {
        position: 'sidebar',
        readOnly: true,
      },
      defaultValue: false,
    },
    {
      // The game's Discord server and the webhook critwire posts through.
      // Only the "Add critwire to your Discord" flow writes it; the
      // webhook URL lets anyone post to the studio's channel.
      name: 'discord',
      type: 'group',
      label: 'Discord',
      access: {
        create: discordLinkFieldAccess,
        read: tenantMemberFieldRead,
        update: discordLinkFieldAccess,
      },
      admin: {
        condition: (data) => Boolean(data?.discord?.guildId),
        description: 'Managed from the Share tab.',
        position: 'sidebar',
        readOnly: true,
      },
      fields: [
        {
          name: 'guildId',
          type: 'text',
          label: 'Server ID',
          index: true,
        },
        {
          name: 'channelId',
          type: 'text',
          label: 'Channel ID',
        },
        {
          name: 'webhookUrl',
          type: 'text',
          label: 'Webhook URL',
          validate: validateDiscordWebhookUrl,
        },
      ],
    },
    ...moderationFields(),
  ],
  hooks: {
    beforeValidate: [rejectReservedGameSlug],
    beforeChange: [validateProjectTheme, checkGamesLimit, screenGameText],
    afterChange: [revalidateGameProject],
    afterDelete: [revalidateGameProjectDelete],
    beforeDelete: [deleteGameContent],
  },
  timestamps: true,
}
