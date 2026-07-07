import React, { Fragment } from 'react'

import type { GamePage, GameProject } from '@/payload-types'

import { GameCTAComponent } from '@/blocks/game/CTA/Component'
import { GameFeaturesComponent } from '@/blocks/game/Features/Component'
import { GameHeroComponent } from '@/blocks/game/Hero/Component'
import { MediaGalleryComponent } from '@/blocks/game/MediaGallery/Component'
import { TrailerEmbedComponent } from '@/blocks/game/Trailer/Component'

type GameBlock = NonNullable<GamePage['content']>[number]

export const RenderGameBlocks: React.FC<{
  blocks: GameBlock[] | null | undefined
  project: GameProject
}> = ({ blocks, project }) => {
  if (!blocks?.length) return null

  return (
    <Fragment>
      {blocks.map((block, index) => {
        switch (block.blockType) {
          case 'gameHero':
            // Hero renders full-bleed at the top — no section spacing.
            return <GameHeroComponent key={block.id ?? index} {...block} project={project} />
          case 'gameFeatures':
            return (
              <div className="my-16" key={block.id ?? index}>
                <GameFeaturesComponent {...block} />
              </div>
            )
          case 'mediaGallery':
            return (
              <div className="my-16" key={block.id ?? index}>
                <MediaGalleryComponent {...block} />
              </div>
            )
          case 'gameCTA':
            return (
              <div className="my-16" key={block.id ?? index}>
                <GameCTAComponent {...block} />
              </div>
            )
          case 'trailerEmbed':
            return (
              <div className="my-16" key={block.id ?? index}>
                <TrailerEmbedComponent {...block} />
              </div>
            )
          default:
            return null
        }
      })}
    </Fragment>
  )
}
