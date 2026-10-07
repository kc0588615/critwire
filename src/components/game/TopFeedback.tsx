import Link from 'next/link'
import React from 'react'

import type { GameProject } from '@/payload-types'

import { queryTopFeedback } from '@/lib/game-portal/issues'
import { portalPaths } from '@/lib/game-portal/paths'

import { FeedbackActions } from './FeedbackActions'
import { FeedbackRow } from './FeedbackRow'
import { FeedbackStatus, FeedbackTypeTag } from './FeedbackStatus'
import { HubSection } from './HubSection'
import { VoteCount } from './VoteCount'

/**
 * The hub's top open feedback (see `queryTopFeedback`), then the ways to
 * add some and the full list.
 */
export const TopFeedback: React.FC<{
  project: Pick<GameProject, 'id' | 'name' | 'reportForm' | 'slug'>
}> = async ({ project }) => {
  const paths = portalPaths(project.slug)
  const items = await queryTopFeedback(project.id)

  return (
    <HubSection heading="Top feedback" id="fs-top-feedback-heading">
      {items.length === 0 ? (
        <p className="fs-empty">
          No feedback yet. Found a bug or have an idea? Be the first to tell {project.name}.
        </p>
      ) : (
        <ul className="fs-rows">
          {items.map((item) => (
            <FeedbackRow href={paths.feedbackItem(item.slug)} key={item.id} title={item.title}>
              <FeedbackTypeTag type={item.type} />
              {item.upvoteCount ? <VoteCount count={item.upvoteCount} variant="inline" /> : null}
              <FeedbackStatus issue={item} />
            </FeedbackRow>
          ))}
        </ul>
      )}
      <div className="fs-action-row">
        <FeedbackActions project={project} />
      </div>
      {items.length > 0 ? (
        <p className="fs-hub-links">
          <Link className="fs-link" href={paths.feedback}>
            See all feedback
          </Link>
        </p>
      ) : null}
    </HubSection>
  )
}
