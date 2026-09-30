import React from 'react'

import type { PortalPaths } from '@/lib/game-portal/paths'

import { queryShippedFeedback } from '@/lib/game-portal/issues'

import { FeedbackRow } from './FeedbackRow'
import { FeedbackTypeTag } from './FeedbackStatus'
import { VoteCount } from './VoteCount'

/**
 * An update's "From your feedback": the public items it shipped, most
 * voted first (see `queryShippedFeedback`). Nothing when it shipped none.
 */
export const FromYourFeedback: React.FC<{
  noteID: number
  paths: PortalPaths
  projectID: number | string
}> = async ({ noteID, paths, projectID }) => {
  const items = await queryShippedFeedback({ noteID, projectID })
  if (items.length === 0) return null

  return (
    <section aria-labelledby="fs-from-feedback-heading" className="mt-12">
      <h2 className="fs-h2" id="fs-from-feedback-heading">
        From your feedback
      </h2>
      <ul className="fs-rows mt-4">
        {items.map((item) => (
          <FeedbackRow href={paths.feedbackItem(item.slug)} key={item.id} title={item.title}>
            <FeedbackTypeTag type={item.type} />
            <VoteCount count={item.upvoteCount ?? 0} variant="inline" />
          </FeedbackRow>
        ))}
      </ul>
    </section>
  )
}
