import Link from 'next/link'
import React from 'react'

import type { FeedbackTypeParam } from '@/lib/game-portal/feedbackSearchParams'
import type { PortalPaths } from '@/lib/game-portal/paths'

const OPTIONS = [
  { hint: 'Something is broken or not working as it should.', name: 'Bug', type: 'bug' },
  { hint: 'Something you would like to see in the game.', name: 'Idea', type: 'idea' },
] as const satisfies readonly { hint: string; name: string; type: FeedbackTypeParam }[]

/**
 * The submit form's first control, "Bug or idea?": a link to each form,
 * so the page needs no client JS. The chosen one carries `aria-current`.
 */
export const FeedbackTypeChoice: React.FC<{
  chosen: FeedbackTypeParam | null
  paths: PortalPaths
}> = ({ chosen, paths }) => (
  <div aria-labelledby="feedback-type-label" className="fs-type-choice" role="group">
    <p className="fs-label" id="feedback-type-label">
      Bug or idea?
    </p>
    <div className="fs-type-options">
      {OPTIONS.map((option) => (
        <Link
          aria-current={option.type === chosen ? 'true' : undefined}
          className="fs-type-option"
          href={paths.newFeedback(option.type)}
          key={option.type}
        >
          <span className="fs-type-option-name">{option.name}</span>
          <span className="fs-type-option-hint">{option.hint}</span>
        </Link>
      ))}
    </div>
  </div>
)
