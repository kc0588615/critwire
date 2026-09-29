import React from 'react'

import type { Issue } from '@/payload-types'

import { ISSUE_STATUS_OPTIONS } from '@/collections/options'

export type StatusShape = 'diamond' | 'dot' | 'half' | 'ring'

/** Status has a shape, not only a colour. Each surface colours the shapes (portal.css, marketing). */
const STATUS_SHAPES: Record<Issue['status'], StatusShape> = {
  CLOSED: 'ring',
  FIXED: 'dot',
  INVESTIGATING: 'half',
  NEEDS_MORE_INFO: 'diamond',
  PLANNED: 'half',
  REPORTED: 'ring',
  WORKAROUND_AVAILABLE: 'diamond',
}

export const issueStatusShape = (status: Issue['status']): StatusShape => STATUS_SHAPES[status]

export const issueStatusLabel = (status: Issue['status']): string =>
  ISSUE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status

/**
 * An empty, CSS-drawn marker (globals.css). Never a character: it would
 * be announced and would land in the textContent that links and E2E read.
 */
export const StatusMark: React.FC<{ shape: StatusShape }> = ({ shape }) => (
  <span aria-hidden="true" className="status-mark" data-shape={shape} />
)

/** The status marker beside its label; the label is the information, the marker a cue. */
export const IssueStatus: React.FC<{ className?: string; status: Issue['status'] }> = ({
  className,
  status,
}) => (
  <span className={className ? `fs-status ${className}` : 'fs-status'}>
    <StatusMark shape={issueStatusShape(status)} />
    {issueStatusLabel(status)}
  </span>
)
