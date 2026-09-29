import React from 'react'

import type { Page } from '@/payload-types'

import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import { HeroLinks } from '@/heros/HeroLinks'

export const MediumImpactHero: React.FC<Page['hero']> = ({ links, media, richText }) => {
  return (
    <>
      <div className="cw-shell">
        <div className="cw-page-column">
          {richText && <RichText data={richText} enableGutter={false} />}
          <HeroLinks links={links} />
        </div>
      </div>
      {media && typeof media === 'object' && (
        <figure className="cw-shell">
          <Media imgClassName="cw-media-img" priority resource={media} />
          {media.caption && (
            <RichText
              className="cw-caption"
              data={media.caption}
              enableGutter={false}
              enableProse={false}
            />
          )}
        </figure>
      )}
    </>
  )
}
