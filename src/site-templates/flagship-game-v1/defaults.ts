import { extractID } from 'payload/shared'

import type { GameProject } from '@/payload-types'

import { resolveSiteAction } from './actions'
import { siteConfigV1Schema, type SiteConfigV1 } from './schema/config'
import { contrastRatio, normalizeHexColor } from './schema/contrast'
import type { SiteAction, SiteActionRef } from './schema/refs'
import { toSafeText } from './schema/text'
import { DEFAULT_THEME_COLORS } from './schema/theme'

/**
 * Derives a complete, always-valid flagship configuration from project
 * facts alone. This is the first-run path for every project without a
 * published flagship page, so it must never throw: derived values are
 * sanitized and the result is parsed through the canonical schema.
 */

const ACCENT_FOREGROUND_CANDIDATES = ['#0b1016', '#f5f7fb', '#000000', '#ffffff']

export const deriveAccentColors = (
  raw: null | string | undefined,
): { accent: string; accentForeground: string } => {
  let accent = normalizeHexColor(raw) ?? DEFAULT_THEME_COLORS.accent
  // Accent must clear 3:1 against the fixed dark background; muddy
  // user accents fall back to the default rather than failing.
  if (contrastRatio(accent, DEFAULT_THEME_COLORS.background) < 3) {
    accent = DEFAULT_THEME_COLORS.accent
  }
  const accentForeground =
    ACCENT_FOREGROUND_CANDIDATES.find((candidate) => contrastRatio(candidate, accent) >= 4.5) ??
    '#000000'
  return { accent, accentForeground }
}

const firstResolvable = (refs: SiteActionRef[], project: GameProject): null | SiteAction => {
  for (const ref of refs) {
    if (resolveSiteAction({ label: null, ref }, project)) return { label: null, ref }
  }
  return null
}

export const deriveFlagshipDefault = (project: GameProject): SiteConfigV1 => {
  const { accent, accentForeground } = deriveAccentColors(project.accentColor)
  const bannerId = project.banner == null ? null : extractID(project.banner)
  const storeAction = firstResolvable(['primary-store', 'demo', 'discord'], project)
  const hasDiscord = Boolean(project.links?.discord)

  return siteConfigV1Schema.parse({
    theme: {
      colors: { ...DEFAULT_THEME_COLORS, accent, accentForeground },
    },
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
      heading: 'Ready to jump in?',
      primaryAction: storeAction ?? { label: null, ref: 'report' },
      secondaryAction: { label: null, ref: 'contact' },
    },
  })
}
