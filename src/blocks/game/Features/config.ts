import type { Block } from 'payload'

export const GameFeatures: Block = {
  slug: 'gameFeatures',
  interfaceName: 'GameFeaturesBlock',
  labels: {
    plural: 'Feature Grids',
    singular: 'Feature Grid',
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
          name: 'title',
          type: 'text',
          required: true,
        },
        {
          name: 'description',
          type: 'textarea',
        },
        {
          name: 'image',
          type: 'upload',
          relationTo: 'media',
        },
      ],
      maxRows: 8,
      minRows: 1,
      required: true,
    },
  ],
}
