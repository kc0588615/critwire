import type { CSSProperties } from 'react'

import type { SiteThemeV1 } from '../schema/theme'

const RADIUS: Record<SiteThemeV1['shape'], string> = {
  balanced: '0.625rem',
  sharp: '0px',
  soft: '1.25rem',
}

const SECTION_Y: Record<SiteThemeV1['density'], string> = {
  cinematic: 'clamp(4.5rem, 9vw, 8.5rem)',
  compact: 'clamp(3rem, 6vw, 5rem)',
}

const SANS = 'var(--font-geist-sans), system-ui, sans-serif'
const SERIF = 'Georgia, Cambria, "Times New Roman", serif'
const MONO = 'var(--font-geist-mono), ui-monospace, monospace'

const FONTS: Record<SiteThemeV1['typography'], { body: string; heading: string }> = {
  editorial: { body: SANS, heading: SERIF },
  modern: { body: SANS, heading: SANS },
  technical: { body: SANS, heading: MONO },
}

/**
 * Maps validated theme tokens to the `--fs-*` custom properties the
 * flagship stylesheet and components consume. Only these variables —
 * never raw values — appear in component styling.
 */
export const themeStyle = (theme: SiteThemeV1): CSSProperties =>
  ({
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
    '--fs-radius': RADIUS[theme.shape],
    '--fs-section-y': SECTION_Y[theme.density],
    '--fs-font-heading': FONTS[theme.typography].heading,
    '--fs-font-body': FONTS[theme.typography].body,
  }) as CSSProperties
