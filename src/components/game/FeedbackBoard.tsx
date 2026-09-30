import Link from 'next/link'
import React from 'react'

import { FeedbackTypeTag, PinnedTag, StatusMark } from '@/components/game/FeedbackStatus'
import { VoteCount } from '@/components/game/VoteCount'
import { feedbackHref, type FeedbackTypeParam, feedbackTypeOf } from '@/lib/game-portal/feedbackSearchParams'
import { BOARD_COLUMN_LIMIT, type BoardCard, queryBoardColumn } from '@/lib/game-portal/issues'
import type { PortalPaths } from '@/lib/game-portal/paths'
import { PUBLIC_STAGES } from '@/lib/game-portal/stages'

const Card: React.FC<{ issue: BoardCard; paths: PortalPaths }> = ({ issue, paths }) => (
  <li className="fs-board-card">
    <Link className="fs-link font-semibold" href={paths.feedbackItem(issue.slug)}>
      {issue.title}
    </Link>
    <div className="fs-board-card-meta">
      <VoteCount count={issue.upvoteCount ?? 0} variant="inline" />
      <FeedbackTypeTag type={issue.type} />
      {issue.isPinned ? <PinnedTag /> : null}
    </div>
  </li>
)

/**
 * Read-only: one region per public stage, named by the stage label
 * alone. Each column is its own query, so its count is the true total;
 * past the limit, "See all" opens the list filtered to the stage.
 * `empty` renders instead when no column has an item.
 */
export const FeedbackBoard = async ({
  empty,
  paths,
  projectID,
  type,
}: {
  empty: React.ReactNode
  paths: PortalPaths
  projectID: number | string
  type: FeedbackTypeParam | null
}) => {
  const storedType = type ? feedbackTypeOf(type) : null
  const columns = await Promise.all(
    PUBLIC_STAGES.map(async (stage) => ({
      result: await queryBoardColumn({ projectID, stage: stage.id, type: storedType }),
      stage,
    })),
  )

  if (columns.every(({ result }) => result.totalDocs === 0)) return empty

  return (
    <div className="fs-board">
      {columns.map(({ result, stage }) => {
        const labelId = `fs-board-${stage.id}`
        return (
          <section aria-labelledby={labelId} className="fs-board-column" key={stage.id}>
            <h2 className="fs-board-head">
              <StatusMark shape={stage.shape} />
              <span id={labelId}>{stage.label}</span>
              <span className="fs-count">{result.totalDocs}</span>
            </h2>
            {result.docs.length === 0 ? (
              <p className="fs-meta">None</p>
            ) : (
              <ul className="fs-board-cards">
                {result.docs.map((issue) => (
                  <Card issue={issue} key={issue.id} paths={paths} />
                ))}
              </ul>
            )}
            {result.totalDocs > BOARD_COLUMN_LIMIT ? (
              <Link
                className="fs-link fs-tap fs-board-more font-semibold"
                href={feedbackHref(paths.feedback, { stage: stage.id, type })}
              >
                See all {result.totalDocs}
              </Link>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}
