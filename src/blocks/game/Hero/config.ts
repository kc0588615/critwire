import type { Block } from 'payload'

import { buttonsField } from '../shared'

export const GameHero: Block = {
  slug: 'gameHero',
  interfaceName: 'GameHeroBlock',
  labels: {
    plural: 'Heroes',
    singular: 'Hero',
  },
  fields: [
    {
      name: 'heading',
      type: 'text',
      admin: {
        description: 'Defaults to the game name when empty.',
      },
    },
    {
      name: 'tagline',
      type: 'textarea',
    },
    {
      name: 'backgroundImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'showLogo',
      type: 'checkbox',
      defaultValue: true,
    },
    buttonsField(2),
  ],
}
