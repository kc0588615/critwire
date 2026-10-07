/**
 * cw, critwire's design language (Graphical theme revision `bittw6orbj7l`),
 * as data: transcribed from `gui/themes/cw.md`, both modes. This is the only
 * file holding cw's literal values.
 *
 * - `pnpm generate:theme` writes them to `src/styles/cw-tokens.css`, which
 *   both style entry points load; `src/styles/cw.css` builds the roles on it.
 * - Server-rendered output (share images, emails, the portal's default
 *   palette) imports them from here.
 * - Critwire's departures from the snapshot (GUI.md, Local decisions) are
 *   roles in `cw.css`, never edits here, so the int test `cw-tokens` can
 *   compare this file with the snapshot exactly.
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

export type CwTheme = {
  /** Size, line height (px) and letter spacing (em) per text step. */
  text: Record<(typeof TEXT_STEPS)[number], { size: number; lineHeight: number; letterSpacing: number }>
  /** px */
  space: Record<(typeof SPACE_STEPS)[number], number>
  /** px */
  radius: Record<RadiusStep, number>
  /** px */
  border: Record<(typeof BORDER_STEPS)[number], number>
  /** The fallbacks after each role's face (the face itself is `src/fonts.ts`), and its weights. */
  fonts: Record<
    (typeof FONT_ROLES)[number],
    { fallback: readonly string[]; weights: Record<(typeof WEIGHTS)[number], number> }
  >
  /** px geometry; the colour is a neutral step per mode. */
  shadow: Record<
    (typeof SHADOW_STEPS)[number],
    { x: number; y: number; blur: number; spread: number; opacity: number; color: Record<Mode, NeutralStep> }
  >
  /** Durations in ms, the press distance in px. */
  motion: {
    small: { duration: number; easing: CubicBezier }
    large: { duration: number; easing: CubicBezier }
    pressDistance: number
    popupScale: number
  }
  /** The ring: width and offset in px, and how much of neutral-10 it mixes, in %. */
  focus: { width: number; offset: number; mix: number }
  iconStrokeWidth: number
  color: Record<(typeof COLOR_STEPS)[number], Hex>
  status: Record<(typeof STATUSES)[number], Hex>
} & Record<Mode, { neutral: Record<NeutralStep, Hex>; accentText: Hex }>

const SANS_FALLBACK = ['-apple-system', 'BlinkMacSystemFont', 'sans-serif'] as const
const WEIGHT = { regular: 400, medium: 500, heavy: 700 } as const
const SHADOW_COLOR = { light: 10, dark: 1 } as const

export const CW = {
  text: {
    xxs: { size: 9, lineHeight: 13, letterSpacing: 0 },
    xs: { size: 11, lineHeight: 15, letterSpacing: 0 },
    s: { size: 13, lineHeight: 18, letterSpacing: 0 },
    m: { size: 15, lineHeight: 22, letterSpacing: 0 },
    l: { size: 22, lineHeight: 29, letterSpacing: 0 },
    xl: { size: 33, lineHeight: 36, letterSpacing: 0 },
    xxl: { size: 44, lineHeight: 47, letterSpacing: 0 },
  },
  space: { zero: 0, xxs: 3, xs: 6, s: 9, m: 12, l: 19, xl: 25, xxl: 37 },
  radius: { zero: 0, xs: 2, s: 5, m: 7, l: 14, xl: 22, full: 9999 },
  border: { none: 0, s: 1, m: 1, l: 2 },
  fonts: {
    ui: { fallback: SANS_FALLBACK, weights: WEIGHT },
    brand: { fallback: SANS_FALLBACK, weights: WEIGHT },
    editorial: { fallback: SANS_FALLBACK, weights: WEIGHT },
    data: { fallback: ['monospace'], weights: WEIGHT },
  },
  shadow: {
    s: { x: 0, y: 1, blur: 2, spread: 0, opacity: 0, color: SHADOW_COLOR },
    m: { x: 0, y: 8, blur: 24, spread: 0, opacity: 0, color: SHADOW_COLOR },
    l: { x: 0, y: 12, blur: 30, spread: 0, opacity: 0, color: SHADOW_COLOR },
  },
  motion: {
    small: { duration: 150, easing: [0.2, 0.8, 0.2, 1] },
    large: { duration: 300, easing: [0.16, 1, 0.3, 1] },
    pressDistance: 1,
    popupScale: 0.96,
  },
  focus: { width: 2, offset: 2, mix: 50 },
  iconStrokeWidth: 2,
  color: { 1: '#31c3e8', 2: '#76ef6b', 3: '#009ff0', 4: '#e864ff' },
  status: { success: '#76ef6b', warning: '#ffa344', error: '#ff5263' },
  light: {
    neutral: {
      1: '#ffffff',
      2: '#f9fafb',
      3: '#eef0f3',
      4: '#dadee3',
      5: '#c0c6cd',
      6: '#91979e',
      7: '#686d73',
      8: '#41464c',
      9: '#21252b',
      10: '#000000',
    },
    accentText: '#000000',
  },
  dark: {
    neutral: {
      1: '#000000',
      2: '#1f2022',
      3: '#2a2b2d',
      4: '#37383a',
      5: '#4f5052',
      6: '#767779',
      7: '#a1a3a6',
      8: '#c4c6c9',
      9: '#e4e5e6',
      10: '#ffffff',
    },
    accentText: '#000000',
  },
} as const satisfies CwTheme

/**
 * Critwire's own floor, not a cw value (D10): every control is at least this
 * tall and wide, over cw's 34 px controls. `--tap-min` is generated from it.
 */
export const TAP_MIN = 44

/** A motion curve as CSS and the Web Animations API write it. */
export const cubicBezier = (easing: readonly number[]): string => `cubic-bezier(${easing.join(', ')})`
