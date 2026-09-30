import { APIError, type Payload } from 'payload'

import { withTransaction } from '@/lib/payload/withTransaction'

/** The link was used between the lookup and the activation. Nothing was changed. */
export class VerificationLinkUsedError extends Error {
  constructor() {
    super('This verification link has already been used.')
    this.name = 'VerificationLinkUsedError'
  }
}

/**
 * Sets a pending account's first password and verifies its email, in one
 * transaction. If another request used the token first, Payload's
 * `verifyEmail` refuses it, the password change rolls back, and this
 * throws `VerificationLinkUsedError`.
 */
export async function activateAccount({
  password,
  payload,
  token,
  userID,
}: {
  password: string
  payload: Payload
  token: string
  userID: number
}): Promise<void> {
  await withTransaction(payload, async (req) => {
    await payload.update({
      collection: 'users',
      id: userID,
      data: { password },
      depth: 0,
      overrideAccess: true,
      req,
    })
    try {
      await payload.verifyEmail({ collection: 'users', req, token })
    } catch (error) {
      // Payload answers an unknown token with a 403.
      if (error instanceof APIError && error.status === 403) throw new VerificationLinkUsedError()
      throw error
    }
  })
}
