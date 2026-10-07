import type { CSSProperties } from 'react'

import { CW } from '@/lib/theme/cw'

/**
 * The emails' styles: cw light, email-safe (D19). Inline styles only, a
 * border rather than a box shadow, and cw's fallback font stack, so no
 * client has to load a web font.
 */

const { neutral, accentText } = CW.light
const { radius, space, text } = CW
const { weights } = CW.fonts.ui

const px = (value: number): string => `${value}px`

const textStep = (step: keyof typeof text): CSSProperties => ({
  fontSize: px(text[step].size),
  lineHeight: px(text[step].lineHeight),
})

export const page: CSSProperties = {
  backgroundColor: neutral[2],
  color: neutral[10],
  fontFamily: CW.fonts.ui.fallback.join(','),
  margin: 0,
  padding: `0 ${px(space.m)}`,
}

export const card: CSSProperties = {
  backgroundColor: neutral[1],
  border: `${px(CW.border.s)} solid ${neutral[4]}`,
  borderRadius: px(radius.m),
  margin: `${px(space.xxl)} auto`,
  maxWidth: '560px',
  padding: px(space.xl),
}

export const heading: CSSProperties = {
  ...textStep('l'),
  color: neutral[10],
  fontWeight: weights.heavy,
  margin: `0 0 ${px(space.m)}`,
}

export const body: CSSProperties = {
  ...textStep('m'),
  color: neutral[10],
  margin: `0 0 ${px(space.l)}`,
}

/** cw's primary Button: color-1 with its accent text (A1). */
export const button: CSSProperties = {
  ...textStep('m'),
  backgroundColor: CW.color[1],
  borderRadius: px(radius.s),
  color: accentText,
  fontWeight: weights.medium,
  padding: `${px(space.xs)} ${px(space.m)}`,
  textDecoration: 'none',
}

export const small: CSSProperties = {
  ...textStep('s'),
  color: neutral[7],
  margin: `${px(space.l)} 0 0`,
}

export const link: CSSProperties = {
  color: neutral[10],
  textDecoration: 'underline',
  wordBreak: 'break-all',
}

/** `borderTop`, not `borderColor`: react-email's `Hr` sets its own grey `borderTop`. */
export const divider: CSSProperties = {
  borderTop: `${px(CW.border.s)} solid ${neutral[4]}`,
  margin: `${px(space.l)} 0`,
}

/** A field's name over its value; sentence case, as cw sets no all-caps. */
export const label: CSSProperties = {
  ...textStep('s'),
  color: neutral[7],
  fontWeight: weights.medium,
  margin: `0 0 ${px(space.xxs)}`,
}

export const value: CSSProperties = {
  ...textStep('m'),
  color: neutral[10],
  margin: `0 0 ${px(space.m)}`,
}
