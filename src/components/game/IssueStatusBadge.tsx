import React from 'react'

import type { Issue } from '@/payload-types'

import { ISSUE_STATUS_OPTIONS } from '@/collections/options'

const STATUS_CLASSES: Record<Issue['status'], string> = {
  CLOSED: 'border-slate-400/30 bg-slate-400/10 text-slate-300',
  FIXED: 'border-emerald-300/30 bg-emerald-300/10 text-emerald-200',
  INVESTIGATING: 'border-blue-300/30 bg-blue-300/10 text-blue-200',
  NEEDS_MORE_INFO: 'border-amber-300/30 bg-amber-300/10 text-amber-200',
  PLANNED: 'border-cyan-300/30 bg-cyan-300/10 text-cyan-200',
  REPORTED: 'border-slate-300/25 bg-slate-300/10 text-slate-200',
  WORKAROUND_AVAILABLE: 'border-violet-300/30 bg-violet-300/10 text-violet-200',
}

export const issueStatusLabel = (status: Issue['status']): string =>
  ISSUE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status

export const IssueStatusBadge: React.FC<{ status: Issue['status'] }> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[status] ?? STATUS_CLASSES.REPORTED}`}
  >
    {issueStatusLabel(status)}
  </span>
)
