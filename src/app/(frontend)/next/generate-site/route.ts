import configPromise from '@payload-config'
import { NextRequest } from 'next/server'
import { getPayload } from 'payload'

import { SiteGeneratorError } from '@/site-generator/errors'
import {
  generateAndSaveSiteDraft,
  SiteGenerationServiceError,
} from '@/site-generator/service'
import { generateSiteRequestSchema } from '@/site-generator/types'

const generatorStatus = (error: SiteGeneratorError): number => {
  if (error.code === 'not-configured') return 503
  if (error.code === 'timeout') return 504
  if (error.code === 'refusal') return 422
  return 502
}

export async function POST(req: NextRequest): Promise<Response> {
  const origin = req.headers.get('origin')
  if (origin && origin !== new URL(req.url).origin) {
    return Response.json({ error: 'Cross-origin generation requests are not allowed.' }, { status: 403 })
  }

  const payload = await getPayload({ config: configPromise })
  let user
  try {
    ;({ user } = await payload.auth({ headers: req.headers }))
  } catch (error) {
    payload.logger.warn({ err: error }, 'Site generation authentication failed')
    return Response.json({ error: 'Authentication required.' }, { status: 401 })
  }
  if (!user) return Response.json({ error: 'Authentication required.' }, { status: 401 })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return Response.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  const parsed = generateSiteRequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid generation request.' },
      { status: 400 },
    )
  }

  try {
    const result = await generateAndSaveSiteDraft({ payload, request: parsed.data, user })
    return Response.json({
      changeSummary: result.changeSummary,
      doc: result.doc,
      model: result.model,
    })
  } catch (error) {
    if (error instanceof SiteGenerationServiceError) {
      return Response.json({ error: error.message }, { status: error.status })
    }
    if (error instanceof SiteGeneratorError) {
      return Response.json({ error: error.message }, { status: generatorStatus(error) })
    }
    payload.logger.error({ err: error }, 'Site generation failed')
    return Response.json({ error: 'Site generation failed without modifying the draft.' }, { status: 500 })
  }
}
