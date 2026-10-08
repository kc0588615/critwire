/**
 * The site's design language, cc (Critter Connect's theme), as data:
 * transcribed from `gui/themes/cc.md`, both modes, with the dark neutrals
 * taken from the game, phaser-june `75799a8` `globals.css` (GUI.md, Local
 * decisions, A12). This is the only file holding the theme's literal values.
 *
 * - `pnpm generate:theme` writes them to `src/styles/tokens.css`, which
 *   both style entry points load; `src/styles/roles.css` builds the roles
 *   on it.
 * - Server-rendered output (share images, emails, the portal's default
 *   palette) imports them from here.
 * - Critwire's departures from the snapshot (GUI.md, Local decisions) are
 *   roles in `roles.css`, except the two that are values: the dark
 *   neutrals (A12, with the snapshot's kept beside them) and the accent
 *   text (A1). So the int test `theme-tokens` can compare this file with
 *   the snapshot exactly.
 */

export const TEXT_STEPS = ['xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl'] as const
export const SPACE_STEPS = ['zero', 'xxs', 'xs', 's', 'm', 'l', 'xl', 'xxl'] as const
export const RADIUS_STEPS = ['zero', 'xs', 's', 'm', 'l', 'xl', 'full'] as const
export const BORDER_STEPS = ['none', 's', 'm', 'l'] as const
export const SHADOW_STEPS = ['s', 'm', 'l'] as const
export const FONT_ROLES = ['ui', 'brand', 'editorial', 'data'] as const
export const WEIGHTS = ['regular', 'medium', 'heavy'] as const
export const NEUTRAL_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const
export const COLOR_STEPS = [1, 2, 3, 4] as const
export const STATUSES = ['success', 'warning', 'error'] as const

export type Mode = 'light' | 'dark'
export type Hex = `#${string}`
export type NeutralStep = (typeof NEUTRAL_STEPS)[number]
export type RadiusStep = (typeof RADIUS_STEPS)[number]
type CubicBezier = readonly [number, number, number, number]

export type ThemeTokens = {
  /** Size, line height (px) and letter spacing (em) per text step. */
  text: Record<(typeof TEXT_STEPS)[number], { size: number; lineHeight: number; letterSpacing: number }>
  /** px */
  space: Record<(typeof SPACE_STEPS)[number], number>
  /** px */
  radius: Record<RadiusStep, number>
  /** px: the theme's own border steps. Critwire draws its edges with `STROKE`. */
  border: Record<(typeof BORDER_STEPS)[number], number>
  /** The fallbacks after each role's face (the face itself is `src/styles/fonts.css`), and its weights. */
  fonts: Record<
    (typeof FONT_ROLES)[number],
    { fallback: readonly string[]; weights: Record<(typeof WEIGHTS)[number], number> }
  >
  /** CSS box-shadows as the snapshot resolves them, the same in both modes. */
  shadow: Record<(typeof SHADOW_STEPS)[number], string>
  /** Durations in ms, the press distance in px. */
  motion: {
    small: { duration: number; easing: CubicBezier }
    large: { duration: number; easing: CubicBezier }
    pressDistance: number
    popupScale: number
  }
  iconStrokeWidth: number
  color: Record<(typeof COLOR_STEPS)[number], Hex>
  status: Record<(typeof STATUSES)[number], Hex>
} & Record<Mode, { neutral: Record<NeutralStep, Hex>; accentText: Hex }>

const SANS_FALLBACK = ['sans-serif'] as const
const WEIGHT = { regular: 400, medium: 700, heavy: 800 } as const
const EASING = [0.16, 1, 0.3, 1] as const

