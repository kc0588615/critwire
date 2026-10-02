import { headers } from 'next/headers'

export const getClientIP = async (): Promise<string> => {
  const headerStore = await headers()
  return (
    headerStore.get('x-real-ip') ??
    headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

/**
 * Whether the request's media type is exactly `application/json`
 * (parameters such as `charset` allowed). JSON-only endpoints check this
 * before reading the body: cross-site forms and `no-cors` fetches can
 * only send CORS-safelisted types, so they're refused, and a cross-site
 * JSON fetch needs a preflight that these routes never answer. Not
 * `includes()`, as `readRequestBody` uses: `text/plain;
 * x=application/json` is still a safelisted type.
 */
export const isJSONRequest = (req: Request): boolean =>
  (req.headers.get('content-type') ?? '').split(';')[0]?.trim().toLowerCase() === 'application/json'

export const readRequestBody = async (req: Request): Promise<Record<string, unknown>> => {
  const contentType = req.headers.get('content-type') ?? ''

  if (contentType.includes('application/json')) {
    const json = await req.json().catch(() => null)
    return json && typeof json === 'object' && !Array.isArray(json)
      ? (json as Record<string, unknown>)
      : {}
  }

  const formData = await req.formData().catch(() => null)
  if (!formData) return {}

  return Object.fromEntries(
    Array.from(formData.entries()).map(([key, value]) => [
      key,
      typeof value === 'string' ? value : value.name,
    ]),
  )
}

export const normalizeTurnstileToken = (body: Record<string, unknown>): null | string => {
  const token = body.turnstileToken ?? body['cf-turnstile-response']
  return typeof token === 'string' && token.trim() ? token.trim() : null
}
