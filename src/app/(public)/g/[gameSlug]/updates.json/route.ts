import { FEED_NOT_FOUND, feedResponse, JSON_FEED_TYPE, updatesFeed } from '@/lib/game-portal/feeds'
import { getGameProject } from '@/lib/game-portal/getGameProject'
import { FEED_UPDATES_LIMIT, queryPublishedPatchNotes } from '@/lib/game-portal/patchNotes'

// No server cache: every request renders, so a hold or an edit is in the
// next response, and EMBED_CACHE_CONTROL bounds every copy in front.
export const dynamic = 'force-dynamic'

/** The updates as JSON Feed 1.1 (`docs/embed.md`). */
export async function GET(_req: Request, { params }: { params: Promise<{ gameSlug: string }> }): Promise<Response> {
  const project = await getGameProject((await params).gameSlug)
  if (!project) return feedResponse(FEED_NOT_FOUND, { status: 404 })

  const notes = await queryPublishedPatchNotes({ limit: FEED_UPDATES_LIMIT, page: 1, projectID: project.id })
  return feedResponse(updatesFeed(project, notes.docs), { contentType: JSON_FEED_TYPE })
}
