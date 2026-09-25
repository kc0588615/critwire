import type { GameProject } from '@/payload-types'

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
  'primary-store': 'Get the Game',
  contact: 'Contact',
  demo: 'Play the Demo',
  discord: 'Join the Discord',
  epic: 'Epic Games Store',
  issues: 'Known Issues',
  itch: 'itch.io',
  report: 'Report a Bug',
  steam: 'Steam',
  updates: 'Patch Notes',
}

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
  const internal = (path: string): ResolvedSiteAction => ({
    external: false,
    href: `/g/${project.slug}${path}`,
    label,
    ref,
  })
  const external = (url: null | string | undefined): null | ResolvedSiteAction =>
    typeof url === 'string' && url ? { external: true, href: url, label, ref } : null

  switch (ref) {
    case 'contact':
      return internal('/contact')
    case 'issues':
      return internal('/issues')
    case 'report':
      return internal('/report')
    case 'updates':
      return internal('/patch-notes')
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
