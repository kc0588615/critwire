import type { BasePayload } from 'payload'

import { revalidatePath } from 'next/cache'

import type { GameProject } from '../payload-types'

import { resolveProjectSlug } from './resolveProjectSlug'

/**
 * Revalidates a game's portal landing at /g/<slug>, which renders live
 * patch-note and issue data.
 */
export const revalidateGameLanding = async (
  gameProject: GameProject | number | null | undefined,
  payload: BasePayload,
): Promise<void> => {
  const slug = await resolveProjectSlug(gameProject, payload)
  if (!slug) return

  payload.logger.info(`Revalidating game portal at /g/${slug}`)
  revalidatePath(`/g/${slug}`)
}
