import { createHash } from 'node:crypto'

import { checkRateLimit } from '@/lib/upstash/rate-limit'

/**
 * Takes one account email from `email`'s budget: 3 an hour, shared by
 * signup and password recovery, so nobody can flood an inbox from many
 * IPs through either form. Resolves `false` when the budget is spent.
 * The address is hashed, so Upstash never holds it.
 */
export const checkAccountEmailBudget = async (email: string): Promise<boolean> => {
  const { success } = await checkRateLimit({
    identifier: createHash('sha256').update(email.trim().toLowerCase()).digest('hex'),
    key: 'account-email',
    limit: 3,
    windowSeconds: 60 * 60,
  })
  return success
}
