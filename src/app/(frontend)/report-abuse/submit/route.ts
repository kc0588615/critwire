import config from '@payload-config'
import * as Sentry from '@sentry/nextjs'
import { notFound } from 'next/navigation'
import { getPayload } from 'payload'
import { z } from 'zod'

import { ABUSE_REPORT_REASON_OPTIONS } from '@/collections/options'
import { parsePortalPath } from '@/lib/game-portal/paths'
import { isOpenSignup, reportAbuseHref } from '@/lib/hosting'
import { getLogger } from '@/lib/logger'
import { formResponse, guardPublicForm } from '@/lib/public-forms/guard'
import { readRequestBody } from '@/lib/public-forms/request'

const log = getLogger('abuse-report')

type Reason = (typeof ABUSE_REPORT_REASON_OPTIONS)[number]['value']
const REASONS = ABUSE_REPORT_REASON_OPTIONS.map(({ value }) => value) as [Reason, ...Reason[]]

const reportSchema = z.object({
  details: z.string().trim().max(2000).optional().or(z.literal('')),
  email: z.email().max(254).optional().or(z.literal('')),
  page: z
    .string()
    .trim()
    .max(300)
    .refine((page) => parsePortalPath(page) !== null),
  reason: z.enum(REASONS),
})

/** The form the report was posted from, read before the guard consumes the body. */
const reportFormPath = async (req: Request): Promise<string> => {
  const { page } = await readRequestBody(req.clone())
  return typeof page === 'string' && parsePortalPath(page) ? reportAbuseHref(page) : '/report-abuse'
}

/**
 * Files a "Report this page" report (§12) for the super admins' queue. The
 * game is found with a privileged lookup, so reports about held or
 * suspended portals still name it. Only on the hosted instance (open signup).
 */
export async function POST(req: Request): Promise<Response> {
  if (!isOpenSignup()) notFound()

  const path = await reportFormPath(req)
  try {
    const guard = await guardPublicForm({
      rateLimit: { key: 'abuse-report', limit: 5, scope: 'abuse-report', windowSeconds: 10 * 60 },
      req,
      schema: reportSchema,
    })
    if (!guard.ok)
      return formResponse({ json: { error: guard.error }, path, req, status: guard.status })

    const { details, email, page, reason } = guard.data
    // The schema checked `page`.
    const { gameSlug } = parsePortalPath(page)!

    const payload = await getPayload({ config })
    const { docs } = await payload.find({
      collection: 'game-projects',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      select: {},
      where: { slug: { equals: gameSlug } },
    })
    const project = docs[0]
    if (!project) return formResponse({ json: { error: 'Unknown page.' }, path, req, status: 400 })

    const report = await payload.create({
      collection: 'abuse-reports',
      data: {
        details: details || undefined,
        gameProject: project.id,
        pageUrl: page,
        reason,
        reporterEmail: email || undefined,
        status: 'open',
      },
      overrideAccess: true,
    })
    log.info({ msg: 'Abuse report filed.', projectID: project.id, reportID: report.id })

    return formResponse({ json: { ok: true }, path, req, status: 200 })
  } catch (err) {
    Sentry.captureException(err)
    log.error({ err, msg: 'Abuse report failed.' })
    return formResponse({ json: { error: 'Something went wrong.' }, path, req, status: 500 })
  }
}
