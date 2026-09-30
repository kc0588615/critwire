import type { GameProject } from '@/payload-types'

import { portalPaths } from '@/lib/game-portal/paths'

import type { SiteAction, SiteActionRef } from './schema/refs'

/**
 * Cross-plan contract: `contact`, `report`, `issues`, and `updates`
 * ALWAYS resolve to internal /g/[gameSlug]/… routes. What those routes
 * render (native form, Tally embed, external link) is provider logic
 * owned by the route pages — never resolved here. External refs resolve
 * only from approved GameProject fact URLs; configuration never
 * contains raw URLs.
 */

export type ResolvedSiteAction = {
  external: boolean
  href: string
  label: string
  ref: SiteActionRef
}

export const DEFAULT_ACTION_LABELS: Record<SiteActionRef, string> = {
  'primary-store': 'Get the game',
  contact: 'Contact',
  demo: 'Play the demo',
  discord: 'Join the Discord',
  epic: 'Epic Games Store',
  issues: 'Known issues',
  itch: 'itch.io',
  report: 'Report a bug',
  steam: 'Steam',
  updates: 'Patch notes',
}

type ProjectLinkKey = keyof NonNullable<GameProject['links']>

export type ProjectLink = { key: ProjectLinkKey; label: string; url: string }

/** The project's own outbound links, listed in the portal footer. */
export const EXTERNAL_LINK_LABELS: Partial<Record<ProjectLinkKey, string>> = {
  discord: 'Discord',
  docs: 'Docs',
  epic: 'Epic',
  itch: 'itch.io',
  merch: 'Merch',
  steam: 'Steam',
  support: 'Support',
  website: 'Website',
}

export const LEGAL_LINK_LABELS: Partial<Record<ProjectLinkKey, string>> = {
  pressKit: 'Press kit',
  privacy: 'Privacy policy',
  terms: 'Terms',
}

/** The labelled links the project has a URL for, in the table's order. */
export const resolveProjectLinks = (
  project: GameProject,
  labels: Partial<Record<ProjectLinkKey, string>>,
): ProjectLink[] =>
  (Object.entries(labels) as [ProjectLinkKey, string][]).flatMap(([key, label]) => {
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
 * platform with a store URL wins, then the store links.
 */
export const resolvePrimaryStoreUrl = (project: GameProject): null | string => {
  const platformStore = project.availability?.platforms?.find(
    (platform) => typeof platform.storeUrl === 'string' && platform.storeUrl,
  )?.storeUrl
  return firstUrl(
    platformStore,
    project.links?.steam,
    project.links?.epic,
    project.links?.itch,
    project.links?.website,
  )
}

export const resolveSiteAction = (
  action: null | SiteAction | undefined,
  project: GameProject,
): null | ResolvedSiteAction => {
  if (!action) return null
  const { ref } = action
  const label = action.label || DEFAULT_ACTION_LABELS[ref]
  const paths = portalPaths(project.slug)
  const internal = (href: string): ResolvedSiteAction => ({
    external: false,
    href,
    label,
    ref,
  })
  const external = (url: null | string | undefined): null | ResolvedSiteAction =>
    typeof url === 'string' && url ? { external: true, href: url, label, ref } : null

  switch (ref) {
    case 'contact':
      return internal(paths.contact)
    case 'issues':
      return internal(paths.feedback)
    case 'report':
      return internal(paths.newFeedback())
    case 'updates':
      return internal(paths.updates)
    case 'demo':
      return external(project.availability?.demoUrl)
    case 'discord':
      return external(project.links?.discord)
    case 'epic':
      return external(project.links?.epic)
    case 'itch':
      return external(project.links?.itch)
    case 'steam':
      return external(project.links?.steam)
    case 'primary-store':
      return external(resolvePrimaryStoreUrl(project))
  }
}

/** Resolves a list, silently dropping refs the project has no fact URL for. */
export const resolveSiteActions = (
  actions: (null | SiteAction | undefined)[] | null | undefined,
  project: GameProject,
): ResolvedSiteAction[] =>
  (actions ?? []).flatMap((action) => {
    const resolved = resolveSiteAction(action, project)
    return resolved ? [resolved] : []
  })
