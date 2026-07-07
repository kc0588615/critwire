/**
 * Payload text-field validator for optional http(s) URLs.
 */
export const validateOptionalHttpUrl = (
  value: null | string | string[] | undefined,
): string | true => {
  if (value == null || value === '') return true
  if (typeof value !== 'string') return 'Must be a single URL.'

  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return 'Must be an http(s) URL.'
    }
    return true
  } catch {
    return 'Must be a valid URL, e.g. https://example.com'
  }
}
