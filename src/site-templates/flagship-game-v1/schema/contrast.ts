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

/**
 * Expands #abc to #aabbcc; returns null for anything that is not a
 * 3- or 6-digit hex color.
 */
export const normalizeHexColor = (value: null | string | undefined): null | string => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim().toLowerCase()
  if (HEX_COLOR_RE.test(trimmed)) return trimmed
  if (/^#[0-9a-f]{3}$/.test(trimmed)) {
    const [r, g, b] = trimmed.slice(1)
    return `#${r}${r}${g}${g}${b}${b}`
  }
  return null
}
