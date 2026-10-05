import { AuthenticationError, type CollectionBeforeLoginHook } from 'payload'

import type { User } from '@/payload-types'

/**
 * A deleted account can't sign in. Its password is random anyway
 * (`anonymizeUser`); this is the second lock. Throwing here rolls back
 * the session the login just added.
 */
export const refuseDeletedLogin: CollectionBeforeLoginHook<User> = ({ req, user }) => {
  if (user.deleted) throw new AuthenticationError(req.t)
  return user
}
