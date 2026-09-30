import type { Payload } from 'payload'

/** An account that signed up and hasn't opened its verification link yet. */
export interface PendingUser {
  id: number
  email: string
}

/**
 * The unverified account `token` verifies, or `null`: a verified user's
 * token (a used link, or a user a super admin created) never matches.
 */
export async function findPendingUserByToken(payload: Payload, token: string): Promise<null | PendingUser> {
  if (!token) return null
  const { docs } = await payload.find({
    collection: 'users',
    depth: 0,
    limit: 1,
    overrideAccess: true,
    pagination: false,
    showHiddenFields: true,
    where: { and: [{ _verificationToken: { equals: token } }, { _verified: { equals: false } }] },
  })
  const [user] = docs
  return user ? { email: user.email, id: user.id } : null
}
