import React from 'react'

import type { GameFeaturesBlock } from '@/payload-types'

import { Media } from '@/components/Media'

export const GameFeaturesComponent: React.FC<GameFeaturesBlock> = ({ heading, items }) => {
  if (!items?.length) return null

  return (
    <section className="fs-section">
      <div className="fs-shell">
        {heading && (
          <div className="fs-section-head">
            <h2 className="fs-h2">{heading}</h2>
          </div>
        )}
        <ul className="fs-feature-grid">
          {items.map((item, i) => (
            <li key={item.id ?? i}>
              {item.image && typeof item.image === 'object' && (
                <div className="fs-media-frame fs-feature-media">
                  <Media
                    fill
                    imgClassName="object-cover"
                    resource={item.image}
                    size="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  />
                </div>
              )}
              <h3 className="fs-h3">{item.title}</h3>
              {item.description && (
                <p className="fs-body mt-2 text-[var(--fs-muted-fg)]">{item.description}</p>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
