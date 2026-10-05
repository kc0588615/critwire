import type { CollectionAfterChangeHook } from 'payload'

import type { User } from '@/payload-types'

import { anonymizeUser } from '../../../lib/accounts/anonymizeUser'

/**
 * When a super admin ticks `deleted`, scrubs the account in the same
 * transaction, and returns the scrubbed account so the admin shows it.
 */
export const anonymizeDeletedUser: CollectionAfterChangeHook<User> = async ({ context, doc, previousDoc, req }) => {
  if (!doc.deleted || previousDoc?.deleted || context.anonymizing) return doc
  return anonymizeUser({ id: doc.id, req })
}
