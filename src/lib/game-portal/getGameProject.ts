import type { GameProject } from '@/payload-types'

import config from '@payload-config'
import { getPayload } from 'payload'
import { cache } from 'react'

/**
 * Fetches a game project by public slug. Wrapped in React cache() so
 * the portal layout and nested pages share one query per request.
 */
export const getGameProject = cache(async (slug: string): Promise<GameProject | null> => {
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'game-projects',
    depth: 1,
    limit: 1,
    pagination: false,
    where: { slug: { equals: slug } },
  })

  return result.docs[0] ?? null
})
