import type { CollectionBeforeValidateHook } from 'payload'

import { ValidationError } from 'payload'

import type { IssueReport } from '@/payload-types'

const relationID = (value: unknown): number | string | undefined => {
  if (typeof value === 'number' || typeof value === 'string') return value
  if (value && typeof value === 'object' && 'id' in value) {
    const id = (value as { id?: number | string }).id
    if (typeof id === 'number' || typeof id === 'string') return id
  }
  return undefined
}

export const validateReportStatus: CollectionBeforeValidateHook<IssueReport> = ({
  data,
  originalDoc,
}) => {
  const status = data?.status ?? originalDoc?.status
  const issue = relationID(data?.issue ?? originalDoc?.issue)

  if (status === 'LINKED' && !issue) {
    throw new ValidationError({
      collection: 'issue-reports',
      errors: [
        {
          message: 'Linked reports must reference an existing issue.',
          path: 'issue',
        },
      ],
    })
  }

  return data
}
