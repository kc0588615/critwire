import config from '@payload-config'
import * as Sentry from '@sentry/nextjs'
import { getPayload } from 'payload'
import { z } from 'zod'

import type { GameProject } from '@/payload-types'

import { ISSUE_CATEGORY_OPTIONS } from '@/collections/options'
import { getClientIP, normalizeTurnstileToken, readRequestBody } from '@/lib/public-forms/request'
import { verifyTurnstile } from '@/lib/turnstile/verifyTurnstile'
import { checkRateLimit } from '@/lib/upstash/rate-limit'
import { getLogger } from '@/lib/logger'

const log = getLogger('public.issue-report')

type IssueCategory = (typeof ISSUE_CATEGORY_OPTIONS)[number]['value']

const issueCategoryValues = ISSUE_CATEGORY_OPTIONS.map((option) => option.value) as [
  IssueCategory,
  ...IssueCategory[],
]

const reportSchema = z.object({
  category: z.enum(issueCategoryValues),
  description: z.string().trim().min(10).max(5000),
  gameVersion: z.string().trim().max(120).optional().or(z.literal('')),
  platform: z.string().trim().max(120).optional().or(z.literal('')),
  submitterEmail: z.email().optional().or(z.literal('')),
  title: z.string().trim().min(3).max(160),
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

  const url = new URL(`/g/${gameSlug}/report`, req.url)
  url.searchParams.set(status >= 400 ? 'error' : 'submitted', status >= 400 ? '1' : '1')
  return Response.redirect(url, 303)
}

const relationID = (value: GameProject['tenant']): number | undefined => {
  if (typeof value === 'number') return value
  return value?.id
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameSlug: string }> },
): Promise<Response> {
  const { gameSlug } = await params

  try {
    const body = await readRequestBody(req)
    const parsed = reportSchema.safeParse({
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
      key: 'issue-report',
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

    const report = await payload.create({
      collection: 'issue-reports',
      data: {
        category: parsed.data.category,
        description: parsed.data.description,
        gameProject: project.id,
        gameVersion: parsed.data.gameVersion || null,
        platform: parsed.data.platform || null,
        status: 'NEW',
        submitterEmail: parsed.data.submitterEmail || null,
        tenant: tenantID,
        title: parsed.data.title,
      },
      overrideAccess: true,
    })

    log.info({
      msg: 'Public issue report submitted.',
      projectID: project.id,
      reportID: report.id,
    })

    return responseFor({ gameSlug, json: { id: report.id, ok: true }, req, status: 200 })
  } catch (err) {
    Sentry.captureException(err)
    return responseFor({
      gameSlug,
      json: { error: 'Something went wrong.' },
      req,
      status: 500,
    })
  }
}
