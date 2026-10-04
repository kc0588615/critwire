import config from '@payload-config'
import * as Sentry from '@sentry/nextjs'
import { getPayload } from 'payload'

import { needsLegalAcceptance, recordLegalAcceptance } from '@/lib/legal/acceptance'
import { acceptHref, LEGAL_ACCEPT_LOGIN, safeNext } from '@/lib/legal/paths'
import { getLogger } from '@/lib/logger'
import { readRequestBody } from '@/lib/public-forms/request'
import { legalConsentSchema } from '@/lib/validation/legalConsent'

const log = getLogger('legal')

const redirectTo = (req: Request, path: string): Response => Response.redirect(new URL(path, req.url), 303)

// One `next` parameter is a path; a repeated one is refused by `safeNext`.
const requestedNext = (req: Request): string | string[] => {
  const values = new URL(req.url).searchParams.getAll('next')
  return values.length === 1 ? values[0] : values
}

/**
 * Records the signed-in account's acceptance of the current Terms of
 * Service and Privacy Policy, from `/legal/accept`, then sends it on to
 * `next`. Both boxes and the versions the page showed are checked; a
 * missing box or a stale version goes back to the page with `error=1`
 * and records nothing. Authenticated and idempotent, like onboarding, so
 * no Turnstile; the session cookie is SameSite=Lax.
 */
export async function POST(req: Request): Promise<Response> {
  const next = safeNext(requestedNext(req))
  const refused = `${acceptHref(next)}&error=1`

  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) return redirectTo(req, LEGAL_ACCEPT_LOGIN)

    const parsed = legalConsentSchema.safeParse(await readRequestBody(req))
    if (!parsed.success) return redirectTo(req, refused)

    if (await needsLegalAcceptance({ payload, user })) {
      await recordLegalAcceptance({ accepted: parsed.data, payload, userID: user.id })
      log.info({ msg: 'Legal acceptance recorded.', userID: user.id })
    }

    return redirectTo(req, next)
  } catch (err) {
    Sentry.captureException(err)
    log.error({ err, msg: 'Recording a legal acceptance failed.' })
    return redirectTo(req, refused)
  }
}
