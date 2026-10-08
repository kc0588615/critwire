import type { CSSProperties } from 'react'

import { paletteVars, radiusVars } from '@/components/game/theme/themeStyle'
import { backgroundScheme, contrastRatio } from '@/lib/game-portal/contrast'
import {
  CC_PALETTES,
  isDefaultPalette,
  type SiteThemeColors,
  siteThemeColorsSchema,
  type SiteThemeV1,
} from '@/lib/game-portal/theme'
import type { Mode } from '@/lib/theme/tokens'

/**
 * cc in the scheme the game's palette doesn't cover, carrying the game's
 * accent pair where it reads (at least 3:1 on cc's background), else the
 * swapped pair (the theme guarantees 4.5:1 between the two), else cc's
 * accent. A9's special light accent is gone: color-1 is 4.03:1 on white.
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
 * The embed's light and dark palettes. The default palette is cc in both
 * modes, as on the portal. Otherwise the game's own palette serves its
 * own scheme as is, and the other scheme is cc's, in the game's accent.
 */
export const embedPalettes = (colors: SiteThemeColors): Record<Mode, SiteThemeColors> => {
  if (isDefaultPalette(colors)) return CC_PALETTES
  const own = backgroundScheme(colors.background)
  const other = own === 'dark' ? 'light' : 'dark'
  return {
    [own]: colors,
    [other]: siteThemeColorsSchema.parse(withGameAccent(CC_PALETTES[other], colors)),
  } as Record<Mode, SiteThemeColors>
}

/**
 * The embed root's custom properties: both palettes (portal.css maps them
 * onto `--fs-*` by the `color-scheme` embed.css gives each mode), and the
 * theme's radii. One response serves every visitor's mode.
 */
export const embedStyle = (theme: SiteThemeV1): CSSProperties => ({
  ...paletteVars(embedPalettes(theme.colors)),
  ...radiusVars(theme.shape),
})
