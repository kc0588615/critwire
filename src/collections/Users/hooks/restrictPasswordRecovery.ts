import type { CollectionBeforeOperationHook } from 'payload'

import { Forbidden } from 'payload'

/**
 * Only the Local API may send a reset email. That closes REST's
 * `forgot-password` and GraphQL's `forgotPasswordUsers`, so the guarded
 * `POST /forgot-password/submit` (Turnstile, rate limits) is the one way in.
 */
export const restrictPasswordRecovery: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  if (operation === 'forgotPassword' && req.payloadAPI !== 'local') throw new Forbidden(req.t)
  return args
}
