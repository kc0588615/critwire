import config from '@payload-config'
import * as Sentry from '@sentry/nextjs'
import { getPayload } from 'payload'
import { extractID } from 'payload/shared'
import { z } from 'zod'

import { FEEDBACK_TYPE_OPTIONS, ISSUE_CATEGORY_OPTIONS } from '@/collections/options'
import { acceptsIdeas, getReportRoute } from '@/lib/game-portal/formRoutes'
import { getGameProject } from '@/lib/game-portal/getGameProject'
import { portalPaths } from '@/lib/game-portal/paths'
import { formResponse, guardPublicForm } from '@/lib/public-forms/guard'
import { getLogger } from '@/lib/logger'

const log = getLogger('public.issue-report')

type IssueCategory = (typeof ISSUE_CATEGORY_OPTIONS)[number]['value']
type FeedbackType = (typeof FEEDBACK_TYPE_OPTIONS)[number]['value']

const issueCategoryValues = ISSUE_CATEGORY_OPTIONS.map((option) => option.value) as [
  IssueCategory,
  ...IssueCategory[],
]
const feedbackTypeValues = FEEDBACK_TYPE_OPTIONS.map((option) => option.value) as [
  FeedbackType,
  ...FeedbackType[],
]

const reportSchema = z.object({
  category: z.enum(issueCategoryValues),
  description: z.string().trim().min(10).max(5000),
  gameVersion: z.string().trim().max(120).optional().or(z.literal('')),
  platform: z.string().trim().max(120).optional().or(z.literal('')),
  submitterEmail: z.email().optional().or(z.literal('')),
  title: z.string().trim().min(3).max(160),
  type: z.enum(feedbackTypeValues).default('BUG'),
})

export async function POST(
  req: Request,
  { params }: { params: Promise<{ gameSlug: string }> },
): Promise<Response> {
  const { gameSlug } = await params
  const paths = portalPaths(gameSlug)
  let path = paths.newFeedback()

  try {
    const guard = await guardPublicForm({
      rateLimit: { key: 'issue-report', limit: 5, scope: gameSlug, windowSeconds: 60 },
      req,
      schema: reportSchema,
    })
    if (!guard.ok) {
      return formResponse({ json: { error: guard.error }, path, req, status: guard.status })
    }
    const { type } = guard.data
    const isBug = type === 'BUG'
    path = paths.newFeedback(isBug ? 'bug' : 'idea')

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

    if (!isBug && !acceptsIdeas(project)) {
      return formResponse({
        json: { error: 'This game does not accept ideas.' },
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
        // Platform and version only describe bugs.
        gameVersion: (isBug && guard.data.gameVersion) || null,
        platform: (isBug && guard.data.platform) || null,
        status: 'NEW',
        submitterEmail: guard.data.submitterEmail || null,
        tenant: extractID(project.tenant),
        title: guard.data.title,
        type,
      },
      overrideAccess: true,
    })

    // The report's hooks screened it and published it when review is off.
    const published = report.status === 'PUBLISHED'

    log.info({
      msg: 'Public issue report submitted.',
      projectID: project.id,
      published,
      reportID: report.id,
    })

    return formResponse({
      json: { id: report.id, ok: true, published },
      path,
      req,
      status: 200,
      submitted: published ? 'published' : '1',
    })
  } catch (err) {
    Sentry.captureException(err)
    log.error({ err, msg: 'Public issue report submission failed.' })
    return formResponse({ json: { error: 'Something went wrong.' }, path, req, status: 500 })
  }
}
