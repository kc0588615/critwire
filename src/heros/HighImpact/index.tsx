import React from 'react'

import type { Page } from '@/payload-types'

import { Media } from '@/components/Media'
import RichText from '@/components/RichText'
import { HeroLinks } from '@/heros/HeroLinks'

/**
 * The home page's yellow slip, for a CMS page that wants the loud
 * opening. The media sits below on paper rather than behind the text,
 * so the text keeps the palette's guaranteed contrast.
 */
export const HighImpactHero: React.FC<Page['hero']> = ({ links, media, richText }) => {
  return (
    <>
      <div className="cw-slip">
        <div className="cw-shell">
          <div className="cw-page-column">
            {richText && <RichText data={richText} enableGutter={false} />}
            <HeroLinks links={links} />
          </div>
        </div>
      </div>
      {media && typeof media === 'object' && (
        <div className="cw-shell">
          <Media imgClassName="cw-media-img" priority resource={media} />
        </div>
      )}
    </>
  )
}
