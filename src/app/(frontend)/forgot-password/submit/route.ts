import config from '@payload-config'
import * as Sentry from '@sentry/nextjs'
import { getPayload } from 'payload'
import { z } from 'zod'

import { checkAccountEmailBudget } from '@/lib/accounts/emailBudget'
import { isEmailDeliverable } from '@/lib/email/adapter'
import { getLogger } from '@/lib/logger'
import { formResponse, guardPublicForm } from '@/lib/public-forms/guard'

const log = getLogger('password-recovery')

const recoverySchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
})

const FORGOT = '/admin/forgot'

/**
 * Sends a password reset link (§4a): the only way to, since Payload's own
 * endpoints refuse non-local calls (`restrictPasswordRecovery`). Every
 * accepted address gets "Check your inbox", so the form doesn't reveal
 * which addresses have accounts.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const guard = await guardPublicForm({
      rateLimit: { key: 'password-reset', limit: 5, scope: 'password-reset', windowSeconds: 60 * 60 },
      req,
      schema: recoverySchema,
    })
    if (!guard.ok) return formResponse({ json: { error: guard.error }, path: FORGOT, req, status: guard.status })

    // Production without Resend: the link would reach nobody.
    if (!isEmailDeliverable()) {
      throw new Error('Password recovery refused: email is not deliverable (set RESEND_API_KEY).')
    }

    const { email } = guard.data
    if (await checkAccountEmailBudget(email)) {
      // Silent for unknown addresses.
      await (await getPayload({ config })).forgotPassword({ collection: 'users', data: { email } })
    } else {
      log.warn({ msg: 'Password recovery: the address is over its email budget; nothing sent.' })
    }

    return formResponse({ json: { ok: true }, path: FORGOT, req, status: 200 })
  } catch (err) {
    Sentry.captureException(err)
    log.error({ err, msg: 'Password recovery failed.' })
    return formResponse({ json: { error: 'Something went wrong.' }, path: FORGOT, req, status: 500 })
  }
}
