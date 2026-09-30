import config from '@payload-config'
import { login } from '@payloadcms/next/auth'
import * as Sentry from '@sentry/nextjs'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { z } from 'zod'

import { activateAccount, VerificationLinkUsedError } from '@/lib/accounts/activateAccount'
import { findPendingUserByToken } from '@/lib/accounts/pendingUser'
import { isOpenSignup } from '@/lib/hosting'
import { getLogger } from '@/lib/logger'
import { formResponse, guardPublicForm } from '@/lib/public-forms/guard'
import { readRequestBody } from '@/lib/public-forms/request'

const log = getLogger('signup.verify')

const verifySchema = z.object({
  password: z.string().min(8).max(128),
  token: z.string().trim().min(1).max(256),
})

/** The verify page the form was posted from, read before the guard consumes the body. */
const verifyPagePath = async (req: Request): Promise<string> => {
  const { token } = await readRequestBody(req.clone())
  return typeof token === 'string' && token ? `/verify/${encodeURIComponent(token)}` : '/signup'
}

/**
 * The verify page's form (§4): sets the pending account's first password,
 * verifies its email, signs it in with Payload's own `login`, and sends it
 * on to onboarding. A used or unknown link goes back to its page, which
 * says so. Only with open signup.
 */
export async function POST(req: Request): Promise<Response> {
  if (!isOpenSignup()) notFound()

  const path = await verifyPagePath(req)
  try {
    const guard = await guardPublicForm({
      rateLimit: { key: 'verify', limit: 10, scope: 'verify', windowSeconds: 10 * 60 },
      req,
      schema: verifySchema,
    })
    if (!guard.ok) return formResponse({ json: { error: guard.error }, path, req, status: guard.status })

    const { password, token } = guard.data
    const payload = await getPayload({ config })
    const pending = await findPendingUserByToken(payload, token)
    if (!pending) return Response.redirect(new URL(path, req.url), 303)

    try {
      await activateAccount({ password, payload, token, userID: pending.id })
    } catch (error) {
      if (error instanceof VerificationLinkUsedError) return Response.redirect(new URL(path, req.url), 303)
      throw error
    }
    log.info({ msg: 'Account verified.', userID: pending.id })

    // Payload's login sets the session cookie; Next copies it onto the redirect.
    await login({ collection: 'users', config, email: pending.email, password })
    return Response.redirect(new URL('/onboarding', req.url), 303)
  } catch (err) {
    Sentry.captureException(err)
    log.error({ err, msg: 'Verification failed.' })
    return formResponse({ json: { error: 'Something went wrong.' }, path, req, status: 500 })
  }
}
