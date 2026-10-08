import type { CSSProperties } from 'react'

import { STROKE, TAP_MIN, TOKENS } from '@/lib/theme/tokens'

/**
 * The emails' styles: cc light, email-safe (D22). Inline styles only, a
 * border rather than a box shadow, and the ui role's fallback stack, so no
 * client has to load a web font. cc's tracking and its 700 medium belong to
 * its faces (GUI.md D17), so the fallback face keeps its own spacing and
 * medium text stays regular; only the heading is heavy.
 */

const { neutral, accentText } = TOKENS.light
/** A2: the snapshot's muted n7 is 3.91:1 on the n2 body, so muted text is n8 (7.28). */
const muted = neutral[8]
const { radius, space, text } = TOKENS
const { weights } = TOKENS.fonts.ui

const px = (value: number): string => `${value}px`

const textStep = (step: keyof typeof text): CSSProperties => ({
  fontSize: px(text[step].size),
  lineHeight: px(text[step].lineHeight),
})

export const page: CSSProperties = {
  backgroundColor: neutral[2],
  color: neutral[10],
  fontFamily: TOKENS.fonts.ui.fallback.join(','),
  margin: 0,
  padding: `0 ${px(space.m)}`,
}

export const card: CSSProperties = {
  backgroundColor: neutral[1],
  border: `${px(STROKE.s)} solid ${neutral[4]}`,
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

/**
 * cc's primary Button: a color-1 pill with its accent text (A1: black,
 * 5.21:1), label s regular, padded l at the sides. react-email's `Button`
 * sets its label's line height to 120 %, so the block padding that makes the
 * button critwire's tap floor (D10) is half of what the label leaves of it.
 */
const BUTTON_LABEL_LINE = text.s.size * 1.2

export const button: CSSProperties = {
  ...textStep('s'),
  backgroundColor: TOKENS.color[1],
  borderRadius: px(radius.full),
  color: accentText,
  fontWeight: weights.regular,
  padding: `${px((TAP_MIN - BUTTON_LABEL_LINE) / 2)} ${px(space.l)}`,
  textDecoration: 'none',
}

export const small: CSSProperties = {
  ...textStep('s'),
  color: muted,
  margin: `${px(space.l)} 0 0`,
}

export const link: CSSProperties = {
  color: neutral[10],
  textDecoration: 'underline',
  wordBreak: 'break-all',
}

/** `borderTop`, not `borderColor`: react-email's `Hr` sets its own grey `borderTop`. */
export const divider: CSSProperties = {
  borderTop: `${px(STROKE.s)} solid ${neutral[4]}`,
  margin: `${px(space.l)} 0`,
}

/** A field's name over its value; sentence case, as the theme sets no all-caps. */
export const label: CSSProperties = {
  ...textStep('s'),
  color: muted,
  fontWeight: weights.regular,
  margin: `0 0 ${px(space.xxs)}`,
}

export const value: CSSProperties = {
  ...textStep('m'),
  color: neutral[10],
  margin: `0 0 ${px(space.m)}`,
}
