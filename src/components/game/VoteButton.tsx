'use client'

import React, { useState, useTransition } from 'react'

export const VoteButton: React.FC<{
  initialCount: number
  initialVoted: boolean
  issueId: number | string
}> = ({ initialCount, initialVoted, issueId }) => {
  const [count, setCount] = useState(initialCount)
  const [voted, setVoted] = useState(initialVoted)
  const [error, setError] = useState<null | string>(null)
  const [pending, startTransition] = useTransition()

  const toggle = () => {
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
          setError(json?.error ?? 'Vote failed.')
          return
        }
        setCount(json.upvoteCount)
        setVoted(json.voted)
      } catch {
        setError('Vote failed.')
      }
    })
  }

  return (
    <div className="flex items-center gap-2">
      <button
        aria-pressed={voted}
        className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
          voted
            ? 'border-transparent bg-(--game-accent,#111) text-white'
            : 'hover:bg-black/5 dark:hover:bg-white/10'
        } ${pending ? 'opacity-60' : ''}`}
        disabled={pending}
        onClick={toggle}
        type="button"
      >
        <span aria-hidden>▲</span>
        {voted ? 'Upvoted' : 'Upvote'}
        <span className="font-mono">{count}</span>
      </button>
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  )
}
