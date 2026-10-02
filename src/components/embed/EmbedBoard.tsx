'use client'

import React, { useState } from 'react'

import type { EmbedFeedbackRow } from '@/lib/game-portal/feeds'

import { FeedbackTypeTag, StatusMark } from '@/components/game/FeedbackStatus'
import { VoteCount } from '@/components/game/VoteCount'
import { embedURL } from '@/lib/embed/links'
import { type FeedbackTypeParam, feedbackTypeOf } from '@/lib/game-portal/feedbackSearchParams'
import { PUBLIC_STAGES, type PublicStage, type PublicStageId } from '@/lib/game-portal/stages'

import { EmbedLink } from './EmbedLink'

/** One filter combination: its true total, its first rows and, past them, the portal list's URL. */
export type EmbedBoardView = {
  rows: EmbedFeedbackRow[]
  seeAll: null | string
  stage: null | PublicStageId
  total: number
  type: FeedbackTypeParam | null
}

type Filter = { stage: null | PublicStageId; type: FeedbackTypeParam | null }

const TYPE_FILTERS: { label: string; type: FeedbackTypeParam | null }[] = [
  { label: 'All', type: null },
  { label: 'Bugs', type: 'bug' },
  { label: 'Ideas', type: 'idea' },
]

const STAGE_FILTERS: { label: string; stage: null | PublicStageId }[] = [
  { label: 'All', stage: null },
  ...PUBLIC_STAGES.map((stage) => ({ label: stage.label, stage: stage.id })),
]

const STAGES = Object.fromEntries(PUBLIC_STAGES.map((stage) => [stage.id, stage])) as Record<
  PublicStageId,
  PublicStage
>

const FilterButton: React.FC<{
  children: React.ReactNode
  onClick: () => void
  pressed: boolean
}> = ({ children, onClick, pressed }) => (
  <button aria-pressed={pressed} className="cw-embed-filter" onClick={onClick} type="button">
    {children}
  </button>
)

/**
 * An item: its vote count, its title and its stage. Both links open the
 * item's page; the row's `url` is the feed's, untagged, so it's tagged here.
 */
const Row: React.FC<{ row: EmbedFeedbackRow }> = ({ row }) => {
  const href = embedURL(row.url)
  return (
    <li className="cw-embed-row">
      {/* S8 opens this in a popup, where the vote is cast on critwire's own page. */}
      <EmbedLink className="cw-embed-vote" href={href}>
        <span className="sr-only">Vote for {row.title}, </span>
        <VoteCount count={row.votes} variant="inline" />
      </EmbedLink>
      <div className="min-w-0">
        <EmbedLink className="fs-link font-semibold" href={href}>
          {row.title}
        </EmbedLink>
        <div className="cw-embed-row-meta">
          <span className="fs-status">
            <StatusMark shape={STAGES[row.stage].shape} />
            {row.shipped_in
              ? `Shipped in ${row.shipped_in.version || row.shipped_in.title}`
              : STAGES[row.stage].label}
          </span>
          <FeedbackTypeTag type={feedbackTypeOf(row.type)} />
        </div>
      </div>
    </li>
  )
}

/**
 * The board widget. Every view arrives with the page, so a filter is
 * local state: no request, no URL change, and nothing in the host page's
 * history. Every link opens the portal in a new tab.
 */
export const EmbedBoard: React.FC<{
  acceptsIdeas: boolean
  initial: Filter
  newFeedback: Record<FeedbackTypeParam, string>
  views: EmbedBoardView[]
}> = ({ acceptsIdeas, initial, newFeedback, views }) => {
  const [filter, setFilter] = useState<Filter>(initial)
  const viewOf = ({ stage, type }: Filter): EmbedBoardView => {
    const view = views.find((candidate) => candidate.stage === stage && candidate.type === type)
    if (!view) throw new Error(`No board view for stage ${stage}, type ${type}`)
    return view
  }
  const view = viewOf(filter)
  const empty = viewOf({ stage: null, type: null }).total === 0

  return (
    <section aria-labelledby="cw-embed-heading">
      <div className="cw-embed-head">
        <h1 className="cw-embed-title" id="cw-embed-heading">
          Feedback
        </h1>
        <p className="cw-embed-actions">
          <EmbedLink className="fs-link fs-tap font-semibold" href={newFeedback.bug}>
            Report a bug
          </EmbedLink>
          {acceptsIdeas ? (
            <EmbedLink className="fs-link fs-tap font-semibold" href={newFeedback.idea}>
              Suggest an idea
            </EmbedLink>
          ) : null}
        </p>
      </div>

      {empty ? (
        <p className="fs-body">No feedback yet.</p>
      ) : (
        <>
          <div aria-label="Stage" className="cw-embed-filters" role="group">
            {STAGE_FILTERS.map(({ label, stage }) => (
              <FilterButton
                key={stage ?? 'all'}
                onClick={() => setFilter({ ...filter, stage })}
                pressed={filter.stage === stage}
              >
                {label}{' '}
                <span className="cw-embed-count">{viewOf({ stage, type: filter.type }).total}</span>
              </FilterButton>
            ))}
          </div>
          <div aria-label="Type" className="cw-embed-filters" role="group">
            {TYPE_FILTERS.filter(({ type }) => acceptsIdeas || type !== 'idea').map(
              ({ label, type }) => (
                <FilterButton
                  key={type ?? 'all'}
                  onClick={() => setFilter({ ...filter, type })}
                  pressed={filter.type === type}
                >
                  {label}
                </FilterButton>
              ),
            )}
          </div>

          {view.rows.length === 0 ? (
            <p className="fs-body cw-embed-none">Nothing here yet.</p>
          ) : (
            <ul className="fs-rows cw-embed-rows">
              {view.rows.map((row) => (
                <Row key={row.id} row={row} />
              ))}
            </ul>
          )}
          {view.seeAll ? (
            <EmbedLink className="fs-link fs-tap font-semibold" href={view.seeAll}>
              {`See all ${view.total}`}
            </EmbedLink>
          ) : null}
        </>
      )}
    </section>
  )
}
