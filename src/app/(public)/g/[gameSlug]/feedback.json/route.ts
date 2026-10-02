import { FEED_NOT_FOUND, feedbackFeed, feedResponse } from '@/lib/game-portal/feeds'
import { getGameProject } from '@/lib/game-portal/getGameProject'
import { queryFeedbackFeed } from '@/lib/game-portal/issues'

// No server cache: every request renders, so a hold or an edit is in the
// next response, and EMBED_CACHE_CONTROL bounds every copy in front.
export const dynamic = 'force-dynamic'

/** The public feedback feed, contract v1 (`docs/embed.md`). */
export async function GET(_req: Request, { params }: { params: Promise<{ gameSlug: string }> }): Promise<Response> {
  const project = await getGameProject((await params).gameSlug)
  if (!project) return feedResponse(FEED_NOT_FOUND, { status: 404 })

  return feedResponse(feedbackFeed(project, await queryFeedbackFeed(project.id)))
}
