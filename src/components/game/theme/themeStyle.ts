import type { CSSProperties } from 'react'

import { SHAPE_RADIUS, type SiteThemeV1 } from '@/lib/game-portal/theme'

type DisplayVoice = {
  family: string
  leading: number
  scale: number
  stretch: string
  tracking: string
  weight: number | string
  wordSpacing: string
}

/** The display voice per `typography` token; the faces come from `./fonts.ts`. */
const DISPLAY: Record<SiteThemeV1['typography'], DisplayVoice> = {
  editorial: {
    family: 'var(--font-young-serif), Georgia, serif',
    leading: 1,
    scale: 0.94,
    stretch: '100%',
    tracking: '-0.02em',
    weight: 400,
    wordSpacing: '0',
  },
  modern: {
    family: 'var(--font-archivo), system-ui, sans-serif',
    leading: 0.95,
    scale: 1,
    stretch: '78%',
    tracking: '-0.012em',
    weight: 800,
    // The 78% width narrows the space too; without this, words run together.
    wordSpacing: '0.08em',
  },
  // cw's own voice: its brand font at the heavy weight, on cw's tracking.
  // S18 replaces scale and leading with cw's type steps.
  standard: {
    family: 'var(--font-brand)',
    leading: 1,
    scale: 0.9,
    stretch: '100%',
    tracking: 'var(--letter-spacing-xl)',
    weight: 'var(--weight-brand-heavy)',
    wordSpacing: '0',
  },
  technical: {
    family: 'var(--font-science-gothic), system-ui, sans-serif',
    leading: 1,
    scale: 0.78,
    stretch: '112%',
    tracking: '0',
    weight: 700,
    wordSpacing: '0',
  },
}

const SECTION_Y: Record<SiteThemeV1['density'], string> = {
  cinematic: 'clamp(4.5rem, 9vw, 8rem)',
  compact: 'clamp(2.75rem, 5vw, 4.5rem)',
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
 * flagship stylesheet and components consume. Only these variables —
 * never raw values — appear in component styling.
 */
export const themeStyle = (theme: SiteThemeV1): CSSProperties => {
  const voice = DISPLAY[theme.typography]

  return {
    ...paletteVars(theme.colors, '--fs'),
    ...radiusVars(theme.shape),
    '--fs-section-y': SECTION_Y[theme.density],
    '--fs-font-display': voice.family,
    '--fs-display-weight': voice.weight,
    '--fs-display-stretch': voice.stretch,
    '--fs-display-tracking': voice.tracking,
    '--fs-display-word-spacing': voice.wordSpacing,
    '--fs-display-scale': voice.scale,
    '--fs-display-leading': voice.leading,
  } as CSSProperties
}
