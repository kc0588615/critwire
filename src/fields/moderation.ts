import type { Field } from 'payload'

import { superAdminFieldAccess } from '../access/isSuperAdmin'

const access = { create: superAdminFieldAccess, update: superAdminFieldAccess }

/**
 * The content filter's hold on a studio's own public text. Studios see it
 * read-only; a super admin unticks `flagged` to approve. Field access, not
 * `admin.readOnly`, so super admins can still edit it.
 */
export const moderationFields = (): Field[] => [
  {
    name: 'flagged',
    type: 'checkbox',
    defaultValue: false,
    index: true,
    access,
    admin: {
      description: 'Held for review: not public until a Critwire admin approves it.',
      position: 'sidebar',
    },
  },
  {
    name: 'flagReasons',
    type: 'textarea',
    access,
    admin: {
      condition: (data) => Boolean(data?.flagged),
      position: 'sidebar',
    },
  },
]
