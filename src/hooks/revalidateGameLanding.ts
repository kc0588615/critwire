import type { BasePayload } from 'payload'

import { revalidatePath } from 'next/cache'

import type { GameProject } from '../payload-types'

import { resolveProjectSlug } from './resolveProjectSlug'

/**
 * Revalidates a game's portal landing at /g/<slug>, which renders live
 * patch-note and issue data. `section` also revalidates that portal
 * section's subtree (e.g. 'patch-notes'), using the same slug lookup.
 */
export const revalidateGameLanding = async (
  gameProject: GameProject | number | null | undefined,
  payload: BasePayload,
  section?: string,
): Promise<void> => {
  const slug = await resolveProjectSlug(gameProject, payload)
  if (!slug) return

  payload.logger.info(`Revalidating game portal at /g/${slug}${section ? ` and /${section}` : ''}`)
  if (section) revalidatePath(`/g/${slug}/${section}`, 'layout')
  revalidatePath(`/g/${slug}`)
}
