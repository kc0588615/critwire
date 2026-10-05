import { isDeepStrictEqual } from 'node:util'

import { type CollectionBeforeChangeHook, ValidationError } from 'payload'

import type { User } from '@/payload-types'

// What a deleted account keeps as `anonymizeUser` left it. Only its studio
// memberships (`tenants`) can still change.
const FINAL_FIELDS = ['deleted', 'email', 'name', 'roles', '_verified'] as const

/**
 * `deleted` is a terminal state. Refuses a super admin deleting their own
 * account, and any change to a deleted account but its memberships,
 * unticking `deleted` and a new password included. `anonymizeUser`'s own
 * write passes (`context.anonymizing`).
 */
export const guardAccountDeletion: CollectionBeforeChangeHook<User> = ({
  collection,
  context,
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation !== 'update' || !originalDoc || context.anonymizing) return data

  const refuse = (path: string, message: string): never => {
    throw new ValidationError({ collection: collection.slug, errors: [{ message, path }] })
  }
  if (data.deleted && !originalDoc.deleted && req.user?.id === originalDoc.id) {
    refuse('deleted', 'You can’t delete your own account.')
  }
  if (originalDoc.deleted) {
    const changed = FINAL_FIELDS.find(
      (field) => data[field] !== undefined && !isDeepStrictEqual(data[field], originalDoc[field]),
    )
    if (changed) refuse(changed, 'This account was deleted and can’t be changed.')
    if (data.password) refuse('password', 'This account was deleted and can’t be changed.')
  }
  return data
}
