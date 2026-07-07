import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath } from 'next/cache'

import type { GamePage } from '../../../payload-types'

import { resolveProjectSlug } from '../../../hooks/resolveProjectSlug'

const revalidateProjectPath = async (
  gameProject: GamePage['gameProject'],
  payload: Parameters<CollectionAfterChangeHook>[0]['req']['payload'],
): Promise<void> => {
  const slug = await resolveProjectSlug(gameProject, payload)
  if (!slug) return

  payload.logger.info(`Revalidating game portal at /g/${slug}`)
  revalidatePath(`/g/${slug}`)
}

export const revalidateGamePage: CollectionAfterChangeHook<GamePage> = async ({
  doc,
  previousDoc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate) {
    if (doc._status === 'published' || previousDoc?._status === 'published') {
      await revalidateProjectPath(doc.gameProject, payload)
    }
  }
  return doc
}

export const revalidateGamePageDelete: CollectionAfterDeleteHook<GamePage> = async ({
  doc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate && doc) {
    await revalidateProjectPath(doc.gameProject, payload)
  }
  return doc
}
