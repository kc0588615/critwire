import type { CollectionBeforeValidateHook } from 'payload'

import { ValidationError } from 'payload'

import type { IssueReport } from '@/payload-types'

export const validateReportStatus: CollectionBeforeValidateHook<IssueReport> = ({
  data,
  originalDoc,
}) => {
  const status = data?.status ?? originalDoc?.status
  const issue = data?.issue ?? originalDoc?.issue

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
