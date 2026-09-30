import type { GameProject } from '@/payload-types'

import { resolvePrimaryStoreUrl } from '@/lib/game-portal/links'
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
