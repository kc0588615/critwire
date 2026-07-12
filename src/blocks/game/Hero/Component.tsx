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
    <section className="relative isolate flex min-h-[70vh] items-center overflow-hidden">
      {hasBackground && (
        <>
          <Media fill imgClassName="object-cover" priority resource={backgroundImage} />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#0a0e1a_0%,rgba(10,14,26,0.9)_34%,rgba(10,14,26,0.35)_100%)]" />
        </>
      )}
      <div className="cc-shell relative z-10 py-20">
        <div className="max-w-2xl">
          {showLogo && project.logo && typeof project.logo === 'object' ? (
            <Media imgClassName="mb-7 max-h-24 w-auto" priority resource={project.logo} />
          ) : null}
          <h1
            className={`text-5xl font-black leading-[0.95] tracking-tight sm:text-7xl ${hasBackground ? 'text-white' : ''}`}
          >
            {heading || project.name}
          </h1>
          {(tagline ?? project.description) && (
            <p
              className={`mt-6 max-w-xl text-lg leading-8 sm:text-xl ${hasBackground ? 'text-white/85' : 'text-slate-300'}`}
            >
              {tagline || project.description}
            </p>
          )}
          <div className="mt-9">
            <GameButtons buttons={buttons} />
          </div>
        </div>
      </div>
    </section>
  )
}
