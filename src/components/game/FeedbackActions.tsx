import Link from 'next/link'
import React from 'react'

import type { GameProject } from '@/payload-types'

import { portalPaths } from '@/lib/game-portal/paths'

/** "Report a bug" and, when the studio takes ideas, "Suggest an idea": the form, preset to each type. */
export const FeedbackActions: React.FC<{ project: Pick<GameProject, 'reportForm' | 'slug'> }> = ({
  project,
}) => {
  const paths = portalPaths(project.slug)
  return (
    <>
      <Link className="fs-btn fs-btn-primary" href={paths.newFeedback('bug')}>
        Report a bug
      </Link>
      {project.reportForm?.acceptIdeas !== false ? (
        <Link className="fs-btn fs-btn-secondary" href={paths.newFeedback('idea')}>
          Suggest an idea
        </Link>
      ) : null}
    </>
  )
}
