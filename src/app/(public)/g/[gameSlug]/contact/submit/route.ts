import config from '@payload-config'
import * as Sentry from '@sentry/nextjs'
import { getPayload } from 'payload'
import { z } from 'zod'

import type { GameProject } from '@/payload-types'

import { getClientIP, normalizeTurnstileToken, readRequestBody } from '@/lib/public-forms/request'
import { verifyTurnstile } from '@/lib/turnstile/verifyTurnstile'
import { checkRateLimit } from '@/lib/upstash/rate-limit'

const contactSchema = z.object({
  email: z.email().optional().or(z.literal('')),
  message: z.string().trim().min(10).max(5000),
  name: z.string().trim().max(120).optional().or(z.literal('')),
  subject: z.string().trim().max(160).optional().or(z.literal('')),
  turnstileToken: z.string().optional().nullable(),
})

const wantsJSON = (req: Request): boolean =>
  (req.headers.get('content-type') ?? '').includes('application/json') ||
  (req.headers.get('accept') ?? '').includes('application/json')

const responseFor = ({
  gameSlug,
  json,
  req,
  status,
}: {
  gameSlug: string
  json: Record<string, unknown>
  req: Request
  status: number
}): Response => {
  if (wantsJSON(req)) return Response.json(json, { status })

  const url = new URL(`/g/${gameSlug}/contact`, req.url)
  url.searchParams.set(status >= 400 ? 'error' : 'submitted', status >= 400 ? '1' : '1')
  return Response.redirect(url, 303)
}

const relationID = (value: GameProject['tenant']): number | string | undefined => {
  if (typeof value === 'number' || typeof value === 'string') return value
  return value?.id
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameSlug: string }> },
): Promise<Response> {
  const { gameSlug } = await params

  try {
    const body = await readRequestBody(req)
    const parsed = contactSchema.safeParse({
      ...body,
      turnstileToken: normalizeTurnstileToken(body),
    })
    if (!parsed.success) {
      return responseFor({
        gameSlug,
        json: { error: 'Invalid request body.' },
        req,
        status: 400,
      })
    }

    const ip = await getClientIP()
    const turnstile = await verifyTurnstile({ ip, token: parsed.data.turnstileToken })
    if (!turnstile.success) {
      return responseFor({
        gameSlug,
        json: { error: 'Could not verify the form challenge.' },
        req,
        status: 400,
      })
    }

    const { success } = await checkRateLimit({
      identifier: `${ip}:${gameSlug}`,
      key: 'contact-form',
      limit: 5,
      windowSeconds: 60,
    })
    if (!success) {
      return responseFor({
        gameSlug,
        json: { error: 'Too many requests.' },
        req,
        status: 429,
      })
    }

    const payload = await getPayload({ config })
    const projects = await payload.find({
      collection: 'game-projects',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: { slug: { equals: gameSlug } },
    })
    const project = projects.docs[0]
    const tenantID = relationID(project?.tenant)
    if (!project || !tenantID) {
      return responseFor({
        gameSlug,
        json: { error: 'Game not found.' },
        req,
        status: 404,
      })
    }

    const target = project.contact?.target
    const hasEmailTarget = target === 'EMAIL' && Boolean(project.contact?.email)
    const hasDiscordTarget =
      target === 'DISCORD_WEBHOOK' && Boolean(project.contact?.discordWebhookUrl)

    if (!hasEmailTarget && !hasDiscordTarget) {
      return responseFor({
        gameSlug,
        json: { error: 'Contact is not configured.' },
        req,
        status: 400,
      })
    }

    const input = {
      email: parsed.data.email || '',
      gameSlug,
      message: parsed.data.message,
      name: parsed.data.name || '',
      projectID: String(project.id),
      subject: parsed.data.subject || '',
    }

    payload.logger.info({ msg: 'Queueing contact form job.', projectID: project.id, target })
    await payload.jobs.queue({
      input,
      queue: 'default',
      task: hasEmailTarget ? 'email-contact-form' : 'discord-webhook',
    })
    payload.logger.info({ msg: 'Running contact form job queue.', projectID: project.id, target })
    await payload.jobs.run({ limit: 10, queue: 'default' })

    payload.logger.info({ msg: 'Public contact form submitted.', projectID: project.id, target })

    return responseFor({ gameSlug, json: { ok: true }, req, status: 200 })
  } catch (err) {
    Sentry.captureException(err)
    const payload = await getPayload({ config }).catch(() => null)
    payload?.logger.error({ err, msg: 'Public contact form submission failed.' })
    return responseFor({
      gameSlug,
      json: { error: 'Something went wrong.' },
      req,
      status: 500,
    })
  }
}
