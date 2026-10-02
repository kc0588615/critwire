import type { PayloadRequest } from 'payload'

import type { GameProject } from '../payload-types'

/**
 * Resolves a gameProject relationship value (ID or populated doc) to
 * the project's public slug. Used by revalidation hooks, which receive
 * depth-0 docs. Runs in the hook's transaction (`req`): a query outside it
 * needs a second pool connection, and enough concurrent writes deadlock.
 */
export const resolveProjectSlug = async (
  gameProject: GameProject | null | number | undefined,
  req: PayloadRequest,
): Promise<null | string> => {
  if (gameProject == null) return null
  if (typeof gameProject === 'object') return gameProject.slug ?? null

  try {
    const project = await req.payload.findByID({
      collection: 'game-projects',
      id: gameProject,
      depth: 0,
      req,
    })
    return project?.slug ?? null
  } catch (err) {
    req.payload.logger.error({ err, msg: 'Failed to resolve game project slug for revalidation' })
    return null
  }
}
