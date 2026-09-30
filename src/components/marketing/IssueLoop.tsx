import React from 'react'

import { StatusMark } from '@/components/game/FeedbackStatus'
import { PUBLIC_STAGES, type PublicStageId } from '@/lib/game-portal/stages'

/**
 * One Critter Connect bug, from a player's report to the update that
 * shipped it, told through the portal's four public stages. The markers
 * are the stages' own shapes; marketing.css draws the wire.
 */
const STEPS: Record<PublicStageId, { detail: string; name: string }> = {
  'under-review': {
    detail: '“Clue trail disappears after fast travel”, on Steam Deck',
    name: 'A player reports it',
  },
  planned: { detail: '7 votes, and you mark it Planned', name: 'Players vote it up' },
  'in-progress': { detail: 'In progress, where every player can see', name: 'You work on it' },
  shipped: { detail: 'Shipped in v0.1.1, listed in that update', name: 'You ship the update' },
}

export function IssueLoop() {
  return (
    <ol aria-label="How a player’s report becomes a shipped update" className="cw-loop">
      {PUBLIC_STAGES.map(({ id, shape }) => (
        <li className="cw-loop-stage" key={id}>
          <StatusMark shape={shape} />
          <p className="cw-loop-name">{STEPS[id].name}</p>
          <p className="cw-loop-detail">{STEPS[id].detail}</p>
        </li>
      ))}
    </ol>
  )
}
