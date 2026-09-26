import config from '@payload-config'
import * as Sentry from '@sentry/nextjs'
import { cookies } from 'next/headers'
import { getPayload, NotFound, ValidationError, type Where } from 'payload'
import { z } from 'zod'

import { getLogger } from '@/lib/logger'
import { getClientIP } from '@/lib/public-forms/request'
import { checkRateLimit } from '@/lib/upstash/rate-limit'
import {
  VOTE_TOKEN_COOKIE,
  VOTE_TOKEN_MAX_AGE,
  createVoteToken,
  hashVoteToken,
  verifyVoteToken,
} from '@/lib/security/voteToken'

const log = getLogger('public.vote')

// Issue IDs are Postgres serial integers.
const voteSchema = z.object({
  issueId: z.number().int().positive().max(2_147_483_647),
})

/**
 * Toggles the caller's vote on a public issue. The IssueVotes hooks keep
 * `upvoteCount` in step with the vote rows; this route only adds or
 * removes the caller's row.
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const { success } = await checkRateLimit({
      identifier: await getClientIP(),
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
    const browserTokenHash = hashVoteToken(rawToken)

    const payload = await getPayload({ config })

    // Read as the anonymous visitor: private and unknown issues are both null.
    const issue = await payload.findByID({
      collection: 'issues',
      depth: 0,
      disableErrors: true,
      id: parsed.data.issueId,
      overrideAccess: false,
      select: { tenant: true },
    })
    if (!issue) {
      return Response.json({ error: 'Issue not found.' }, { status: 404 })
    }

    const voteWhere: Where = {
      and: [{ issue: { equals: issue.id } }, { browserTokenHash: { equals: browserTokenHash } }],
    }
    const findVote = () =>
      payload.find({
        collection: 'issue-votes',
        depth: 0,
        limit: 1,
        overrideAccess: true,
        pagination: false,
        where: voteWhere,
      })

    // Toggle: an existing vote is withdrawn, otherwise one is recorded.
    const existing = (await findVote()).docs[0]
    const voted = !existing
    if (existing) {
      await payload
        .delete({ collection: 'issue-votes', id: existing.id, overrideAccess: true })
        .catch((err: unknown) => {
          // A concurrent request with the same cookie already withdrew it.
          if (!(err instanceof NotFound)) throw err
        })
    } else {
      await payload
        .create({
          collection: 'issue-votes',
          data: { browserTokenHash, issue: issue.id, tenant: issue.tenant },
          overrideAccess: true,
        })
        .catch(async (err: unknown) => {
          // A concurrent request with the same cookie already recorded it:
          // the unique (issue, token) index rejected this insert.
          if (!(err instanceof ValidationError) || !(await findVote()).docs[0]) throw err
        })
    }

    const { upvoteCount } = await payload.findByID({
      collection: 'issues',
      depth: 0,
      id: issue.id,
      select: { upvoteCount: true },
    })

    return Response.json({ issuedNewToken, upvoteCount, voted })
  } catch (err) {
    Sentry.captureException(err)
    log.error({ err, msg: 'Issue vote failed.' })
    return Response.json({ error: 'Something went wrong.' }, { status: 500 })
  }
}
