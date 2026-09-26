import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { nestedDocsPlugin } from '@payloadcms/plugin-nested-docs'
import { redirectsPlugin } from '@payloadcms/plugin-redirects'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { searchPlugin } from '@payloadcms/plugin-search'
import { s3Storage } from '@payloadcms/storage-s3'
import { Plugin } from 'payload'
import { revalidateRedirects } from '@/hooks/revalidateRedirects'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'
import { FixedToolbarFeature, HeadingFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { searchFields } from '@/search/fieldOverrides'
import { beforeSyncWithSearch } from '@/search/beforeSync'

import { Config, Page, Post } from '@/payload-types'
import { isSuperAdmin, superAdminOnly } from '@/access/isSuperAdmin'
import { validateTenantMembership } from '@/access/tenantAccess'
import { getServerSideURL } from '@/utilities/getURL'

const generateTitle: GenerateTitle<Post | Page> = ({ doc }) => {
  return doc?.title ? `${doc.title} | Critwire` : 'Critwire'
}

const generateURL: GenerateURL<Post | Page> = ({ doc }) => {
  const url = getServerSideURL()

  return doc?.slug ? `${url}/${doc.slug}` : url
}

export const plugins: Plugin[] = [
  multiTenantPlugin<Config>({
    collections: {
      'game-projects': {},
      'game-pages': {},
      'patch-notes': {},
      issues: {},
      'issue-reports': {},
      'issue-votes': {},
      media: {},
      'payload-folders': {},
      // `pages` is deliberately NOT tenant-scoped: it is the platform
      // marketing site, managed by super admins only.
    },
    tenantsArrayField: {
      includeDefaultField: true,
      rowFields: [
        {
          name: 'roles',
          type: 'select',
          hasMany: true,
          required: true,
          defaultValue: ['member'],
          options: [
            { label: 'Owner', value: 'owner' },
            { label: 'Member', value: 'member' },
          ],
        },
      ],
      // Only super admins assign users to tenants for now. A proper
      // invite flow arrives with onboarding (Phase 7).
      arrayFieldAccess: {
        create: ({ req }) => isSuperAdmin(req.user),
        update: ({ req }) => isSuperAdmin(req.user),
      },
    },
    // The plugin's own tenant validator only checks presence, which
    // leaves `filterOptions` enforced in the admin dropdown alone.
    tenantField: { validate: validateTenantMembership },
    userHasAccessToAllTenants: (user) => isSuperAdmin(user),
  }),
  s3Storage({
    // Disabled (local disk storage) until R2 credentials are configured.
    enabled: Boolean(process.env.R2_BUCKET),
    bucket: process.env.R2_BUCKET ?? '',
    collections: {
      media: true,
    },
    config: {
      endpoint: process.env.R2_ENDPOINT,
      // R2 is S3-compatible but region-less; 'auto' is required.
      region: 'auto',
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
      },
      forcePathStyle: true,
    },
  }),
  redirectsPlugin({
    collections: ['pages', 'posts'],
    overrides: {
      // Platform marketing site: a studio user must not redirect its URLs.
      access: {
        create: superAdminOnly,
        delete: superAdminOnly,
        update: superAdminOnly,
      },
      // @ts-expect-error - This is a valid override, mapped fields don't resolve to the same type
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'from') {
            return {
              ...field,
              admin: {
                description: 'You will need to rebuild the website when changing this field.',
              },
            }
          }
          return field
        })
      },
      hooks: {
        afterChange: [revalidateRedirects],
      },
    },
  }),
  nestedDocsPlugin({
    collections: ['categories'],
    generateURL: (docs) => docs.reduce((url, doc) => `${url}/${doc.slug}`, ''),
  }),
  seoPlugin({
    generateTitle,
    generateURL,
  }),
  formBuilderPlugin({
    fields: {
      payment: false,
    },
    // The template form builder serves the platform marketing site only.
    formOverrides: {
      access: {
        create: superAdminOnly,
        delete: superAdminOnly,
        update: superAdminOnly,
      },
      fields: ({ defaultFields }) => {
        return defaultFields.map((field) => {
          if ('name' in field && field.name === 'confirmationMessage') {
            return {
              ...field,
              editor: lexicalEditor({
                features: ({ rootFeatures }) => {
                  return [
                    ...rootFeatures,
                    FixedToolbarFeature(),
                    HeadingFeature({ enabledHeadingSizes: ['h1', 'h2', 'h3', 'h4'] }),
                  ]
                },
              }),
            }
          }
          return field
        })
      },
    },
    // Anonymous create would be a public form endpoint without Turnstile
    // or rate limiting (rule 8); update stays the plugin's `false`.
    formSubmissionOverrides: {
      access: {
        create: superAdminOnly,
        delete: superAdminOnly,
        read: superAdminOnly,
      },
    },
  }),
  searchPlugin({
    collections: ['posts'],
    beforeSync: beforeSyncWithSearch,
    searchOverrides: {
      access: {
        delete: superAdminOnly,
        update: superAdminOnly,
      },
      fields: ({ defaultFields }) => {
        return [...defaultFields, ...searchFields]
      },
    },
  }),
]
