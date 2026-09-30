import type { GameProject } from '@/payload-types'

type ProjectLinkKey = keyof NonNullable<GameProject['links']>

/** `trailer` is a video embed for the landing, not an outbound link. */
type OutboundLinkKey = Exclude<ProjectLinkKey, 'trailer'>

export type ProjectLink = { key: OutboundLinkKey; label: string; url: string }

/**
 * Every outbound link field and its public label, in display order. A
 * `Record`, so a link field added to GameProjects fails the typecheck
 * until it's labelled here, instead of silently never showing.
 */
export const PROJECT_LINK_LABELS: Record<OutboundLinkKey, string> = {
  website: 'Official site',
  steam: 'Steam',
  epic: 'Epic Games Store',
  itch: 'itch.io',
  gog: 'GOG',
  playstation: 'PlayStation Store',
  xbox: 'Xbox Store',
  nintendo: 'Nintendo eShop',
  discord: 'Discord',
  youtube: 'YouTube',
  support: 'Support',
  docs: 'Docs',
  merch: 'Merch',
  pressKit: 'Press kit',
  privacy: 'Privacy policy',
  terms: 'Terms',
}

/** The project's outbound links that have a URL, in the table's order. */
export const resolveProjectLinks = (project: GameProject): ProjectLink[] =>
  (Object.entries(PROJECT_LINK_LABELS) as [OutboundLinkKey, string][]).flatMap(([key, label]) => {
    const url = project.links?.[key]
    return typeof url === 'string' && url ? [{ key, label, url }] : []
  })

const firstUrl = (...candidates: (null | string | undefined)[]): null | string => {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate) return candidate
  }
  return null
}

/**
 * The studio's platform array order is the priority order: the first
 * platform with a store URL wins, then the store links. The studio's
 * website is never a store; the chrome's Official site link covers it.
 */
export const resolvePrimaryStoreUrl = (project: GameProject): null | string => {
  const platformStore = project.availability?.platforms?.find(
    (platform) => typeof platform.storeUrl === 'string' && platform.storeUrl,
  )?.storeUrl
  return firstUrl(platformStore, project.links?.steam, project.links?.epic, project.links?.itch)
}
