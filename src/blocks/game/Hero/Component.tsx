import React from 'react'

import type { GameHeroBlock, GameProject } from '@/payload-types'

import { Media } from '@/components/Media'
import { GameButtons } from '@/components/game/GameButtons'

export const GameHeroComponent: React.FC<GameHeroBlock & { project: GameProject }> = ({
  backgroundImage,
  buttons,
  heading,
  project,
  showLogo,
  tagline,
}) => {
  const hasBackground = backgroundImage && typeof backgroundImage === 'object'

  return (
    <section className="relative flex min-h-[60vh] items-center justify-center overflow-hidden text-center">
      {hasBackground && (
        <>
          <Media
            fill
            imgClassName="object-cover"
            priority
            resource={backgroundImage}
          />
          <div className="absolute inset-0 bg-black/50" />
        </>
      )}
      <div className="relative z-10 mx-auto max-w-3xl px-6 py-20">
        {showLogo && project.logo && typeof project.logo === 'object' ? (
          <Media
            imgClassName="mx-auto mb-6 max-h-32 w-auto"
            priority
            resource={project.logo}
          />
        ) : null}
        <h1
          className={`text-4xl font-bold tracking-tight sm:text-6xl ${hasBackground ? 'text-white' : ''}`}
        >
          {heading || project.name}
        </h1>
        {(tagline ?? project.description) && (
          <p className={`mt-4 text-lg sm:text-xl ${hasBackground ? 'text-white/85' : 'opacity-80'}`}>
            {tagline || project.description}
          </p>
        )}
        <div className="mt-8 flex justify-center">
          <GameButtons buttons={buttons} />
        </div>
      </div>
    </section>
  )
}
