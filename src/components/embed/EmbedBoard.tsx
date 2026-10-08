'use client'

import React, { useEffect, useRef, useState } from 'react'

import type { EmbedFeedbackRow } from '@/lib/game-portal/feeds'

import { FeedbackTypeTag, StatusMark } from '@/components/game/FeedbackStatus'
import { VoteCount } from '@/components/game/VoteCount'
import { embedURL } from '@/lib/embed/links'
import { isVoteMessage } from '@/lib/embed/protocol'
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

/** A vote the item page reported in this page view, by item id. */
type Votes = Record<string, { votes: number; voted: boolean }>

/** One named popup, reused for every vote link. */
const VOTE_WINDOW = 'critwire-vote'
const VOTE_WINDOW_FEATURES = 'popup,width=480,height=640'

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
 * The vote link opens it in a popup, where the player votes on critwire's
 * own page; `vote` is what that page reported back.
 */
const Row: React.FC<{
  onVote: React.MouseEventHandler<HTMLAnchorElement>
  row: EmbedFeedbackRow
  vote: undefined | Votes[string]
}> = ({ onVote, row, vote }) => {
  const href = embedURL(row.url)
  return (
    <li className="cw-embed-row">
      <EmbedLink className="fs-btn fs-btn-secondary cw-embed-vote" href={href} onClick={onVote}>
        <span className="sr-only">Vote for {row.title}, </span>
        <VoteCount count={vote?.votes ?? row.votes} variant="inline" />
      </EmbedLink>
      <div className="cw-embed-row-main">
        <EmbedLink className="fs-link cw-embed-row-title" href={href}>
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
          {vote?.voted ? <span className="fs-tag">Voted</span> : null}
        </div>
      </div>
    </li>
  )
}

/**
 * The board widget. Every view arrives with the page, so a filter is
 * local state: no request, no URL change, and nothing in the host page's
 * history. Every link opens the portal in a new tab, and a vote link in a
 * popup when the browser allows one.
 */
export const EmbedBoard: React.FC<{
  acceptsIdeas: boolean
  initial: Filter
  newFeedback: Record<FeedbackTypeParam, string>
  views: EmbedBoardView[]
}> = ({ acceptsIdeas, initial, newFeedback, views }) => {
  const [filter, setFilter] = useState<Filter>(initial)
  const [votes, setVotes] = useState<Votes>({})
  const popup = useRef<null | Window>(null)

  // Only the window this embed opened, on critwire's own origin, can report a vote.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || !popup.current || event.source !== popup.current) return
      if (!isVoteMessage(event.data)) return
      const { issueId, votes: count, voted } = event.data
      setVotes((previous) => ({ ...previous, [issueId]: { votes: count, voted } }))
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  // A blocked popup returns null, and the link's own new tab opens instead.
  const onVote: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
    const opened = window.open(event.currentTarget.href, VOTE_WINDOW, VOTE_WINDOW_FEATURES)
    if (!opened) return
    event.preventDefault()
    popup.current = opened
  }
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
          <EmbedLink className="fs-link fs-tap cw-embed-action" href={newFeedback.bug}>
            Report a bug
          </EmbedLink>
          {acceptsIdeas ? (
            <EmbedLink className="fs-link fs-tap cw-embed-action" href={newFeedback.idea}>
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
                <Row key={row.id} onVote={onVote} row={row} vote={votes[row.id]} />
              ))}
            </ul>
          )}
          {view.seeAll ? (
            <EmbedLink className="fs-link fs-tap cw-embed-action" href={view.seeAll}>
              {`See all ${view.total}`}
            </EmbedLink>
          ) : null}
        </>
      )}
    </section>
  )
}
