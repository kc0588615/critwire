import type { CSSProperties } from 'react'

import { paletteVars, radiusVars } from '@/components/game/theme/themeStyle'
import { backgroundScheme, contrastRatio } from '@/lib/game-portal/contrast'
import {
  DEFAULT_THEME_COLORS,
  type SiteThemeColors,
  siteThemeColorsSchema,
  type SiteThemeV1,
} from '@/lib/game-portal/theme'
import { CW } from '@/lib/theme/cw'

const { neutral: light } = CW.light

/**
 * The scheme a game's palette doesn't cover: a fixed neutral palette,
 * cw in that mode. Light's accent is neutral-10 with neutral-1 on it,
 * since cw's color-1 is 2.08:1 on white (A9). Parsed at load, so a
 * constant that fails the theme's contrast rules throws at once.
 */
const NEUTRAL: Record<'dark' | 'light', SiteThemeColors> = {
  dark: DEFAULT_THEME_COLORS,
  light: siteThemeColorsSchema.parse({
    background: light[1],
    foreground: light[10],
    mutedForeground: light[7],
    surface: light[2],
    accent: light[10],
    accentForeground: light[1],
    border: light[4],
    ...CW.status,
  }),
}

/**
 * The neutral palette carrying the game's accent pair where it reads (at
 * least 3:1 on the neutral background), else the swapped pair (the theme
 * guarantees 4.5:1 between the two), else the neutral accent.
 */
const withGameAccent = (neutral: SiteThemeColors, game: SiteThemeColors): SiteThemeColors => {
  const reads = (fill: string) => contrastRatio(fill, neutral.background) >= 3
  if (reads(game.accent)) {
    return { ...neutral, accent: game.accent, accentForeground: game.accentForeground }
  }
  if (reads(game.accentForeground)) {
    return { ...neutral, accent: game.accentForeground, accentForeground: game.accent }
  }
  return neutral
}

/**
 * The embed's light and dark palettes. The game's own palette serves its
 * own scheme as is; the other scheme is neutral, in the game's accent.
 */
export const embedPalettes = (colors: SiteThemeColors): Record<'dark' | 'light', SiteThemeColors> => {
  const own = backgroundScheme(colors.background)
  const other = own === 'dark' ? 'light' : 'dark'
  return {
    [own]: colors,
    [other]: siteThemeColorsSchema.parse(withGameAccent(NEUTRAL[other], colors)),
  } as Record<'dark' | 'light', SiteThemeColors>
}

/**
 * The embed root's custom properties: both palettes, as `--cw-light-*`
 * and `--cw-dark-*` (`embed.css` maps one onto `--fs-*` by mode), and
 * the theme's radii. One response serves every visitor's mode.
 */
export const embedStyle = (theme: SiteThemeV1): CSSProperties => {
  const { dark, light } = embedPalettes(theme.colors)
  return {
    ...paletteVars(light, '--cw-light'),
    ...paletteVars(dark, '--cw-dark'),
    ...radiusVars(theme.shape),
  }
}
