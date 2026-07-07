import type { BasePayload } from 'payload'

import type { GamePage } from '../payload-types'

/**
 * Resolves a gameProject relationship value (ID or populated doc) to
 * the project's public slug. Used by revalidation hooks, which receive
 * depth-0 docs.
 */
export const resolveProjectSlug = async (
  gameProject: GamePage['gameProject'] | null | undefined,
  payload: BasePayload,
): Promise<null | string> => {
  if (gameProject == null) return null
  if (typeof gameProject === 'object') return gameProject.slug ?? null

  try {
    const project = await payload.findByID({
      collection: 'game-projects',
      id: gameProject,
      depth: 0,
    })
    return project?.slug ?? null
  } catch (err) {
    payload.logger.error({ err, msg: 'Failed to resolve game project slug for revalidation' })
    return null
  }
}
