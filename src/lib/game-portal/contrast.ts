/**
 * WCAG 2.x relative luminance / contrast math for theme validation.
 * Colors are restricted to 6-digit hex so the math stays exact.
 */

export const HEX_COLOR_RE = /^#[0-9a-f]{6}$/i

export const hexToRgb = (hex: string): [number, number, number] => {
  const value = hex.slice(1)
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ]
}

const linearChannel = (channel: number): number => {
  const c = channel / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

export const relativeLuminance = (hex: string): number => {
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * linearChannel(r) + 0.7152 * linearChannel(g) + 0.0722 * linearChannel(b)
}

export const contrastRatio = (a: string, b: string): number => {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [lighter, darker] = la >= lb ? [la, lb] : [lb, la]
  return (lighter + 0.05) / (darker + 0.05)
}


/** Below this background luminance, a palette counts as a dark one. */
const DARK_LUMINANCE = 0.18

/**
 * The colour scheme a palette's background belongs to: the portal's
 * `color-scheme` (native controls, scrollbars, Turnstile) and the
 * embed's own-mode choice both read it.
 */
export const backgroundScheme = (background: string): 'dark' | 'light' =>
  relativeLuminance(background) < DARK_LUMINANCE ? 'dark' : 'light'
