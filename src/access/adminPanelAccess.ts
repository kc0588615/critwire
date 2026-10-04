import type { PayloadRequest } from 'payload'

import { needsLegalAcceptance } from '@/lib/legal/acceptance'

/**
 * `Users.access.admin`: a signed-in account that has accepted the current
 * Terms of Service and Privacy Policy (super admins never need to). Payload
 * runs it on every admin render and admin server function; a signed-in
 * account that fails it goes to `/admin/unauthorized`, which
 * `LegalGateView` sends on to `/legal/accept`.
 */
export const adminPanelAccess = async ({ req }: { req: PayloadRequest }): Promise<boolean> => {
  if (!req.user) return false
  return !(await needsLegalAcceptance({ payload: req.payload, req, user: req.user }))
}
