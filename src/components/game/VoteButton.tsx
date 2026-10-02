'use client'

import React, { useState, useTransition } from 'react'

import { FormNotice } from '@/components/game/FormNotice'
import { notifyOpener } from '@/lib/embed/protocol'

const NETWORK_ERROR = 'Your vote didn’t count. Reload the page and try again.'

type Change = { delta: 1 | -1; id: number }

/**
 * The button holds only the hidden ▲, "Upvote"/"Upvoted" and the count,
 * so its name stays "Upvote 3". The +1/−1 ghost and the helper line sit
 * outside it. Motion runs only after a vote, never on load.
 */
export const VoteButton: React.FC<{
  initialCount: number
  initialVoted: boolean
  issueId: number | string
}> = ({ initialCount, initialVoted, issueId }) => {
  const [count, setCount] = useState(initialCount)
  const [voted, setVoted] = useState(initialVoted)
  const [change, setChange] = useState<Change | null>(null)
  const [error, setError] = useState<null | string>(null)
  const [pending, startTransition] = useTransition()

  const toggle = () => {
    // aria-disabled rather than disabled, so a keyboard user keeps focus on the button.
    if (pending) return
    startTransition(async () => {
      setError(null)
      try {
        const res = await fetch('/api/vote', {
          body: JSON.stringify({ issueId }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        })
        const json = await res.json()
        if (!res.ok) {
          setError(json?.error ?? NETWORK_ERROR)
          return
        }
        setCount(json.upvoteCount)
        setVoted(json.voted)
        setChange((previous) => ({ delta: json.voted ? 1 : -1, id: (previous?.id ?? 0) + 1 }))
        // An embed that opened this page in a popup shows the new count.
        notifyOpener({ issueId: String(issueId), votes: json.upvoteCount, voted: json.voted })
      } catch {
        setError(NETWORK_ERROR)
      }
    })
  }

  return (
    <div className="fs-vote">
      <div className="fs-vote-control">
        <button
          aria-disabled={pending || undefined}
          aria-pressed={voted}
          className={`fs-btn fs-vote-btn ${voted ? 'fs-btn-primary' : 'fs-btn-secondary'}`}
          onClick={toggle}
          type="button"
        >
          <span aria-hidden="true">▲</span>
          {voted ? 'Upvoted' : 'Upvote'}
          <span className="fs-vote-count-window">
            <span
              className="fs-vote-count"
              data-roll={change ? (change.delta > 0 ? 'up' : 'down') : undefined}
              key={change?.id ?? 0}
            >
              {count}
            </span>
          </span>
        </button>
        {change ? (
          <span aria-hidden="true" className="fs-vote-ghost" key={change.id}>
            {change.delta > 0 ? '+1' : '−1'}
          </span>
        ) : null}
      </div>
      <p className="fs-meta fs-vote-help">
        One vote per browser. Select it again to take your vote back.
      </p>
      {error ? (
        <FormNotice className="fs-vote-notice" tone="error">
          {error}
        </FormNotice>
      ) : null}
    </div>
  )
}
