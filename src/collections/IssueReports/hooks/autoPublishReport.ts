import type { CollectionBeforeChangeHook } from 'payload'

import { extractID } from 'payload/shared'

import type { IssueReport } from '@/payload-types'

// Publishes a clean new report when its game has review turned off. Runs
// after `screenReportText` and before `createIssueFromPublishedReport`, which
// then promotes it, so there's one path from report to issue. Only on create:
// turning review off doesn't publish the backlog.
export const autoPublishReport: CollectionBeforeChangeHook<IssueReport> = async ({
  data,
  operation,
  req,
}) => {
  if (operation !== 'create' || data.status !== 'NEW' || data.flagged || !data.gameProject) {
    return data
  }

  const project = await req.payload.findByID({
    collection: 'game-projects',
    depth: 0,
    id: extractID(data.gameProject),
    overrideAccess: true,
    req,
    select: { reportForm: true },
  })
  if (project.reportForm?.reviewSubmissions !== false) return data

  return { ...data, status: 'PUBLISHED' }
}
