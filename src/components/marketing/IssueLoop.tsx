import React from 'react'

import { StatusMark, type StatusShape } from '@/components/game/IssueStatus'

type Stage = { detail: string; name: string; shape: StatusShape }

/**
 * One real Critter Connect bug, from a player's report to the patch that
 * fixed it. The markers use the portal's status shapes: reported (ring),
 * investigating (half), fixed (dot). marketing.css draws the wire.
 */
const STAGES: readonly Stage[] = [
  {
    detail: '“Clue trail disappears after fast travel”, on Steam Deck',
    name: 'A player reports it',
    shape: 'ring',
  },
  { detail: 'Listed as a known issue, marked Reported', name: 'You publish it', shape: 'ring' },
  { detail: '7 votes, now marked Investigating', name: 'Players vote it up', shape: 'half' },
  { detail: 'Fixed in v0.1.1, noted in its patch notes', name: 'You ship the fix', shape: 'dot' },
]

export function IssueLoop() {
  return (
    <ol aria-label="How a bug report becomes a fix" className="cw-loop">
      {STAGES.map(({ detail, name, shape }) => (
        <li className="cw-loop-stage" key={name}>
          <StatusMark shape={shape} />
          <p className="cw-loop-name">{name}</p>
          <p className="cw-loop-detail">{detail}</p>
        </li>
      ))}
    </ol>
  )
}
