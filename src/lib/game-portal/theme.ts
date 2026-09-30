import { z } from 'zod'

import { HEX_COLOR_RE, contrastRatio } from './contrast'

const hexColor = z.string().regex(HEX_COLOR_RE, 'Must be a 6-digit hex color like #22d3ee')

/**
 * Semantic color tokens. WCAG contrast is enforced at the schema level
 * so no studio's theme can ship unreadable text.
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
  background: '#1f2030',
  foreground: '#f1f1f5',
  mutedForeground: '#a9acc2',
  surface: '#282a3d',
  accent: '#aeb8ff',
  accentForeground: '#1f2030',
  border: '#3b3e56',
  success: '#6fd39b',
  warning: '#f2a05c',
  error: '#ff7b86',
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

export const DEFAULT_THEME: SiteThemeV1 = siteThemeSchema.parse({})

type ColorKey = keyof SiteThemeColors
const COLOR_KEYS = Object.keys(DEFAULT_THEME_COLORS) as ColorKey[]
const TOKEN_KEYS = ['typography', 'shape', 'density', 'motion'] as const
type TokenKey = (typeof TOKEN_KEYS)[number]

/** A stored or submitted theme: any level or value may be missing. */
export type ThemeLayer =
  | null
  | undefined
  | ({ colors?: null | Partial<Record<ColorKey, unknown>> } & Partial<Record<TokenKey, unknown>>)

/** Every key present, but not validated yet. */
export type MergedTheme = { colors: Record<ColorKey, unknown> } & Record<TokenKey, unknown>

const isSet = (value: unknown): boolean => value != null && value !== ''

/**
 * Lays each theme over the one before it, starting from the default
 * theme. The merge is per level (`theme`, then `theme.colors`) and per
 * known key, so a PATCH of one colour keeps the other nine, and an unset
 * value (`null`, `undefined` or `''`) never overrides. Parse the result
 * with `siteThemeSchema`.
 */
export const mergeTheme = (...layers: ThemeLayer[]): MergedTheme => {
  const merged: MergedTheme = { ...DEFAULT_THEME, colors: { ...DEFAULT_THEME.colors } }
  for (const layer of layers) {
    if (!layer) continue
    for (const key of COLOR_KEYS) {
      const value = layer.colors?.[key]
      if (isSet(value)) merged.colors[key] = value
    }
    for (const key of TOKEN_KEYS) {
      if (isSet(layer[key])) merged[key] = layer[key]
    }
  }
  return merged
}
