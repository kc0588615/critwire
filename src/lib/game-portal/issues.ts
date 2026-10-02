import type { PaginatedDocs, Sort, Where } from 'payload'

import config from '@payload-config'
import { cookies } from 'next/headers'
import { getPayload } from 'payload'
import { cache } from 'react'

import type { Issue } from '@/payload-types'

import { ARCHIVED_STATUSES, PUBLIC_STAGES, type PublicStageId, statusesFor } from '@/lib/game-portal/stages'
import { VOTE_TOKEN_COOKIE, hashVoteToken, verifyVoteToken } from '@/lib/security/voteToken'

export const ISSUES_PER_PAGE = 20
export const BOARD_COLUMN_LIMIT = 25

export type IssueSortKey = 'latest' | 'top'

/** The ranked order: pinned first, then by votes, then newest. */
export const RANKED_SORT: Sort = ['-isPinned', '-upvoteCount', '-createdAt']

/** What a shipped item shows of its update: see `shippedUpdate`. */
const SHIPPED_IN_SELECT = { _status: true, slug: true, title: true, versionLabel: true } as const

/**
 * The public items of one game: those of `stage`, or every stage when
 * none is given (archived items are in no stage), optionally of one type.
 * The list, the board and the badge share it, so their counts agree.
 */
export const publicIssuesWhere = ({
  projectID,
  stage,
  type,
}: {
  projectID: number | string
  stage?: null | PublicStageId
  type?: Issue['type'] | null
}): Where[] => [
  { gameProject: { equals: projectID } },
  { isPublic: { equals: true } },
  stage ? { status: { in: statusesFor(stage) } } : { status: { not_in: ARCHIVED_STATUSES } },
  ...(type ? [{ type: { equals: type } }] : []),
]

/** How many public items each public stage has, in stage order. */
export const countPublicIssuesByStage = async (
  projectID: number | string,
): Promise<{ stage: (typeof PUBLIC_STAGES)[number]; count: number }[]> => {
  const payload = await getPayload({ config })

  return Promise.all(
    PUBLIC_STAGES.map(async (stage) => {
      const { totalDocs } = await payload.count({
        collection: 'issues',
        overrideAccess: false,
        where: { and: publicIssuesWhere({ projectID, stage: stage.id }) },
      })
      return { stage, count: totalDocs }
    }),
  )
}

export const queryPublicIssues = cache(
  async ({
    category,
    page,
    projectID,
    search,
    sort,
    stage,
    type,
  }: {
    category?: null | string
    page: number
    projectID: number | string
    search?: null | string
    sort: IssueSortKey
    stage?: null | PublicStageId
    type?: Issue['type'] | null
  }): Promise<PaginatedDocs<Issue>> => {
    const payload = await getPayload({ config })

    const and = publicIssuesWhere({ projectID, stage, type })
    if (category) and.push({ category: { equals: category } })
    if (search) {
      and.push({
        or: [{ title: { contains: search } }, { summary: { contains: search } }],
      })
    }

    const sortOrder: Sort = sort === 'top' ? RANKED_SORT : ['-isPinned', '-createdAt']

    return payload.find({
      collection: 'issues',
      depth: 1,
      limit: ISSUES_PER_PAGE,
      // Through access, a fix note the visitor can't read (a draft) stays an ID.
      overrideAccess: false,
      page,
      populate: { 'patch-notes': SHIPPED_IN_SELECT },
      sort: sortOrder,
      where: { and },
    })
  },
)

/**
 * One board column: a stage's public items, or every public stage's when
 * `stage` is null, pinned first, then by votes, then newest. `totalDocs`
 * is the column's true count; past the limit, the board links to the list
 * filtered to the stage. A fix note the visitor can't read (a draft)
 * stays an ID.
 */
export const queryBoardColumn = async ({
  limit = BOARD_COLUMN_LIMIT,
  projectID,
  stage,
  type,
}: {
  limit?: number
  projectID: number | string
  stage: null | PublicStageId
  type?: Issue['type'] | null
}) => {
  const payload = await getPayload({ config })

  return payload.find({
    collection: 'issues',
    depth: 1,
    limit,
    overrideAccess: false,
    populate: { 'patch-notes': SHIPPED_IN_SELECT },
    select: {
      fixedInPatchNote: true,
      isPinned: true,
      slug: true,
      status: true,
      title: true,
      type: true,
      upvoteCount: true,
    },
    sort: RANKED_SORT,
    where: { and: publicIssuesWhere({ projectID, stage, type }) },
  })
}

export type BoardCard = Awaited<ReturnType<typeof queryBoardColumn>>['docs'][number]

export const TOP_FEEDBACK_LIMIT = 5

/**
 * The hub's top feedback: open items (not shipped, not archived),
 * pinned first, then by votes, then newest. The sort is always explicit,
 * never the admin kanban's `_order`, so reordering the board can't churn
 * the cached hub (the contract `revalidateIssueLanding` keeps).
 */
export const queryTopFeedback = cache(async (projectID: number | string): Promise<Issue[]> => {
  const payload = await getPayload({ config })

  const result = await payload.find({
    collection: 'issues',
    depth: 0,
    limit: TOP_FEEDBACK_LIMIT,
    overrideAccess: false,
    pagination: false,
    sort: RANKED_SORT,
    where: {
      and: [
        { gameProject: { equals: projectID } },
        { isPublic: { equals: true } },
        { status: { not_in: [...ARCHIVED_STATUSES, ...statusesFor('shipped')] } },
      ],
    },
  })
  return result.docs
})

/**
 * An update's "From your feedback": the public items it shipped, most
 * voted first. Scoped to the update's own game as well as the link.
 * Every item unless a `limit` is given.
 */
export const queryShippedFeedback = cache(
  async ({
    limit,
    noteID,
    projectID,
  }: {
    limit?: number
    noteID: number
    projectID: number | string
  }) => {
    const payload = await getPayload({ config })

    const result = await payload.find({
      collection: 'issues',
      depth: 0,
      limit,
      overrideAccess: false,
      pagination: false,
      select: { slug: true, title: true, type: true, upvoteCount: true },
      sort: ['-upvoteCount', '-createdAt'],
      where: {
        and: [
          { gameProject: { equals: projectID } },
          { fixedInPatchNote: { equals: noteID } },
          { isPublic: { equals: true } },
          { status: { in: statusesFor('shipped') } },
        ],
      },
    })
    return result.docs
  },
)

export type ShippedFeedbackItem = Awaited<ReturnType<typeof queryShippedFeedback>>[number]

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
      // Through access, a fix note the visitor can't read (a draft) stays an ID.
      overrideAccess: false,
      pagination: false,
      populate: { 'patch-notes': SHIPPED_IN_SELECT },
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
 * issue. Reads the cookie — callers become dynamically rendered. The
 * one privileged portal read here: votes aren't publicly readable.
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
