import React from 'react'

import type { GameCTABlock } from '@/payload-types'

import { GameButtons } from '@/components/game/GameButtons'

export const GameCTAComponent: React.FC<GameCTABlock> = ({ buttons, heading, text }) => {
  return (
    <section className="fs-section">
      <div className="fs-shell">
        <h2 className="fs-h2">{heading}</h2>
        {text && <p className="fs-lead mt-4 text-[var(--fs-muted-fg)]">{text}</p>}
        <div className="mt-8">
          <GameButtons buttons={buttons} />
        </div>
      </div>
    </section>
  )
}
