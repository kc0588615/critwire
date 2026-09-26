import type { z } from 'zod'

import { verifyTurnstile } from '@/lib/turnstile/verifyTurnstile'
import { checkRateLimit } from '@/lib/upstash/rate-limit'

import { getClientIP, normalizeTurnstileToken, readRequestBody } from './request'

type GuardResult<T> = { data: T; ok: true } | { error: string; ok: false; status: number }

type GuardArgs<S extends z.ZodType> = {
  rateLimit: {
    key: string
    limit: number
    /** Added to the client IP, so each game has its own budget. */
    scope: string
    windowSeconds: number
  }
  req: Request
  schema: S
}

/**
 * The public-form pipeline, in patterns.md order: validate the body,
 * verify Turnstile, then rate-limit by IP. Missing production
 * credentials throw (F15) to the route's catch.
 */
export const guardPublicForm = async <S extends z.ZodType>({
  rateLimit,
  req,
  schema,
}: GuardArgs<S>): Promise<GuardResult<z.output<S>>> => {
  const body = await readRequestBody(req)
  const parsed = schema.safeParse(body)
  if (!parsed.success) return { error: 'Invalid request body.', ok: false, status: 400 }

  const ip = await getClientIP()
  const turnstile = await verifyTurnstile({ ip, token: normalizeTurnstileToken(body) })
  if (!turnstile.success) {
    return { error: 'Could not verify the form challenge.', ok: false, status: 400 }
  }

  const { success } = await checkRateLimit({
    identifier: `${ip}:${rateLimit.scope}`,
    key: rateLimit.key,
    limit: rateLimit.limit,
    windowSeconds: rateLimit.windowSeconds,
  })
  if (!success) return { error: 'Too many requests.', ok: false, status: 429 }

  return { data: parsed.data, ok: true }
}

const wantsJSON = (req: Request): boolean =>
  (req.headers.get('content-type') ?? '').includes('application/json') ||
  (req.headers.get('accept') ?? '').includes('application/json')

/**
 * JSON for API clients; for a plain HTML form post, a 303 back to the
 * form's page with `?submitted=1` or `?error=1`.
 */
export const formResponse = ({
  json,
  path,
  req,
  status,
}: {
  json: Record<string, unknown>
  path: string
  req: Request
  status: number
}): Response => {
  if (wantsJSON(req)) return Response.json(json, { status })

  const url = new URL(path, req.url)
  url.searchParams.set(status >= 400 ? 'error' : 'submitted', '1')
  return Response.redirect(url, 303)
}
