import type { GameProject, IssueReport } from '@/payload-types'

import config from '@payload-config'
import { getPayload } from 'payload'
import { extractID } from 'payload/shared'
import { z } from 'zod'

import { FEEDBACK_TYPE_OPTIONS, ISSUE_CATEGORY_OPTIONS } from '@/collections/options'
import { acceptsIdeas, getReportRoute } from '@/lib/game-portal/formRoutes'

/**
 * The one path a player's report takes into a game's review queue, shared by
 * the web form and Discord. The report's own hooks screen it and publish it
 * when the game's review is off.
 */

export type FeedbackType = (typeof FEEDBACK_TYPE_OPTIONS)[number]['value']
type IssueCategory = (typeof ISSUE_CATEGORY_OPTIONS)[number]['value']

const feedbackTypeValues = FEEDBACK_TYPE_OPTIONS.map((option) => option.value) as [
  FeedbackType,
  ...FeedbackType[],
]

export const reportFieldsSchema = z.object({
  description: z.string().trim().min(10).max(5000),
  gameVersion: z.string().trim().max(120).optional().or(z.literal('')),
  platform: z.string().trim().max(120).optional().or(z.literal('')),
  title: z.string().trim().min(3).max(160),
  type: z.enum(feedbackTypeValues).default('BUG'),
})

export type ReportFields = z.infer<typeof reportFieldsSchema>

export type ReportRefusal = 'no-ideas' | 'not-native'

type ReportProject = Pick<GameProject, 'id' | 'reportForm' | 'tenant'>

/** Why the game takes no report of this type here, or null when it does. */
export const reportRefusal = (
  project: Pick<GameProject, 'reportForm'>,
  type: FeedbackType,
): null | ReportRefusal => {
  // A studio that collects reports in Tally or elsewhere gets no native ones.
  if (getReportRoute(project.reportForm).kind !== 'native') return 'not-native'
  if (type === 'IDEA' && !acceptsIdeas(project)) return 'no-ideas'
  return null
}

/**
 * Creates a NEW report for the game. Throws when the game refuses the report's
 * type, so no caller can skip that check.
 */
export const createPlayerReport = async ({
  discord,
  fields,
  project,
}: {
  /** Who sent it from Discord. Private: promotion never copies it to the public item. */
  discord?: { interactionId: string; messageUrl?: string; userId: string; username: string }
  fields: { category: IssueCategory } & ReportFields
  project: ReportProject
}): Promise<IssueReport> => {
  const refusal = reportRefusal(project, fields.type)
  if (refusal) throw new Error(`Game project ${project.id} refuses this report: ${refusal}.`)
  if (!project.tenant) throw new Error(`Game project ${project.id} has no tenant.`)

  const isBug = fields.type === 'BUG'
  const payload = await getPayload({ config })
  return payload.create({
    collection: 'issue-reports',
    data: {
      category: fields.category,
      description: fields.description,
      discord,
      gameProject: project.id,
      // Platform and version only describe bugs.
      gameVersion: (isBug && fields.gameVersion) || null,
      platform: (isBug && fields.platform) || null,
      status: 'NEW',
      tenant: extractID(project.tenant),
      title: fields.title,
      type: fields.type,
    },
    overrideAccess: true,
  })
}
