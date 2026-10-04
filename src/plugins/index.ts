import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { s3Storage } from '@payloadcms/storage-s3'
import { Plugin } from 'payload'
import { GenerateTitle, GenerateURL } from '@payloadcms/plugin-seo/types'

import { Config, Page } from '@/payload-types'
import { isSuperAdmin } from '@/access/isSuperAdmin'
import { mediaFileReadOverride } from '@/access/publicRead'
import { requireLegalAcceptance } from '@/access/legalWrite'
import { enforceTenantWrite } from '@/access/tenantWrite'
import { getServerSideURL } from '@/utilities/getURL'

const generateTitle: GenerateTitle<Page> = ({ doc }) => {
  return doc?.title ? `${doc.title} | Critwire` : 'Critwire'
}

const generateURL: GenerateURL<Page> = ({ doc }) => {
  const url = getServerSideURL()

  return doc?.slug ? `${url}/${doc.slug}` : url
}

export const plugins: Plugin[] = [
  multiTenantPlugin<Config>({
    collections: {
      'game-projects': {},
      'patch-notes': {},
      issues: {},
      'issue-reports': {},
      'issue-votes': {},
      // Signed-in visitors can still load other portals' files.
      media: { accessResultOverride: mediaFileReadOverride },
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
      // Only super admins assign users to studios. A new user gets their
      // own studio through onboarding, and there are no invites.
      arrayFieldAccess: {
        create: ({ req }) => isSuperAdmin(req.user),
        update: ({ req }) => isSuperAdmin(req.user),
      },
    },
    // Membership and suspension, then the legal gate, on every save
    // including drafts. The plugin's own validator only checks the tenant
    // is present.
    tenantField: { hooks: { beforeChange: [enforceTenantWrite, requireLegalAcceptance] } },
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
  seoPlugin({
    generateTitle,
    generateURL,
  }),
]
