import type { Field } from 'payload'

import { validateOptionalHttpUrl } from '../../lib/validation/url'

/**
 * Simple external-link buttons for landing page blocks. Game portals
 * link out (Steam, Discord, …) — no internal doc references needed.
 */
export const buttonsField = (maxRows = 2): Field => ({
  name: 'buttons',
  type: 'array',
  admin: {
    description: 'Call-to-action buttons linking out (store page, Discord, …).',
  },
  fields: [
    {
      name: 'label',
      type: 'text',
      required: true,
    },
    {
      name: 'url',
      type: 'text',
      required: true,
      validate: validateOptionalHttpUrl,
    },
    {
      name: 'variant',
      type: 'select',
      defaultValue: 'primary',
      options: [
        { label: 'Primary', value: 'primary' },
        { label: 'Secondary', value: 'secondary' },
      ],
    },
  ],
  maxRows,
})
