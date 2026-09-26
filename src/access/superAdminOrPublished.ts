import type { Access } from 'payload'

import { isSuperAdmin } from './isSuperAdmin'

/**
 * Platform marketing content: super admins see drafts, everyone else
 * (studio users included) only published documents.
 */
export const superAdminOrPublished: Access = ({ req: { user } }) => {
  if (isSuperAdmin(user)) {
    return true
  }

  return {
    _status: {
      equals: 'published',
    },
  }
}
