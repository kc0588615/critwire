import { z } from 'zod'

import { HEX_COLOR_RE, contrastRatio } from './contrast'

const hexColor = z.string().regex(HEX_COLOR_RE, 'Must be a 6-digit hex color like #22d3ee')

/**
 * Semantic color tokens. WCAG contrast is enforced at the schema level
 * so no theme — authored or AI-generated — can ship unreadable text.
 */
export const siteThemeColorsSchema = z
  .strictObject({
    background: hexColor,
    foreground: hexColor,
    mutedForeground: hexColor,
    surface: hexColor,
    accent: hexColor,
    accentForeground: hexColor,
    border: hexColor,
    success: hexColor,
    warning: hexColor,
    error: hexColor,
  })
  .superRefine((colors, ctx) => {
    const requirePair = (
      fg: keyof typeof colors,
      bg: keyof typeof colors,
      minimum: number,
    ): void => {
      const ratio = contrastRatio(colors[fg], colors[bg])
      if (ratio < minimum) {
        ctx.addIssue({
          code: 'custom',
          message: `${fg} on ${bg} has contrast ${ratio.toFixed(2)}:1 — needs at least ${minimum}:1 (WCAG).`,
          path: [fg],
        })
      }
    }
    requirePair('foreground', 'background', 4.5)
    requirePair('foreground', 'surface', 4.5)
    requirePair('mutedForeground', 'background', 4.5)
    requirePair('mutedForeground', 'surface', 4.5)
    requirePair('accentForeground', 'accent', 4.5)
    requirePair('accent', 'background', 3)
  })
export type SiteThemeColors = z.infer<typeof siteThemeColorsSchema>

/** Passes every contrast refinement; used as the schema default and in derived defaults. */
export const DEFAULT_THEME_COLORS: SiteThemeColors = {
  background: '#0b0d14',
  foreground: '#f2f5fa',
  mutedForeground: '#a8b1c4',
  surface: '#141927',
  accent: '#22d3ee',
  accentForeground: '#07181d',
  border: '#273043',
  success: '#34d399',
  warning: '#fbbf24',
  error: '#fb7185',
}

export const siteTypographySchema = z.enum(['modern', 'editorial', 'technical'])
export const siteShapeSchema = z.enum(['sharp', 'balanced', 'soft'])
export const siteDensitySchema = z.enum(['compact', 'cinematic'])
export const siteMotionSchema = z.enum(['off', 'subtle'])

export const siteThemeSchema = z.strictObject({
  colors: siteThemeColorsSchema.default(DEFAULT_THEME_COLORS),
  typography: siteTypographySchema.default('modern'),
  shape: siteShapeSchema.default('balanced'),
  density: siteDensitySchema.default('cinematic'),
  motion: siteMotionSchema.default('subtle'),
})
export type SiteThemeV1 = z.infer<typeof siteThemeSchema>