export const TOKENS = {
  text: {
    xxs: { size: 10, lineHeight: 14, letterSpacing: -0.04 },
    xs: { size: 12, lineHeight: 16, letterSpacing: -0.04 },
    s: { size: 14, lineHeight: 20, letterSpacing: -0.04 },
    m: { size: 16, lineHeight: 24, letterSpacing: -0.04 },
    l: { size: 24, lineHeight: 32, letterSpacing: -0.04 },
    xl: { size: 36, lineHeight: 40, letterSpacing: -0.04 },
    xxl: { size: 48, lineHeight: 52, letterSpacing: -0.04 },
  },
  space: { zero: 0, xxs: 4, xs: 8, s: 12, m: 16, l: 24, xl: 32, xxl: 48 },
  radius: { zero: 0, xs: 8, s: 16, m: 22, l: 28, xl: 40, full: 9999 },
  border: { none: 0, s: 0, m: 0, l: 0 },
  fonts: {
    ui: { fallback: SANS_FALLBACK, weights: WEIGHT },
    brand: { fallback: SANS_FALLBACK, weights: WEIGHT },
    editorial: { fallback: SANS_FALLBACK, weights: WEIGHT },
    data: { fallback: ['-apple-system', 'BlinkMacSystemFont', 'sans-serif'], weights: WEIGHT },
  },
  // cc is flat by design: s and l are fully transparent, and only m casts (two layers).
  shadow: {
    s: '0px 2px 4px 0px #00000000',
    m: '0px 2px 6px 0px #0000000d, 0px 8px 24px 0px #00000013',
    l: '0px 16px 48px 0px #00000000',
  },
  motion: {
    small: { duration: 160, easing: EASING },
    large: { duration: 280, easing: EASING },
    pressDistance: 1,
    popupScale: 0.96,
  },
  iconStrokeWidth: 2,
  color: { 1: '#00906c', 2: '#abff5a', 3: '#ffd56a', 4: '#123d5c' },
  status: { success: '#00c853', warning: '#ffea00', error: '#fc032d' },
  light: {
    neutral: {
      1: '#ffffff',
      2: '#fcfbfa',
      3: '#f5f4f1',
      4: '#e9e5df',
      5: '#d2ccbf',
      6: '#a5a094',
      7: '#837e72',
      8: '#595449',
      9: '#383329',
      10: '#000000',
    },
    // A1: n10 on color-1 is 5.21:1, where the snapshot's n2 is 3.90.
    accentText: '#000000',
  },
  dark: {
    // A12: the game's ramp, at cc's lightness with a teal hue (the snapshot's is SNAPSHOT_DARK_NEUTRALS).
    neutral: {
      1: '#051411',
      2: '#142320',
      3: '#1f2e2b',
      4: '#30413d',
      5: '#4a5b57',
      6: '#768884',
      7: '#9dafab',
      8: '#c7d1cf',
      9: '#ecf7f4',
      10: '#ffffff',
    },
    // A1: n1, the game's own dark label, is 4.67:1 on color-1, where the snapshot's n2 is 4.06.
    accentText: '#051411',
  },
} as const satisfies ThemeTokens

/**
 * cc's own dark neutrals, which `TOKENS.dark.neutral` departs from (A12):
 * kept so the code records exactly what it departs from. Nothing renders
 * them; the int test checks them against `gui/themes/cc.md`.
 */
export const SNAPSHOT_DARK_NEUTRALS = {
  1: '#000000',
  2: '#241f16',
  3: '#2f2a21',
  4: '#413c32',
  5: '#5b564b',
  6: '#888377',
  7: '#b0aa9e',
  8: '#d4cec2',
  9: '#f5f4f1',
  10: '#ffffff',
} as const satisfies Record<NeutralStep, Hex>

/**
 * Critwire's own floor, not a theme value (D10): every control is at least
 * this tall and wide. cc's controls are 44 px too (padding s, line s, padding
 * s). `--tap-min` is generated from it.
 */
export const TAP_MIN = 44

/**
 * Critwire's stroke widths, not theme steps (D7): edges, rings, bars and
 * underlines. The theme's `--border-*` steps describe its own borders, and
 * cc's are 0 px, which would erase every field boundary. `--stroke-s` and
 * `--stroke-l` are generated from it.
 */
export const STROKE = { s: 1, l: 2 } as const

/**
 * The focus ring's geometry (A5): the game's 2 px ring, offset 2 px, where
 * the snapshot has none. `--focus-ring-width` and `--focus-ring-offset` are
 * generated from it; the colour is a role in `roles.css`.
 */
export const FOCUS = { width: 2, offset: 2 } as const

/** A motion curve as CSS and the Web Animations API write it. */
export const cubicBezier = (easing: readonly number[]): string => `cubic-bezier(${easing.join(', ')})`
