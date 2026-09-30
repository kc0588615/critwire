import config from '@payload-config'
import * as Sentry from '@sentry/nextjs'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { z } from 'zod'

import { portalPaths } from '@/lib/game-portal/paths'
import { storeLinkKey } from '@/lib/game-portal/links'
import { isOpenSignup } from '@/lib/hosting'
import { getLogger } from '@/lib/logger'
import { createStudio, StudioExistsError } from '@/lib/onboarding/createStudio'
import { findOnboardedProject } from '@/lib/onboarding/findOnboardedProject'
import { readRequestBody } from '@/lib/public-forms/request'

const log = getLogger('onboarding')

const httpURL = z.string().trim().max(2048).pipe(z.url({ protocol: /^https?$/ }))

const onboardingSchema = z.object({
  name: z.string().trim().min(1).max(80),
  store: httpURL.optional().or(z.literal('')),
  website: httpURL,
})

const ONBOARDING = '/onboarding'

const redirectTo = (req: Request, path: string): Response => Response.redirect(new URL(path, req.url), 303)

/**
 * Creates a verified user's studio and first game from the onboarding form,
 * then sends them to their live portal (§6). Only with open signup.
 */
export async function POST(req: Request): Promise<Response> {
  if (!isOpenSignup()) notFound()

  try {
    const payload = await getPayload({ config })
    const { user } = await payload.auth({ headers: req.headers })
    if (!user) return redirectTo(req, `/admin/login?redirect=${encodeURIComponent(ONBOARDING)}`)
    // Payload never authenticates an unverified user; fail loud if that breaks.
    if (user._verified !== true) throw new Error(`Onboarding: user ${user.id} is signed in but not verified.`)
    if (user.tenants?.length) return redirectTo(req, '/admin')

    const parsed = onboardingSchema.safeParse(await readRequestBody(req))
    if (!parsed.success) return redirectTo(req, `${ONBOARDING}?error=1`)

    const { name, store, website } = parsed.data
    const storeKey = store ? storeLinkKey(store) : null
    if (store && !storeKey) return redirectTo(req, `${ONBOARDING}?error=store`)

    try {
      await createStudio({
        input: { name, store: store && storeKey ? { key: storeKey, url: store } : undefined, website },
        payload,
        user,
      })
    } catch (error) {
      if (error instanceof StudioExistsError) return redirectTo(req, '/admin')
      throw error
    }

    const project = await findOnboardedProject(payload, user.id)
    if (!project) throw new Error(`Onboarding: user ${user.id}'s new studio has no game.`)
    log.info({ msg: 'Studio onboarded.', projectID: project.id, userID: user.id })

    return redirectTo(req, project.flagged ? `${ONBOARDING}?held=1` : `${portalPaths(project.slug).hub}?welcome=1`)
  } catch (err) {
    Sentry.captureException(err)
    log.error({ err, msg: 'Onboarding failed.' })
    return redirectTo(req, `${ONBOARDING}?error=1`)
  }
}
