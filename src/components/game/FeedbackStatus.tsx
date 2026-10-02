import React from 'react'

import type { Issue } from '@/payload-types'

import { FEEDBACK_TYPE_OPTIONS, ISSUE_CATEGORY_OPTIONS } from '@/collections/options'
import { shippedUpdate, updateName } from '@/lib/game-portal/shipped'
import { type PublicStage, publicStage } from '@/lib/game-portal/stages'

export type StatusShape = PublicStage['shape']

const ARCHIVED_LABEL = 'Archived'

export const issueCategoryLabel = (category: Issue['category']): null | string =>
  ISSUE_CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? null

const feedbackTypeLabel = (type: Issue['type']): string =>
  FEEDBACK_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type

/**
 * An empty, CSS-drawn marker (globals.css). Never a character: it would
 * be announced and would land in the textContent that links and E2E read.
 */
export const StatusMark: React.FC<{ shape: StatusShape }> = ({ shape }) => (
  <span aria-hidden="true" className="status-mark" data-shape={shape} />
)

/**
 * The public stage's marker beside its label; the label is the
 * information, the marker a cue. An archived item has no stage, so no
 * marker. A shipped item names its published update: "Shipped in v2.1.0".
 */
export const FeedbackStatus: React.FC<{
  className?: string
  issue: Pick<Issue, 'fixedInPatchNote' | 'status'>
}> = ({ className, issue }) => {
  const stage = publicStage(issue.status)
  const shippedIn = shippedUpdate(issue)
  const label = stage?.label ?? ARCHIVED_LABEL
  return (
    <span className={className ? `fs-status ${className}` : 'fs-status'}>
      {stage ? <StatusMark shape={stage.shape} /> : null}
      {shippedIn ? `${label} in ${updateName(shippedIn)}` : label}
    </span>
  )
}

export const PinnedTag: React.FC = () => <span className="fs-tag">Pinned</span>

export const FeedbackTypeTag: React.FC<{ type: Issue['type'] }> = ({ type }) => (
  <span className="fs-tag">{feedbackTypeLabel(type)}</span>
)

/** An item's stage, type, category and pinned tag, in one wrapping row outside its title link. */
export const FeedbackMeta: React.FC<{
  className?: string
  issue: Pick<Issue, 'category' | 'fixedInPatchNote' | 'isPinned' | 'status' | 'type'>
}> = ({ className, issue }) => {
  const category = issueCategoryLabel(issue.category)
  return (
    <div className={className ? `fs-issue-meta ${className}` : 'fs-issue-meta'}>
      <FeedbackStatus issue={issue} />
      <FeedbackTypeTag type={issue.type} />
      {category ? <span className="fs-meta">{category}</span> : null}
      {issue.isPinned ? <PinnedTag /> : null}
    </div>
  )
}
