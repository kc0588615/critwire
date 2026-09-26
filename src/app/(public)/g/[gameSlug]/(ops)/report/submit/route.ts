import config from '@payload-config'
import * as Sentry from '@sentry/nextjs'
import { getPayload } from 'payload'
import { extractID } from 'payload/shared'
import { z } from 'zod'

import { ISSUE_CATEGORY_OPTIONS } from '@/collections/options'
import { getReportRoute } from '@/lib/game-portal/formRoutes'
import { getGameProject } from '@/lib/game-portal/getGameProject'
import { formResponse, guardPublicForm } from '@/lib/public-forms/guard'
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
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameSlug: string }> },
): Promise<Response> {
  const { gameSlug } = await params
  const path = `/g/${gameSlug}/report`

  try {
    const guard = await guardPublicForm({
      rateLimit: { key: 'issue-report', limit: 5, scope: gameSlug, windowSeconds: 60 },
      req,
      schema: reportSchema,
    })
    if (!guard.ok) {
      return formResponse({ json: { error: guard.error }, path, req, status: guard.status })
    }

    const project = await getGameProject(gameSlug)
    if (!project?.tenant) {
      return formResponse({ json: { error: 'Game not found.' }, path, req, status: 404 })
    }

    // A studio that collects reports in Tally or elsewhere gets no native ones.
    if (getReportRoute(project.reportForm).kind !== 'native') {
      return formResponse({
        json: { error: 'This game does not accept reports here.' },
        path,
        req,
        status: 400,
      })
    }

    const payload = await getPayload({ config })
    const report = await payload.create({
      collection: 'issue-reports',
      data: {
        category: guard.data.category,
        description: guard.data.description,
        gameProject: project.id,
        gameVersion: guard.data.gameVersion || null,
        platform: guard.data.platform || null,
        status: 'NEW',
        submitterEmail: guard.data.submitterEmail || null,
        tenant: extractID(project.tenant),
        title: guard.data.title,
      },
      overrideAccess: true,
    })

    log.info({
      msg: 'Public issue report submitted.',
      projectID: project.id,
      reportID: report.id,
    })

    return formResponse({ json: { id: report.id, ok: true }, path, req, status: 200 })
  } catch (err) {
    Sentry.captureException(err)
    log.error({ err, msg: 'Public issue report submission failed.' })
    return formResponse({ json: { error: 'Something went wrong.' }, path, req, status: 500 })
  }
}
