import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'

import type { GamePage } from '../../../payload-types'

import { revalidateGameLanding } from '../../../hooks/revalidateGameLanding'

export const revalidateGamePage: CollectionAfterChangeHook<GamePage> = async ({
  doc,
  previousDoc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate) {
    if (doc._status === 'published' || previousDoc?._status === 'published') {
      await revalidateGameLanding(doc.gameProject, payload)
    }
  }
  return doc
}

export const revalidateGamePageDelete: CollectionAfterDeleteHook<GamePage> = async ({
  doc,
  req: { context, payload },
}) => {
  if (!context.disableRevalidate && doc) {
    await revalidateGameLanding(doc.gameProject, payload)
  }
  return doc
}
