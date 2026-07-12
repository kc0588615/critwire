import React from 'react'

import type { GameCTABlock } from '@/payload-types'

import { GameButtons } from '@/components/game/GameButtons'

export const GameCTAComponent: React.FC<GameCTABlock> = ({ buttons, heading, text }) => {
  return (
    <section className="cc-shell cc-section">
      <div className="cc-panel-elevated mx-auto max-w-3xl rounded-lg p-8 text-center sm:p-10">
        <h2 className="text-3xl font-black">{heading}</h2>
        {text && <p className="mt-4 text-lg leading-8 text-slate-300">{text}</p>}
        <div className="mt-8 flex justify-center">
          <GameButtons buttons={buttons} />
        </div>
      </div>
    </section>
  )
}
