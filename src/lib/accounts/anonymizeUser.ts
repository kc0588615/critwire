import { randomBytes } from 'node:crypto'

import type { PayloadRequest } from 'payload'

import type { User } from '@/payload-types'

export const DELETED_USER_NAME = 'Deleted user'

/**
 * Scrubs a deleted account (plans/2026-10-04-legal-launch.md, Goal 6) in
 * `req`'s transaction: a `.invalid` email (reserved, never delivered),
 * "Deleted user", a random password, no super admin role, no sessions
 * (which revokes every JWT) and no reset or verification token. Its studio
 * memberships, `Tenants.createdBy` and legal acceptances stay, and now
 * name no one. It reads the account back and throws unless the email
 * changed and no session is left. Returns the scrubbed account, as
 * Payload's `update` returns what it saved.
 */
export async function anonymizeUser({ id, req }: { id: number; req: PayloadRequest }): Promise<User> {
  const email = `deleted-${id}@deleted.invalid`
  const user = await req.payload.update({
    collection: 'users',
    id,
    // `guardAccountDeletion` lets this one write through, and
    // `anonymizeDeletedUser` doesn't run again.
    context: { anonymizing: true },
    data: {
      email,
      name: DELETED_USER_NAME,
      password: randomBytes(32).toString('base64url'),
      roles: ['user'],
      sessions: [],
      _verificationToken: null,
      resetPasswordExpiration: null,
      resetPasswordToken: null,
    },
    depth: 0,
    overrideAccess: true,
    req,
  })

  const saved = await req.payload.findByID({
    collection: 'users',
    id,
    depth: 0,
    overrideAccess: true,
    req,
    select: { email: true, sessions: true },
    showHiddenFields: true,
  })
  if (saved.email !== email || saved.sessions?.length) {
    throw new Error(`Anonymizing user ${id} failed: its email or sessions were not cleared.`)
  }
  return user
}
