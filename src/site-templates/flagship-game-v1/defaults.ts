import { extractID } from 'payload/shared'

import type { GameProject } from '@/payload-types'

import { resolveSiteAction } from './actions'
import { siteConfigV1Schema, type SiteConfigV1 } from './schema/config'
import type { SiteAction, SiteActionRef } from './schema/refs'
import { toSafeText } from './schema/text'

/**
 * Derives a complete, always-valid flagship configuration from project
 * facts alone. This is the first-run path for every project without a
 * published flagship page, so it must never throw: derived values are
 * sanitized and the result is parsed through the canonical schema. Its
 * theme is the schema default and unused: the frame renders the
 * project's theme.
 */

const firstResolvable = (refs: SiteActionRef[], project: GameProject): null | SiteAction => {
  for (const ref of refs) {
    if (resolveSiteAction({ label: null, ref }, project)) return { label: null, ref }
  }
  return null
}

export const deriveFlagshipDefault = (project: GameProject): SiteConfigV1 => {
  const bannerId = project.banner == null ? null : extractID(project.banner)
  const storeAction = firstResolvable(['primary-store', 'demo', 'discord'], project)
  const hasDiscord = Boolean(project.links?.discord)

  return siteConfigV1Schema.parse({
    nav: {
      links: [
        { label: null, ref: 'updates' },
        { label: null, ref: 'issues' },
        { label: null, ref: 'report' },
        { label: null, ref: 'contact' },
      ],
      cta: storeAction,
    },
    hero: {
      variant: bannerId ? 'leftEditorial' : 'centeredCinematic',
      backgroundMedia: bannerId,
      // heading/tagline stay null — the renderer falls back to the
      // project name and description, which need no sanitizing here.
      primaryAction: storeAction,
      secondaryAction: { label: null, ref: 'issues' },
    },
    trailer: {
      enabled: Boolean(project.links?.trailer),
    },
    community: {
      variant: hasDiscord ? 'split' : 'artworkBanner',
      body: toSafeText(`Report bugs, follow fixes, and help shape ${project.name}.`, 400),
      actions: hasDiscord
        ? [
            { label: null, ref: 'discord' },
            { label: null, ref: 'report' },
          ]
        : [
            { label: null, ref: 'report' },
            { label: null, ref: 'contact' },
          ],
    },
    finalCta: {
      // Only a game players can get has a closing "Play {name}" (the null
      // heading); without one it would repeat the community's actions.
      enabled: storeAction !== null,
      heading: null,
      primaryAction: storeAction ?? { label: null, ref: 'report' },
      secondaryAction: { label: null, ref: 'contact' },
    },
  })
}
