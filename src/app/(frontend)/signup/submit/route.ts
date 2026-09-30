import config from '@payload-config'
import * as Sentry from '@sentry/nextjs'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { z } from 'zod'

import { checkAccountEmailBudget } from '@/lib/accounts/emailBudget'
import { requestSignup } from '@/lib/accounts/requestSignup'
import { isEmailDeliverable } from '@/lib/email/adapter'
import { isOpenSignup, SIGNUP_PATH } from '@/lib/hosting'
import { getLogger } from '@/lib/logger'
import { formResponse, guardPublicForm } from '@/lib/public-forms/guard'

const log = getLogger('signup')

const signupSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
})

/**
 * Starts an account from an email address (§5). Every accepted address
 * gets the same answer, "Check your inbox", so the form doesn't reveal
 * which addresses have accounts. Only with open signup.
 */
export async function POST(req: Request): Promise<Response> {
  if (!isOpenSignup()) notFound()

  try {
    const guard = await guardPublicForm({
      rateLimit: { key: 'signup', limit: 5, scope: 'signup', windowSeconds: 60 * 60 },
      req,
      schema: signupSchema,
    })
    if (!guard.ok) return formResponse({ json: { error: guard.error }, path: SIGNUP_PATH, req, status: guard.status })

    // Production without Resend: the link would reach nobody.
    if (!isEmailDeliverable()) throw new Error('Signup refused: email is not deliverable (set RESEND_API_KEY).')

    const { email } = guard.data
    if (await checkAccountEmailBudget(email)) {
      await requestSignup(await getPayload({ config }), email)
    } else {
      log.warn({ msg: 'Signup: the address is over its email budget; nothing sent.' })
    }

    return formResponse({ json: { ok: true }, path: SIGNUP_PATH, req, status: 200 })
  } catch (err) {
    Sentry.captureException(err)
    log.error({ err, msg: 'Signup failed.' })
    return formResponse({ json: { error: 'Something went wrong.' }, path: SIGNUP_PATH, req, status: 500 })
  }
}
