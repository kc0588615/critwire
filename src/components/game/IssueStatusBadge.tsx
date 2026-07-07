import React from 'react'

import type { Issue } from '@/payload-types'

import { ISSUE_STATUS_OPTIONS } from '@/collections/options'

const STATUS_CLASSES: Record<Issue['status'], string> = {
  CLOSED: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  FIXED: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  INVESTIGATING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  NEEDS_MORE_INFO: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
  PLANNED: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300',
  REPORTED: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
  WORKAROUND_AVAILABLE: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
}

export const issueStatusLabel = (status: Issue['status']): string =>
  ISSUE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? status

export const IssueStatusBadge: React.FC<{ status: Issue['status'] }> = ({ status }) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[status] ?? STATUS_CLASSES.REPORTED}`}
  >
    {issueStatusLabel(status)}
  </span>
)
