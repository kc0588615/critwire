import { z } from 'zod'

import { CW, type RadiusStep } from '@/lib/theme/cw'

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

const { neutral, accentText } = CW.dark

/**
 * cw dark: the portal's default palette, and the one any unset slot
 * falls back to. Passes every contrast refinement (`DEFAULT_THEME` below
 * parses it when the module loads). The border is n4, the dark edge that
 * stays visible (D4).
 */
export const DEFAULT_THEME_COLORS: SiteThemeColors = {
  background: neutral[1],
  foreground: neutral[10],
  mutedForeground: neutral[7],
  surface: neutral[2],
  accent: CW.color[1],
  accentForeground: accentText,
  border: neutral[4],
  ...CW.status,
}

export const siteTypographySchema = z.enum(['standard', 'modern', 'editorial', 'technical'])
export const siteShapeSchema = z.enum(['sharp', 'balanced', 'soft'])
export const siteDensitySchema = z.enum(['compact', 'cinematic'])
export const siteMotionSchema = z.enum(['off', 'subtle'])

/**
 * `shape` on cw's radius scale: the step for surfaces (cards, forms,
 * dialogs) and the one for controls (buttons, fields, the badge). The
 * portal, the embeds and the badge all read this one table.
 */
export const SHAPE_RADIUS: Record<z.infer<typeof siteShapeSchema>, { surface: RadiusStep; control: RadiusStep }> = {
  sharp: { surface: 'zero', control: 'zero' },
  balanced: { surface: 'm', control: 's' },
  soft: { surface: 'l', control: 'm' },
}

export const siteThemeSchema = z.strictObject({
  colors: siteThemeColorsSchema.default(DEFAULT_THEME_COLORS),
  typography: siteTypographySchema.default('standard'),
  shape: siteShapeSchema.default('balanced'),
  density: siteDensitySchema.default('cinematic'),
  motion: siteMotionSchema.default('subtle'),
})
export type SiteThemeV1 = z.infer<typeof siteThemeSchema>

/** Parsed when the module loads, so a default that fails the schema throws at once. */
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
