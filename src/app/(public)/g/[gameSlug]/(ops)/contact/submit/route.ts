import config from '@payload-config'
import * as Sentry from '@sentry/nextjs'
import { getPayload } from 'payload'
import { z } from 'zod'

import { getContactRoute } from '@/lib/game-portal/formRoutes'
import { getGameProject } from '@/lib/game-portal/getGameProject'
import { formResponse, guardPublicForm } from '@/lib/public-forms/guard'
import { getLogger } from '@/lib/logger'

const log = getLogger('public.contact')

const contactSchema = z.object({
  email: z.email().optional().or(z.literal('')),
  message: z.string().trim().min(10).max(5000),
  name: z.string().trim().max(120).optional().or(z.literal('')),
  subject: z.string().trim().max(160).optional().or(z.literal('')),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameSlug: string }> },
): Promise<Response> {
  const { gameSlug } = await params
  const path = `/g/${gameSlug}/contact`

  try {
    const guard = await guardPublicForm({
      rateLimit: { key: 'contact-form', limit: 5, scope: gameSlug, windowSeconds: 60 },
      req,
      schema: contactSchema,
    })
    if (!guard.ok) {
      return formResponse({ json: { error: guard.error }, path, req, status: guard.status })
    }

    const project = await getGameProject(gameSlug)
    if (!project?.tenant) {
      return formResponse({ json: { error: 'Game not found.' }, path, req, status: 404 })
    }

    const route = await getContactRoute(gameSlug)
    if (route?.kind !== 'form') {
      return formResponse({ json: { error: 'Contact is not configured.' }, path, req, status: 400 })
    }

    const { target } = route
    const input = {
      email: guard.data.email || '',
      gameSlug,
      message: guard.data.message,
      name: guard.data.name || '',
      projectID: String(project.id),
      subject: guard.data.subject || '',
    }

    const payload = await getPayload({ config })
    log.info({ msg: 'Queueing contact form job.', projectID: project.id, target })
    const job = await payload.jobs.queue({
      input,
      queue: 'default',
      task: target === 'EMAIL' ? 'email-contact-form' : 'discord-webhook',
    })
    // Only this submission's job runs here; a failed one stays queued for the
    // autoRun cron to retry.
    await payload.jobs.runByID({ id: job.id })

    log.info({ msg: 'Public contact form submitted.', projectID: project.id, target })

    return formResponse({ json: { ok: true }, path, req, status: 200 })
  } catch (err) {
    Sentry.captureException(err)
    log.error({ err, msg: 'Public contact form submission failed.' })
    return formResponse({ json: { error: 'Something went wrong.' }, path, req, status: 500 })
  }
}
