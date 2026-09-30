import type { CollectionBeforeChangeHook } from 'payload'

import { extractID } from 'payload/shared'

import { hasPublicFeedbackRoom } from '@/lib/limits'
import type { IssueReport } from '@/payload-types'

// Publishes a clean new report when its game has review turned off. Runs
// after the content filter (`screenTextHook`) and before
// `createIssueFromPublishedReport`, which then promotes it, so there's one
// path from report to issue. Only on create: turning review off doesn't
// publish the backlog. A game at its public
// feedback limit keeps the submission waiting, so the player's POST never
// fails on a limit.
export const autoPublishReport: CollectionBeforeChangeHook<IssueReport> = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== 'create' || data.status !== 'NEW' || data.flagged || !data.gameProject) {
    return data
  }

  const projectID = extractID(data.gameProject)
  const project = await req.payload.findByID({
    collection: 'game-projects',
    depth: 0,
    id: projectID,
    overrideAccess: true,
    req,
    select: { reportForm: true },
  })
  if (project.reportForm?.reviewSubmissions !== false) return data
  if (!(await hasPublicFeedbackRoom(req, projectID))) return data

  return { ...data, status: 'PUBLISHED' }
}
