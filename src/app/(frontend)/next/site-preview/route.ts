import type { PayloadRequest } from 'payload'

import configPromise from '@payload-config'
import { draftMode } from 'next/headers'
import { redirect } from 'next/navigation'
import { NextRequest } from 'next/server'
import { getPayload } from 'payload'
import { extractID } from 'payload/shared'

import { verifySitePreviewToken } from '@/lib/security/sitePreviewToken'

/**
 * Draft Mode entry for game landing pages. Requirements before the
 * cookie is set: a valid unexpired signed token, an authenticated
 * Payload user, AND that user passing the game-page's access control
 * (which the multi-tenant plugin scopes to their tenants). The redirect
 * destination is recomputed from the document — never taken from input.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const claims = verifySitePreviewToken(new URL(req.url).searchParams.get('token'))
  if (!claims) {
    return new Response('Invalid or expired preview token', { status: 403 })
  }

  const payload = await getPayload({ config: configPromise })

  let user
  try {
    ;({ user } = await payload.auth({
      headers: req.headers,
      req: req as unknown as PayloadRequest,
    }))
  } catch (error) {
    payload.logger.error({ err: error }, 'Error verifying user for site preview')
    return new Response('You are not allowed to preview this page', { status: 403 })
  }

  const draft = await draftMode()

  if (!user) {
    draft.disable()
    return new Response('You are not allowed to preview this page', { status: 403 })
  }

  // Access-controlled fetch: 404s (or filters out) documents outside
  // the user's tenants, so cross-tenant preview is rejected here.
  const pages = await payload.find({
    collection: 'game-pages',
    depth: 0,
    draft: true,
    limit: 1,
    overrideAccess: false,
    pagination: false,
    user,
    where: { id: { equals: claims.gamePageId } },
  })
  const page = pages.docs[0]
  if (!page) {
    draft.disable()
    return new Response('You are not allowed to preview this page', { status: 403 })
  }

  const project = await payload.findByID({
    collection: 'game-projects',
    depth: 0,
    id: extractID(page.gameProject),
  })
  if (!project?.slug) {
    draft.disable()
    return new Response('Game project not found', { status: 404 })
  }

  draft.enable()
  redirect(`/g/${project.slug}`)
}
