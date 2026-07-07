import React from 'react'

import type { GameFeaturesBlock } from '@/payload-types'

import { Media } from '@/components/Media'

export const GameFeaturesComponent: React.FC<GameFeaturesBlock> = ({ heading, items }) => {
  if (!items?.length) return null

  return (
    <section className="mx-auto max-w-6xl px-6">
      {heading && <h2 className="mb-10 text-center text-3xl font-bold">{heading}</h2>}
      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <div className="rounded-lg border p-6" key={item.id ?? i}>
            {item.image && typeof item.image === 'object' && (
              <Media
                imgClassName="mb-4 aspect-video w-full rounded-md object-cover"
                resource={item.image}
              />
            )}
            <h3 className="text-lg font-semibold">{item.title}</h3>
            {item.description && <p className="mt-2 opacity-80">{item.description}</p>}
          </div>
        ))}
      </div>
    </section>
  )
}
