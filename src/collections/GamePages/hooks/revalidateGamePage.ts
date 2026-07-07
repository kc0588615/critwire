import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import { revalidatePath } from 'next/cache'

import type { GamePage } from '../../../payload-types'

const revalidateProjectPath = async (
  gameProject: GamePage['gameProject'],
  payload: Parameters<CollectionAfterChangeHook>[0]['req']['payload'],
): Promise<void> => {
  const projectID = typeof gameProject === 'object' ? gameProject.id : gameProject
  if (!projectID) return

  try {
    const project = await payload.findByID({
      collection: 'game-projects',
      id: projectID,
      depth: 0,
    })
    if (project?.slug) {
      payload.logger.info(`Revalidating game portal at /g/${project.slug}`)
      revalidatePath(`/g/${project.slug}`)
    }
  } catch (err) {
    payload.logger.error({ err, msg: 'Failed to revalidate game portal path' })
  }
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
