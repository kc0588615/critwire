import type { PaginatedDocs, Sort, Where } from 'payload'

import config from '@payload-config'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import { cache } from 'react'

import type { Issue } from '@/payload-types'

import { VOTE_TOKEN_COOKIE, hashVoteToken, verifyVoteToken } from '@/lib/security/voteToken'

export const ISSUES_PER_PAGE = 20
export const BOARD_ISSUE_LIMIT = 200

export type IssueSortKey = 'latest' | 'top'

export const queryPublicIssues = cache(
  async ({
    category,
    page,
    projectID,
    search,
    sort,
  }: {
    category?: null | string
    page: number
    projectID: number | string
    search?: null | string
    sort: IssueSortKey
  }): Promise<PaginatedDocs<Issue>> => {
    const payload = await getPayload({ config })

    const and: Where[] = [{ gameProject: { equals: projectID } }, { isPublic: { equals: true } }]
    if (category) and.push({ category: { equals: category } })
    if (search) {
      and.push({
        or: [{ title: { contains: search } }, { summary: { contains: search } }],
      })
    }

    const sortOrder: Sort =
      sort === 'top'
        ? ['-isPinned', '-upvoteCount', '-createdAt']
        : ['-isPinned', '-createdAt']

    return payload.find({
      collection: 'issues',
      depth: 0,
      limit: ISSUES_PER_PAGE,
      page,
      sort: sortOrder,
      where: { and },
    })
  },
)

export const queryBoardIssues = cache(async (projectID: number | string): Promise<Issue[]> => {
  const payload = await getPayload({ config })
  const result = await payload.find({
    collection: 'issues',
    depth: 0,
    limit: BOARD_ISSUE_LIMIT,
    pagination: false,
    sort: ['-isPinned', '-upvoteCount'],
    where: {
      and: [{ gameProject: { equals: projectID } }, { isPublic: { equals: true } }],
    },
  })
  return result.docs
})

export const LANDING_ISSUE_LIMIT = 4

export type LandingIssuesVariant = 'compact' | 'pinned' | 'recentlyFixed'

/**
 * Issues shown in the flagship landing page's known-issues slot.
 * Sorting is always explicit (pinned/votes/dates) — never the admin
 * kanban `_order` field, so board reordering cannot churn the public
 * landing page (cross-plan contract with the kanban remediation).
 */
export const queryLandingIssues = cache(
  async ({
    projectID,
    variant,
  }: {
    projectID: number | string
    variant: LandingIssuesVariant
  }): Promise<Issue[]> => {
    const payload = await getPayload({ config })

    const and: Where[] = [{ gameProject: { equals: projectID } }, { isPublic: { equals: true } }]
    let sort: Sort = ['-isPinned', '-upvoteCount', '-createdAt']

    if (variant === 'recentlyFixed') {
      and.push({ status: { equals: 'FIXED' } })
      sort = '-updatedAt'
    } else if (variant === 'pinned') {
      and.push({ isPinned: { equals: true } }, { status: { not_equals: 'CLOSED' } })
      sort = ['-upvoteCount', '-createdAt']
    } else {
      and.push({ status: { not_in: ['FIXED', 'CLOSED'] } })
    }

    const result = await payload.find({
      collection: 'issues',
      depth: 0,
      limit: LANDING_ISSUE_LIMIT,
      pagination: false,
      sort,
      where: { and },
    })
    return result.docs
  },
)

export const getPublicIssue = cache(
  async ({
    projectID,
    slug,
  }: {
    projectID: number | string
    slug: string
  }): Promise<Issue | null> => {
    const payload = await getPayload({ config })
    const result = await payload.find({
      collection: 'issues',
      depth: 1,
      limit: 1,
      pagination: false,
      where: {
        and: [
          { gameProject: { equals: projectID } },
          { slug: { equals: slug } },
          { isPublic: { equals: true } },
        ],
      },
    })
    return result.docs[0] ?? null
  },
)

/**
 * Whether the current browser (vote-token cookie) has voted on the
 * issue. Reads the cookie — callers become dynamically rendered.
 */
export const getHasVoted = async (issueID: number | string): Promise<boolean> => {
  const cookieStore = await cookies()
  const rawToken = verifyVoteToken(cookieStore.get(VOTE_TOKEN_COOKIE)?.value)
  if (!rawToken) return false

  const payload = await getPayload({ config })
  const { totalDocs } = await payload.count({
    collection: 'issue-votes',
    overrideAccess: true,
    where: {
      and: [
        { issue: { equals: issueID } },
        { browserTokenHash: { equals: hashVoteToken(rawToken) } },
      ],
    },
  })
  return totalDocs > 0
}
