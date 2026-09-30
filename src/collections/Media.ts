import type { CollectionConfig } from 'payload'

import {
  FixedToolbarFeature,
  InlineToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { authenticated } from '../access/authenticated'
import { mediaRead } from '../access/publicRead'
import { checkMediaLimit } from '../lib/limits/hooks'
import { MEDIA_DIR } from '../lib/media/storage'

/** Display sizes are WebP, which the image optimizer used to convert to. */
const webp = { format: 'webp' } as const

export const Media: CollectionConfig = {
  slug: 'media',
  folders: true,
  access: {
    create: authenticated,
    delete: authenticated,
    read: mediaRead,
    update: authenticated,
  },
  hooks: {
    beforeChange: [checkMediaLimit],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      //required: true,
    },
    {
      name: 'caption',
      type: 'richText',
      editor: lexicalEditor({
        features: ({ rootFeatures }) => {
          return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()]
        },
      }),
    },
  ],
  upload: {
    // The portal only shows raster images. Anything else (a scripted SVG, a
    // PDF, an archive) would be served from the admin's origin.
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif'],
    // Outside `public/`, so `/api/media/file/` is the only way to a file.
    staticDir: MEDIA_DIR,
    // Browsers may keep a file for 5 minutes; shared caches (Cloudflare)
    // may not, so a suspension or a hold takes the file down within 5 minutes.
    modifyResponseHeaders: ({ headers }) => {
      headers.set('Cache-Control', 'private, max-age=300')
      return headers
    },
    adminThumbnail: 'thumbnail',
    focalPoint: true,
    imageSizes: [
      {
        name: 'thumbnail',
        width: 300,
        formatOptions: webp,
      },
      {
        name: 'square',
        width: 500,
        height: 500,
        formatOptions: webp,
      },
      {
        name: 'small',
        width: 600,
        formatOptions: webp,
      },
      {
        name: 'medium',
        width: 900,
        formatOptions: webp,
      },
      {
        name: 'large',
        width: 1400,
        formatOptions: webp,
      },
      {
        name: 'xlarge',
        width: 1920,
        formatOptions: webp,
      },
      {
        name: 'og',
        width: 1200,
        height: 630,
        crop: 'center',
      },
    ],
  },
}
