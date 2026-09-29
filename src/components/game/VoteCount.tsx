import React from 'react'

const votesWord = (count: number): string => (count === 1 ? 'vote' : 'votes')

/**
 * A read-only vote count. `tally`: the number above a visible "vote(s)",
 * for the issue list's left column. `inline`: "▲ n" with the word only
 * for screen readers, for board cards and landing rows.
 */
export const VoteCount: React.FC<{ count: number; variant: 'inline' | 'tally' }> = ({
  count,
  variant,
}) =>
  variant === 'tally' ? (
    <span className="fs-vote-tally">
      <span className="fs-tally">{count}</span>
      <span className="fs-meta">{votesWord(count)}</span>
    </span>
  ) : (
    <span className="fs-vote-inline">
      <span aria-hidden="true">▲</span> {count}
      <span className="sr-only"> {votesWord(count)}</span>
    </span>
  )
