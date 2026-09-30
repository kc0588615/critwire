import type { CollectionBeforeChangeHook } from 'payload'

import type { User } from '@/payload-types'

import { isSuperAdmin } from '../../../access/isSuperAdmin'

/**
 * A super admin vouches for the users they create, so those start
 * verified and receive `accountCreatedEmail`, never a live verification link.
 */
export const verifyUsersSuperAdminsCreate: CollectionBeforeChangeHook<User> = ({ data, operation, req }) => {
  if (operation === 'create' && isSuperAdmin(req.user)) {
    return { ...data, _verified: true }
  }
  return data
}
