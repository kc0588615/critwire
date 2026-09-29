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
            return <GameHeroComponent key={block.id ?? index} {...block} project={project} />
          case 'gameFeatures':
            return <GameFeaturesComponent key={block.id ?? index} {...block} />
          case 'mediaGallery':
            return <MediaGalleryComponent key={block.id ?? index} {...block} />
          case 'gameCTA':
            return <GameCTAComponent key={block.id ?? index} {...block} />
          case 'trailerEmbed':
            return <TrailerEmbedComponent key={block.id ?? index} {...block} />
          default:
            return null
        }
      })}
    </Fragment>
  )
}
