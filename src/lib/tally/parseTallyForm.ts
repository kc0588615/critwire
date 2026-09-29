/**
 * Parse a Tally share or embed URL into a form ID + embed URL.
 *
 * Accepted shapes:
 *   https://tally.so/r/wMzXab
 *   https://tally.so/embed/wMzXab
 *   https://tally.so/r/wMzXab?transparentBackground=1  (query ignored)
 *   wMzXab  (raw form id)
 */

export type ParsedTallyForm = {
  formId: string
  /** URL suitable for data-tally-src / iframe src */
  embedUrl: string
  /** Share URL for "open in new tab" buttons */
  shareUrl: string
}

/** Form IDs are short base62-ish tokens from Tally. */
const FORM_ID_RE = /^[A-Za-z0-9]{4,32}$/

/**
 * No `transparentBackground`: the form keeps the background of its own
 * Tally theme, so its text stays readable on any portal theme (Tally's
 * default dark text on a dark portal panel would not be).
 */
const embedUrl = (formId: string) =>
  `https://tally.so/embed/${formId}?alignLeft=1&hideTitle=1&dynamicHeight=1`

export function parseTallyForm(
  value: null | string | undefined,
): null | ParsedTallyForm {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null

  // Bare form id
  if (FORM_ID_RE.test(trimmed) && !trimmed.includes('/') && !trimmed.includes('.')) {
    return {
      embedUrl: embedUrl(trimmed),
      formId: trimmed,
      shareUrl: `https://tally.so/r/${trimmed}`,
    }
  }

  try {
    const url = new URL(trimmed)
    const host = url.hostname.replace(/^www\./, '')
    if (host !== 'tally.so') return null

    const parts = url.pathname.split('/').filter(Boolean)
    // /r/{id} or /embed/{id}
    const idIndex = parts[0] === 'r' || parts[0] === 'embed' ? 1 : -1
    const formId = idIndex >= 0 ? parts[idIndex] : null
    if (!formId || !FORM_ID_RE.test(formId)) return null

    return {
      embedUrl: embedUrl(formId),
      formId,
      shareUrl: `https://tally.so/r/${formId}`,
    }
  } catch {
    return null
  }
}

export const validateOptionalTallyUrl = (
  value: null | string | string[] | undefined,
): string | true => {
  if (value == null || value === '') return true
  if (typeof value !== 'string') return 'Must be a single Tally URL or form ID.'
  if (!parseTallyForm(value)) {
    return 'Must be a Tally form URL (https://tally.so/r/…) or form ID.'
  }
  return true
}
