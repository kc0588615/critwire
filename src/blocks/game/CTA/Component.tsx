import React from 'react'

import type { GameCTABlock } from '@/payload-types'

import { GameButtons } from '@/components/game/GameButtons'

export const GameCTAComponent: React.FC<GameCTABlock> = ({ buttons, heading, text }) => {
  return (
    <section className="mx-auto max-w-3xl px-6 text-center">
      <h2 className="text-3xl font-bold">{heading}</h2>
      {text && <p className="mt-4 text-lg opacity-80">{text}</p>}
      <div className="mt-8 flex justify-center">
        <GameButtons buttons={buttons} />
      </div>
    </section>
  )
}
