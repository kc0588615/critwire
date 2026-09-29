import type { CSSProperties } from 'react'

import type { SiteThemeV1 } from '../schema/theme'

type DisplayVoice = {
  family: string
  leading: number
  scale: number
  stretch: string
  tracking: string
  weight: number
  wordSpacing: string
}

/** The display voice per `typography` token; the faces come from `../fonts.ts`. */
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

/** `shape` maps to [surface radius, control radius]. */
const RADIUS: Record<SiteThemeV1['shape'], [surface: string, control: string]> = {
  balanced: ['0.5rem', '0.375rem'],
  sharp: ['0px', '0px'],
  soft: ['1rem', '0.625rem'],
}

const SECTION_Y: Record<SiteThemeV1['density'], string> = {
  cinematic: 'clamp(4.5rem, 9vw, 8rem)',
  compact: 'clamp(2.75rem, 5vw, 4.5rem)',
}

/**
 * Maps validated theme tokens to the `--fs-*` custom properties the
 * flagship stylesheet and components consume. Only these variables —
 * never raw values — appear in component styling.
 */
export const themeStyle = (theme: SiteThemeV1): CSSProperties => {
  const [radius, radiusControl] = RADIUS[theme.shape]
  const voice = DISPLAY[theme.typography]

  return {
    '--fs-bg': theme.colors.background,
    '--fs-fg': theme.colors.foreground,
    '--fs-muted-fg': theme.colors.mutedForeground,
    '--fs-surface': theme.colors.surface,
    '--fs-accent': theme.colors.accent,
    '--fs-accent-fg': theme.colors.accentForeground,
    '--fs-border': theme.colors.border,
    '--fs-success': theme.colors.success,
    '--fs-warning': theme.colors.warning,
    '--fs-error': theme.colors.error,
    '--fs-radius': radius,
    '--fs-radius-control': radiusControl,
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
