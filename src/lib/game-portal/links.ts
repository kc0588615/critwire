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

const linkUrl = (project: GameProject, key: OutboundLinkKey): null | string => {
  const url = project.links?.[key]
  return typeof url === 'string' && url ? url : null
}

/** The project's outbound links that have a URL, in the table's order. */
export const resolveProjectLinks = (project: GameProject): ProjectLink[] =>
  (Object.entries(PROJECT_LINK_LABELS) as [OutboundLinkKey, string][]).flatMap(([key, label]) => {
    const url = linkUrl(project, key)
    return url ? [{ key, label, url }] : []
  })

/** The link fields that point at a store page, in the table's order. */
const STORE_LINK_KEYS = [
  'steam',
  'epic',
  'itch',
  'gog',
  'playstation',
  'xbox',
  'nintendo',
] as const satisfies readonly OutboundLinkKey[]

/** The hub header's secondary links, in order. */
const HUB_LINK_KEYS = [...STORE_LINK_KEYS, 'discord', 'website'] as const

/**
 * The studio's platform array order is the priority order: the first
 * platform with a store URL wins, then the store links. The studio's
 * website is never a store; the chrome's Official site link covers it.
 */
export const resolvePrimaryStoreUrl = (project: GameProject): null | string => {
  const platformStore = project.availability?.platforms?.find(
    (platform) => typeof platform.storeUrl === 'string' && platform.storeUrl,
  )?.storeUrl
  return platformStore || (STORE_LINK_KEYS.map((key) => linkUrl(project, key)).find(Boolean) ?? null)
}

export type HubLink = { label: string; url: string }

/**
 * The hub header's links, each URL once: "Get the game" (the primary
 * store) first, then the other store links, Discord and the Official site.
 */
export const resolveHubLinks = (
  project: GameProject,
): { primary: HubLink | null; secondary: HubLink[] } => {
  const primaryUrl = resolvePrimaryStoreUrl(project)
  const seen = new Set(primaryUrl ? [primaryUrl] : [])
  const secondary = HUB_LINK_KEYS.flatMap((key) => {
    const url = linkUrl(project, key)
    if (!url || seen.has(url)) return []
    seen.add(url)
    return [{ label: PROJECT_LINK_LABELS[key], url }]
  })
  return { primary: primaryUrl ? { label: 'Get the game', url: primaryUrl } : null, secondary }
}
