import { z } from 'zod'

/**
 * Plain-text policy for every string the template accepts: no HTML/JSX
 * tags, no CSS blocks or class/style attributes, no protocol tricks,
 * no control characters. Rendering goes through React text nodes, so
 * this is a policy boundary (AI and authors may not smuggle markup),
 * not an XSS sanitizer.
 */
const MARKUP_RE = /<\s*[a-z!/]|\{|\}|\bjavascript:|\bstyle\s*=|\bclass(?:name)?\s*=/i
const CONTROL_RE = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/

export const isSafeText = (value: string): boolean =>
  !MARKUP_RE.test(value) && !CONTROL_RE.test(value)

const SAFE_TEXT_MESSAGE = 'Plain text only — HTML, CSS, and class names are not allowed.'

export const safeText = (max: number, min = 1) =>
  z.string().trim().min(min).max(max).refine(isSafeText, SAFE_TEXT_MESSAGE)

/**
 * Optional text normalized to `null`: Payload stores empty text fields
 * as '' or null, and missing keys arrive as undefined — all three mean
 * "not set".
 */
export const optionalText = (max: number) =>
  z
    .preprocess((value) => (value === '' ? null : value), safeText(max).nullable())
    .optional()
    .transform((value) => value ?? null)

/**
 * Coerces arbitrary source text (e.g. a project description) into a
 * value that always satisfies `safeText`: strips rejected characters
 * and clamps length. Used when deriving default configurations from
 * project facts, which must never fail validation.
 */
export const toSafeText = (value: null | string | undefined, max: number): null | string => {
  if (typeof value !== 'string') return null
  const cleaned = value
    .replace(/[<>{}\u0000-\u001f\u007f]/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
    .slice(0, max)
    .trim()
  return cleaned.length > 0 ? cleaned : null
}
