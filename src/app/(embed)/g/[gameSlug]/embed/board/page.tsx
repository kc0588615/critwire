import type { SearchParams } from 'nuqs/server'

import { createLoader } from 'nuqs/server'
import React from 'react'

import type { GameProject } from '@/payload-types'

import { EmbedBoard, type EmbedBoardView } from '@/components/embed/EmbedBoard'
import { embedHref } from '@/lib/embed/links'
import { feedbackRow } from '@/lib/game-portal/feeds'
import {
  feedbackHref,
  feedbackSearchParams,
  type FeedbackTypeParam,
  feedbackTypeOf,
} from '@/lib/game-portal/feedbackSearchParams'
import { acceptsIdeas } from '@/lib/game-portal/formRoutes'
import { getGameProject } from '@/lib/game-portal/getGameProject'
import { queryBoardColumn } from '@/lib/game-portal/issues'
import { portalPaths } from '@/lib/game-portal/paths'
import { PUBLIC_STAGES } from '@/lib/game-portal/stages'

export const dynamic = 'force-dynamic'

/** The rows a view shows; past them, "See all N" opens the portal's list. */
const EMBED_ROWS = 10

const loadSearchParams = createLoader(feedbackSearchParams)

/**
 * Every view the filters offer, all stages or one, times all types or
 * one: one query each, so every count is the true total and a filter
 * click needs no request.
 */
const queryBoardViews = async (
  project: Pick<GameProject, 'id' | 'slug'>,
  types: (FeedbackTypeParam | null)[],
): Promise<EmbedBoardView[]> => {
  const paths = portalPaths(project.slug)
  const stages = [null, ...PUBLIC_STAGES.map((stage) => stage.id)]
  return Promise.all(
    types.flatMap((type) =>
      stages.map(async (stage) => {
        const result = await queryBoardColumn({
          limit: EMBED_ROWS,
          projectID: project.id,
          stage,
          type: type ? feedbackTypeOf(type) : null,
        })
        return {
          rows: result.docs.map((issue) => feedbackRow(issue, paths)),
          seeAll: result.totalDocs > EMBED_ROWS ? embedHref(feedbackHref(paths.feedback, { stage, type })) : null,
          stage,
          total: result.totalDocs,
          type,
        }
      }),
    ),
  )
}

/** The board widget. The layout renders the empty embed for a missing game. */
export default async function EmbedBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameSlug: string }>
  searchParams: Promise<SearchParams>
}) {
  const { gameSlug } = await params
  const project = await getGameProject(gameSlug)
  if (!project) return null

  const ideas = acceptsIdeas(project)
  const types: (FeedbackTypeParam | null)[] = ideas ? [null, 'bug', 'idea'] : [null, 'bug']
  const [{ stage, type }, views] = await Promise.all([
    loadSearchParams(searchParams),
    queryBoardViews(project, types),
  ])
  const paths = portalPaths(project.slug)

  return (
    <EmbedBoard
      acceptsIdeas={ideas}
      initial={{ stage, type: types.includes(type) ? type : null }}
      newFeedback={{ bug: embedHref(paths.newFeedback('bug')), idea: embedHref(paths.newFeedback('idea')) }}
      views={views}
    />
  )
}
