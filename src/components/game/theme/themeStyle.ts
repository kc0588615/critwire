import type { CSSProperties } from 'react'

import { backgroundScheme } from '@/lib/game-portal/contrast'
import { SHAPE_RADIUS, type SiteThemeV1 } from '@/lib/game-portal/theme'

type DisplayVoice = {
  family: string
  stretch: string
  tracking: string
  weight: number | string
  wordSpacing: string
}

/**
 * The display voice per `typography` token; the faces come from `./fonts.ts`.
 * Sizes and line heights are cw's text steps for every voice (portal.css).
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

/** A hub section's vertical padding: multiples of cw's largest space step. */
const SECTION_Y: Record<SiteThemeV1['density'], string> = {
  cinematic: 'clamp(calc(var(--space-xxl) * 2), 9vw, calc(var(--space-xxl) * 3.5))',
  compact: 'clamp(var(--space-xxl), 5vw, calc(var(--space-xxl) * 2))',
}

/**
 * One palette as `<prefix>-*` custom properties: `--fs` for the portal,
 * and a light and a dark set for the embed.
 */
export const paletteVars = (colors: SiteThemeV1['colors'], prefix: string): CSSProperties =>
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

/** The theme's two corner radii, for surfaces and for controls, as cw radius tokens. */
export const radiusVars = (shape: SiteThemeV1['shape']): CSSProperties => {
  const { surface, control } = SHAPE_RADIUS[shape]
  return { '--fs-radius': `var(--radius-${surface})`, '--fs-radius-control': `var(--radius-${control})` } as CSSProperties
}

/**
 * Maps validated theme tokens to the `--fs-*` custom properties the
 * portal stylesheet and components consume, beside cw's tokens. Only
 * these variables, never raw values, appear in component styling. The
 * `motion` token is the root's `data-fs-motion` (`PortalRoot`).
 */
export const themeStyle = (theme: SiteThemeV1): CSSProperties => {
  const voice = DISPLAY[theme.typography]

  return {
    // Native controls, scrollbars and Turnstile follow the palette's mode.
    colorScheme: backgroundScheme(theme.colors.background),
    ...paletteVars(theme.colors, '--fs'),
    ...radiusVars(theme.shape),
    '--fs-section-y': SECTION_Y[theme.density],
    '--fs-font-display': voice.family,
    '--fs-display-weight': voice.weight,
    '--fs-display-stretch': voice.stretch,
    '--fs-display-tracking': voice.tracking,
    '--fs-display-word-spacing': voice.wordSpacing,
  } as CSSProperties
}
