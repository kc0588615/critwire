import type { CSSProperties } from 'react'

import { backgroundScheme } from '@/lib/game-portal/contrast'
import {
  portalPalettes,
  SHAPE_RADIUS,
  type SiteThemeColors,
  type SiteThemeV1,
} from '@/lib/game-portal/theme'
import type { Mode } from '@/lib/theme/tokens'

type DisplayVoice = {
  family: string
  stretch: string
  tracking: string
  weight: number | string
  wordSpacing: string
}

/**
 * The display voice per `typography` token; the faces come from `./fonts.ts`.
 * Sizes and line heights are the theme's text steps for every voice (portal.css).
 */
const DISPLAY: Record<SiteThemeV1['typography'], DisplayVoice> = {
  editorial: {
    family: 'var(--font-young-serif), Georgia, serif',
    stretch: '100%',
    tracking: '-0.02em',
    weight: 400,
    wordSpacing: '0',
  },
  modern: {
    family: 'var(--font-archivo), system-ui, sans-serif',
    stretch: '78%',
    tracking: '-0.012em',
    weight: 800,
    // The 78% width narrows the space too; without this, words run together.
    wordSpacing: '0.08em',
  },
  // The theme's own voice: its brand font at the heavy weight, on its tracking.
  standard: {
    family: 'var(--font-brand)',
    stretch: '100%',
    tracking: 'var(--letter-spacing-xl)',
    weight: 'var(--weight-brand-heavy)',
    wordSpacing: '0',
  },
  technical: {
    family: 'var(--font-science-gothic), system-ui, sans-serif',
    stretch: '112%',
    tracking: '0',
    weight: 700,
    wordSpacing: '0',
  },
}

/** A hub section's vertical padding: multiples of the theme's largest space step. */
const SECTION_Y: Record<SiteThemeV1['density'], string> = {
  cinematic: 'clamp(calc(var(--space-xxl) * 2), 9vw, calc(var(--space-xxl) * 3.5))',
  compact: 'clamp(var(--space-xxl), 5vw, calc(var(--space-xxl) * 2))',
}

/** One palette's ten slots as `<prefix>-<slot>` custom properties. */
const slotVars = (colors: SiteThemeColors, prefix: string): CSSProperties =>
  ({
    [`${prefix}-bg`]: colors.background,
    [`${prefix}-fg`]: colors.foreground,
    [`${prefix}-muted-fg`]: colors.mutedForeground,
    [`${prefix}-surface`]: colors.surface,
    [`${prefix}-accent`]: colors.accent,
    [`${prefix}-accent-fg`]: colors.accentForeground,
    [`${prefix}-border`]: colors.border,
    [`${prefix}-success`]: colors.success,
    [`${prefix}-warning`]: colors.warning,
    [`${prefix}-error`]: colors.error,
  }) as CSSProperties

/**
 * Both modes' palettes as `--fs-light-*` and `--fs-dark-*`. portal.css
 * maps them onto `--fs-*` for every `.fs-root` (the embed's root is one
 * too), by the root's `color-scheme`.
 */
export const paletteVars = (palettes: Record<Mode, SiteThemeColors>): CSSProperties => ({
  ...slotVars(palettes.light, '--fs-light'),
  ...slotVars(palettes.dark, '--fs-dark'),
})

/** The theme's corner radii, for surfaces, controls and buttons, as the theme's radius tokens. */
export const radiusVars = (shape: SiteThemeV1['shape']): CSSProperties => {
  const { surface, control, button } = SHAPE_RADIUS[shape]
  return {
    '--fs-radius': `var(--radius-${surface})`,
    '--fs-radius-control': `var(--radius-${control})`,
    '--fs-radius-button': `var(--radius-${button})`,
  } as CSSProperties
}

/**
 * Maps validated theme tokens to the `--fs-*` custom properties the
 * portal stylesheet and components consume, beside the theme's tokens. Only
 * these variables, never raw values, appear in component styling. The
 * `motion` token is the root's `data-fs-motion` (`PortalRoot`).
 */
export const themeStyle = (theme: SiteThemeV1): CSSProperties => {
  const voice = DISPLAY[theme.typography]
  const { light, dark } = portalPalettes(theme.colors)

  return {
    // The mode the palettes are picked by; native controls, scrollbars and
    // Turnstile follow it too. The default palette follows the system.
    colorScheme: light === dark ? backgroundScheme(light.background) : 'light dark',
    ...paletteVars({ light, dark }),
    ...radiusVars(theme.shape),
    '--fs-section-y': SECTION_Y[theme.density],
    '--fs-font-display': voice.family,
    '--fs-display-weight': voice.weight,
    '--fs-display-stretch': voice.stretch,
    '--fs-display-tracking': voice.tracking,
    '--fs-display-word-spacing': voice.wordSpacing,
  } as CSSProperties
}
