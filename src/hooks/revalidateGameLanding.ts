import type { PayloadRequest } from 'payload'

import { revalidatePath } from 'next/cache'

import type { GameProject } from '../payload-types'

import { portalPaths } from '@/lib/game-portal/paths'

import { resolveProjectSlug } from './resolveProjectSlug'

/**
 * Revalidates a game's hub at /g/<slug>, which renders live
 * patch-note and issue data.
 */
export const revalidateGameLanding = async (
  gameProject: GameProject | number | null | undefined,
  req: PayloadRequest,
): Promise<void> => {
  const slug = await resolveProjectSlug(gameProject, req)
  if (!slug) return

  const { hub } = portalPaths(slug)
  req.payload.logger.info(`Revalidating game portal at ${hub}`)
  revalidatePath(hub)
}
