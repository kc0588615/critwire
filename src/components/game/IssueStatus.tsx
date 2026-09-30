import type { Issue } from '@/payload-types'

import { ISSUE_STATUS_OPTIONS } from '@/collections/options'

import type { StatusShape } from './FeedbackStatus'

/** The public board's per-status columns, until it moves to the four stages. */
const STATUS_SHAPES: Record<Issue['status'], StatusShape> = {
  CLOSED: 'ring',
  FIXED: 'dot',
  IN_PROGRESS: 'half',
  INVESTIGATING: 'half',
  NEEDS_MORE_INFO: 'diamond',
  PLANNED: 'half',
  REPORTED: 'ring',
  WORKAROUND_AVAILABLE: 'diamond',
}

export const issueStatusShape = (status: Issue['status']): StatusShape => STATUS_SHAPES[status]

export const issueStatusLabel = (status: Issue['status']): string =>
  ISSUE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status
