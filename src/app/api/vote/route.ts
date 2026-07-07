import config from '@payload-config'
import * as Sentry from '@sentry/nextjs'
import { cookies, headers } from 'next/headers'
import { getPayload } from 'payload'
import { z } from 'zod'

import { checkRateLimit } from '@/lib/upstash/rate-limit'
import {
  VOTE_TOKEN_COOKIE,
  VOTE_TOKEN_MAX_AGE,
  createVoteToken,
  hashVoteToken,
  verifyVoteToken,
} from '@/lib/security/voteToken'

const voteSchema = z.object({
  issueId: z.union([z.number().int().positive(), z.string().min(1).max(64)]),
})

export async function POST(req: Request): Promise<Response> {
  try {
    const headerStore = await headers()
    const ip =
      headerStore.get('x-real-ip') ??
      headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      'unknown'

    const { success } = await checkRateLimit({
      identifier: ip,
      key: 'issue-vote',
      limit: 10,
      windowSeconds: 60,
    })
    if (!success) {
      return Response.json({ error: 'Too many requests.' }, { status: 429 })
    }

    const parsed = voteSchema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return Response.json({ error: 'Invalid request body.' }, { status: 400 })
    }

    // Issue or reuse the signed browser token.
    const cookieStore = await cookies()
    let rawToken = verifyVoteToken(cookieStore.get(VOTE_TOKEN_COOKIE)?.value)
    let issuedNewToken = false
    if (!rawToken) {
      const signedValue = createVoteToken()
      rawToken = signedValue.split('.')[0] ?? null
      issuedNewToken = true
      cookieStore.set(VOTE_TOKEN_COOKIE, signedValue, {
        httpOnly: true,
        maxAge: VOTE_TOKEN_MAX_AGE,
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      })
    }
    if (!rawToken) {
      return Response.json({ error: 'Could not establish vote token.' }, { status: 500 })
    }
    const tokenHash = hashVoteToken(rawToken)

    const payload = await getPayload({ config })

    const issue = await payload
      .findByID({ collection: 'issues', id: parsed.data.issueId, depth: 0 })
      .catch(() => null)
    if (!issue || !issue.isPublic) {
      return Response.json({ error: 'Issue not found.' }, { status: 404 })
    }

    // Toggle: an existing vote is withdrawn, otherwise one is recorded.
    const existing = await payload.find({
      collection: 'issue-votes',
      depth: 0,
      limit: 1,
      overrideAccess: true,
      pagination: false,
      where: {
        and: [{ issue: { equals: issue.id } }, { browserTokenHash: { equals: tokenHash } }],
      },
    })

    let voted: boolean
    if (existing.docs[0]) {
      await payload.delete({
        collection: 'issue-votes',
        id: existing.docs[0].id,
        overrideAccess: true,
      })
      voted = false
    } else {
      const tenantID = typeof issue.tenant === 'object' ? issue.tenant?.id : issue.tenant
      await payload.create({
        collection: 'issue-votes',
        data: {
          browserTokenHash: tokenHash,
          issue: issue.id,
          tenant: tenantID as number,
        },
        overrideAccess: true,
      })
      voted = true
    }

    // Recompute from source of truth — self-healing under races.
    const { totalDocs: upvoteCount } = await payload.count({
      collection: 'issue-votes',
      overrideAccess: true,
      where: { issue: { equals: issue.id } },
    })
    await payload.update({
      collection: 'issues',
      id: issue.id,
      data: { upvoteCount },
      overrideAccess: true,
    })

    return Response.json({ issuedNewToken, upvoteCount, voted })
  } catch (err) {
    Sentry.captureException(err)
    return Response.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
