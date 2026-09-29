import React from 'react'

import type { GameHeroBlock, GameProject } from '@/payload-types'

import { Media } from '@/components/Media'
import { GameButtons } from '@/components/game/GameButtons'

/**
 * Legacy block hero on the template's hero classes: with a background
 * image, the title sits on a plate of page colour cut into the art
 * (never over it); without one, the title runs on the page.
 */
export const GameHeroComponent: React.FC<GameHeroBlock & { project: GameProject }> = ({
  backgroundImage,
  buttons,
  heading,
  project,
  showLogo,
  tagline,
}) => {
  const tagLine = tagline || project.description
  const title = (
    <>
      {showLogo && project.logo && typeof project.logo === 'object' ? (
        <Media imgClassName="fs-hero-logo" priority resource={project.logo} />
      ) : null}
      <h1 className="fs-h1">{heading || project.name}</h1>
      {tagLine && <p className="fs-lead fs-hero-tagline">{tagLine}</p>}
      <div className="mt-8">
        <GameButtons buttons={buttons} />
      </div>
    </>
  )

  if (!backgroundImage || typeof backgroundImage !== 'object') {
    return (
      <section className="fs-hero fs-hero-bare">
        <div className="fs-shell">{title}</div>
      </section>
    )
  }

  return (
    <section className="fs-hero fs-hero-plated" data-align="start">
      <div className="fs-hero-stage">
        <div className="fs-hero-art">
          <Media fill imgClassName="object-cover" priority resource={backgroundImage} size="100vw" />
        </div>
        <div className="fs-hero-plate">{title}</div>
      </div>
    </section>
  )
}
