import { APIError, type FieldHook, type PayloadRequest } from 'payload'

import { needsLegalAcceptance } from '@/lib/legal/acceptance'

/**
 * The API's half of the legal gate: `access.admin` keeps an account that
 * hasn't accepted the current Terms of Service and Privacy Policy out of
 * the admin, but not out of REST or GraphQL. Writes with no user (votes,
 * public submissions, jobs, Discord interactions) and super admins pass.
 * Reads, sign-in, `me` and an account's own name and password stay open:
 * `/legal/accept` needs them, and they add no content.
 */
export async function assertLegalAcceptance(req: PayloadRequest): Promise<void> {
  if (!req.user) return
  if (await needsLegalAcceptance({ payload: req.payload, req, user: req.user })) {
    throw new APIError(
      'Accept the current Terms of Service and Privacy Policy at /legal/accept before making changes.',
      403,
    )
  }
}

/**
 * `beforeChange` hook on the multi-tenant plugin's `tenant` field, beside
 * `enforceTenantWrite`, so every write to a tenant-scoped collection passes
 * it (field hooks run on every save, drafts included; not on delete).
 */
export const requireLegalAcceptance: FieldHook = async ({ req, value }) => {
  await assertLegalAcceptance(req)
  return value
}
