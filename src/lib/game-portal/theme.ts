import { z } from 'zod'

import { type Mode, type NeutralStep, type RadiusStep, TOKENS } from '@/lib/theme/tokens'

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

/** cc in one mode, from the theme's tokens: muted text is n8 in light (A2) and n7 in dark. */
const ccPalette = (mode: Mode, muted: NeutralStep): SiteThemeColors => {
  const { neutral, accentText } = TOKENS[mode]
  return siteThemeColorsSchema.parse({
    background: neutral[1],
    foreground: neutral[10],
    mutedForeground: neutral[muted],
    surface: neutral[2],
    accent: TOKENS.color[1],
    accentForeground: accentText,
    border: neutral[4],
    ...TOKENS.status,
  })
}

/**
 * cc light and dark, as the game has them. The label on the accent is
 * each mode's accent text (A1); the border is n4, the edge that stays
 * visible (A4). Parsed when the module loads, so a palette that fails a
 * contrast refinement throws at once.
 */
export const CC_PALETTES: Record<Mode, SiteThemeColors> = {
  light: ccPalette('light', 8),
  dark: ccPalette('dark', 7),
}

/**
 * cc dark: the portal's default palette, and the one any unset slot
 * falls back to. A game whose palette equals it gets both of
 * `CC_PALETTES`, by the visitor's system (`portalPalettes`).
 *
 * A compatibility contract (D48): the database's column defaults hold
 * these values (migration `cc_portal_defaults`), and a palette equal to
 * them is what the default means, both modes included. Changing them
 * ships a migration that decides explicitly whether rows equal to the old
 * default move to the new one (keeping both modes) or keep their look in
 * one mode, and what unset slots get; it must never happen silently.
 */
export const DEFAULT_THEME_COLORS: SiteThemeColors = CC_PALETTES.dark

export const siteTypographySchema = z.enum(['standard', 'modern', 'editorial', 'technical'])
export const siteShapeSchema = z.enum(['sharp', 'balanced', 'soft'])
export const siteDensitySchema = z.enum(['compact', 'cinematic'])
export const siteMotionSchema = z.enum(['off', 'subtle'])

/**
 * `shape` on the theme's radius scale: the step for surfaces (cards, forms,
 * dialogs), the one for controls (fields, chips, the badge), and the one
 * for buttons, which are cc's pills unless the shape is sharp (D11). The
 * portal, the embeds and the badge all read this one table.
 */
export const SHAPE_RADIUS: Record<
  z.infer<typeof siteShapeSchema>,
  { surface: RadiusStep; control: RadiusStep; button: RadiusStep }
> = {
  sharp: { surface: 'zero', control: 'zero', button: 'zero' },
  balanced: { surface: 'm', control: 's', button: 'full' },
  soft: { surface: 'l', control: 'm', button: 'full' },
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

/** Whether a palette is the default one, slot for slot (hex compared lower-case). */
export const isDefaultPalette = (colors: SiteThemeColors): boolean =>
  COLOR_KEYS.every((key) => colors[key].toLowerCase() === DEFAULT_THEME_COLORS[key].toLowerCase())

/**
 * The palette a portal shows in each mode: cc light and dark for the
 * default palette, otherwise the game's own palette in both, so a saved
 * palette looks the same whatever the visitor's system.
 */
export const portalPalettes = (colors: SiteThemeColors): Record<Mode, SiteThemeColors> =>
  isDefaultPalette(colors) ? CC_PALETTES : { light: colors, dark: colors }
