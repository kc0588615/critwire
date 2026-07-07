import type { Block } from 'payload'

import { buttonsField } from '../shared'

export const GameCTA: Block = {
  slug: 'gameCTA',
  interfaceName: 'GameCTABlock',
  labels: {
    plural: 'Calls to Action',
    singular: 'Call to Action',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      required: true,
    },
    {
      name: 'text',
      type: 'textarea',
    },
    buttonsField(2),
  ],
}
