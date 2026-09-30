import type { GameProject } from '@/payload-types'

import config from '@payload-config'
import { notFound, redirect } from 'next/navigation'
import { getPayload } from 'payload'
import { cache } from 'react'

/**
 * Fetches a game project by public slug, as an anonymous visitor would
 * see it: access control drops tenant-only fields (contact email,
 * Discord webhook) and leaves unreadable relations, like `tenant`, as
 * IDs, and a held game or a suspended studio's game comes back null.
 * Wrapped in React cache() so the portal layout and nested pages
 * share one query per request.
 */
export const getGameProject = cache(async (slug: string): Promise<GameProject | null> => {
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'game-projects',
    depth: 1,
    limit: 1,
    overrideAccess: false,
    pagination: false,
    where: { slug: { equals: slug } },
  })

  return result.docs[0] ?? null
})

/**
 * Whether any game has this slug, public or not. A privileged read that
 * returns only a boolean, so nothing about a hidden game leaks.
 */
export const portalExists = cache(async (slug: string): Promise<boolean> => {
  const payload = await getPayload({ config })
  const { totalDocs } = await payload.count({
    collection: 'game-projects',
    overrideAccess: true,
    where: { slug: { equals: slug } },
  })

  return totalDocs > 0
})

/**
 * The portal gate for every page under /g/[gameSlug]: the public project,
 * or `/unavailable` when the game exists but is held or its studio is
 * suspended (the page doesn't say which), or a 404 when there's no such game.
 */
export const requirePortalProject = async (slug: string): Promise<GameProject> => {
  const project = await getGameProject(slug)
  if (project) return project
  if (await portalExists(slug)) redirect('/unavailable')
  notFound()
}
