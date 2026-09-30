import type { CollectionBeforeChangeHook } from 'payload'

import { screenText } from '@/lib/moderation/screenText'
import type { IssueReport } from '@/payload-types'

const textChanged = (data: Partial<IssueReport>, originalDoc: IssueReport): boolean =>
  (data.title !== undefined && data.title !== originalDoc.title) ||
  (data.description !== undefined && data.description !== originalDoc.description)

// Screens the report's text on every write path (the public form, REST and
// the admin), so nothing can skip the filter. A rejection fails the write.
export const screenReportText: CollectionBeforeChangeHook<IssueReport> = async ({
  data,
  operation,
  originalDoc,
}) => {
  if (operation === 'update' && originalDoc && !textChanged(data, originalDoc)) return data

  const report = { ...originalDoc, ...data } as IssueReport
  const { flagged, reasons } = await screenText(`${report.title}\n\n${report.description}`)

  return { ...data, flagged, flagReasons: flagged ? reasons.join('\n') : null }
}
