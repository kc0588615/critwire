import { headers } from 'next/headers'

export const getClientIP = async (): Promise<string> => {
  const headerStore = await headers()
  return (
    headerStore.get('x-real-ip') ??
    headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown'
  )
}

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
