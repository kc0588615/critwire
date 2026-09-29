import React from 'react'

import type { CallToActionBlock as CTABlockProps } from '@/payload-types'

import RichText from '@/components/RichText'
import { CMSLink } from '@/components/Link'

export const CallToActionBlock: React.FC<CTABlockProps> = ({ links, richText }) => {
  return (
    <div className="cw-shell">
      <div className="cw-page-column cw-cta">
        {richText && <RichText data={richText} enableGutter={false} />}
        {links && links.length > 0 && (
          <ul className="cw-actions">
            {links.map(({ link }, i) => (
              <li key={i}>
                <CMSLink size="lg" {...link} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
