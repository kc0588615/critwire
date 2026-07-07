import type { Block } from 'payload'

export const MediaGallery: Block = {
  slug: 'mediaGallery',
  interfaceName: 'MediaGalleryBlock',
  labels: {
    plural: 'Media Galleries',
    singular: 'Media Gallery',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
    },
    {
      name: 'items',
      type: 'array',
      fields: [
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
        {
          name: 'caption',
          type: 'text',
        },
      ],
      maxRows: 12,
      minRows: 1,
      required: true,
    },
  ],
}
