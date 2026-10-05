import * as Sentry from '@sentry/nextjs'
import { z } from 'zod'

import { ISSUE_CATEGORY_OPTIONS } from '@/collections/options'
import { getGameProject } from '@/lib/game-portal/getGameProject'
import { portalPaths } from '@/lib/game-portal/paths'
import { createPlayerReport, reportFieldsSchema, reportRefusal } from '@/lib/game-portal/reports'
import { formResponse, guardPublicForm } from '@/lib/public-forms/guard'
import { getLogger } from '@/lib/logger'

const log = getLogger('public.issue-report')

type IssueCategory = (typeof ISSUE_CATEGORY_OPTIONS)[number]['value']

const issueCategoryValues = ISSUE_CATEGORY_OPTIONS.map((option) => option.value) as [
  IssueCategory,
  ...IssueCategory[],
]

const reportSchema = reportFieldsSchema.extend({
  category: z.enum(issueCategoryValues),
})

const REFUSAL_ERRORS = {
  'no-ideas': 'This game does not accept ideas.',
  'not-native': 'This game does not accept reports here.',
} as const

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

    const refusal = reportRefusal(project, type)
    if (refusal) {
      return formResponse({ json: { error: REFUSAL_ERRORS[refusal] }, path, req, status: 400 })
    }

    const report = await createPlayerReport({ fields: guard.data, project })

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
